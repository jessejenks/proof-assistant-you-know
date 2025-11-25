import * as ts from "typescript";
import {
    Document,
    Assumption,
    Theorem,
    Step,
    Identifier,
    Proof,
    TypeVar,
    Negation,
    Conjunction,
    Disjunction,
    Implication,
    Application,
    AstKind,
} from "../parser/parser";
import { Visitor } from "./visitor";
import { TypeRefTree, typeReference, func, parameter } from "../utils/tsUtils";
import {
    PrimitiveAlias,
    PrimitiveName,
    basicDecl,
    getAliasedPrimitive,
    isPrimitive,
    isPrimitiveAlias,
    typedDecl,
} from "../utils/primitives";

const JS_KEYWORDS = {
    true: 0,
    false: 0,
    null: 0,
    undefined: 0,
};

const escapeId = (name: string) => ts.factory.createIdentifier(name in JS_KEYWORDS ? `${name}_` : name);

type Frame = Record<string, 0>;

type ReturnTypes = {
    [AstKind.Document]: ts.Statement[];
    [AstKind.Theorem]: ts.Statement;
    [AstKind.Proof]: ts.ConciseBody;
    [AstKind.Assumption]: ts.Expression;
    [AstKind.Step]: [ts.VariableStatement, string];
    [AstKind.Application]: ts.Expression;
    [AstKind.Identifier]: ts.Identifier;
    [AstKind.Implication]: TypeRefTree;
    [AstKind.Disjunction]: TypeRefTree;
    [AstKind.Conjunction]: TypeRefTree;
    [AstKind.Negation]: TypeRefTree;
    [AstKind.TypeVar]: TypeRefTree;
};

export class Transformer extends Visitor<ReturnTypes> {
    protected frames: Frame[];
    protected referencedPrimitives: Set<PrimitiveName | PrimitiveAlias>;

    constructor() {
        super();
        this.frames = [];
        this.referencedPrimitives = new Set();
    }

    protected enterFrame() {
        this.frames.push({});
    }

    protected exitFrame(): string[] {
        const frame = this.frames.pop();
        if (frame === undefined) throw new Error("No frame to exit");
        const allFree = this.frames.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        Object.keys(allFree).forEach((k) => {
            delete frame[k];
        });
        if ("True" in frame) delete frame["True"];
        if ("False" in frame) delete frame["False"];
        return Object.keys(frame);
    }

    protected addFreeVariable(name: string) {
        this.frames[this.frames.length - 1][name] = 0;
    }

    usedPrimitive(name: PrimitiveName): boolean {
        return this.referencedPrimitives.has(name);
    }

    usedPrimitiveAlias(name: PrimitiveAlias): boolean {
        return this.referencedPrimitives.has(name);
    }

    visitDocument(node: Document) {
        this.frames = [];
        this.referencedPrimitives.clear();
        return node.theorems.map((t) => this.visitTheorem(t));
    }

    visitTheorem(node: Theorem) {
        this.enterFrame();
        const { name, expression } = node.expression;
        const expr = this.visitExpression(expression);
        const tp = typeReference(expr);
        const body = this.visitProof(node.proof);
        const typeVars = this.exitFrame();
        const f = func([], typeVars, tp, body);
        if (name === null) {
            return ts.factory.createExpressionStatement(f);
        } else {
            return basicDecl(name, f);
        }
    }

    visitProof(node: Proof) {
        const body: ts.Statement[] = node.statements.map((s) => {
            switch (s.kind) {
                case AstKind.Assumption:
                    return ts.factory.createExpressionStatement(this.visitAssumption(s));
                case AstKind.Step: {
                    const [decl] = this.visitStep(s);
                    return decl;
                }
            }
        });
        let retExp: ts.Expression;
        switch (node.finalStep.kind) {
            case AstKind.Application: {
                retExp = this.visitApplication(node.finalStep);
                break;
            }
            case AstKind.Assumption: {
                retExp = this.visitAssumption(node.finalStep);
                break;
            }
            case AstKind.Step: {
                const [decl, name] = this.visitStep(node.finalStep);
                body.push(decl);
                retExp = ts.factory.createIdentifier(name);
            }
        }
        return body.length === 0
            ? retExp
            : ts.factory.createBlock(body.concat(ts.factory.createReturnStatement(retExp)));
    }

    visitAssumption(node: Assumption) {
        const assumptions = node.assumptions.map(({ name, expression }) => {
            this.enterFrame();
            const tr = this.visitExpression(expression);
            return [name === null ? this.typeRefToName(tr) : name, tr] as [string, TypeRefTree];
        });
        const body = this.visitProof(node.subproof);
        const assumptionsCopy = [...assumptions];
        const [nm, tp] = assumptionsCopy.pop()!;
        let typeVars = this.exitFrame();
        const f = func([parameter(nm, typeReference(tp))], typeVars, undefined, body);
        return assumptionsCopy.reduceRight((ret, [nm, tp]) => {
            typeVars = this.exitFrame();
            return func([parameter(nm, typeReference(tp))], typeVars, undefined, ret);
        }, f as ts.Expression);
    }

    visitStep(node: Step): [ts.VariableStatement, string] {
        const call = this.visitJustification(node.justification);
        const { name, expression } = node.expression;
        const tp = this.visitExpression(expression);
        const stepName = name === null ? this.typeRefToName(tp) : name;
        return [
            // TODO: How to deal with repeats? Shouldn't happen but also shouldn't fail because of that either?
            typedDecl(stepName, typeReference(tp), call),
            stepName,
        ];
    }

    visitApplication(node: Application) {
        return node.arguments.reduce(
            (acc, curr) =>
                ts.factory.createCallExpression(acc, undefined, [
                    curr.kind === AstKind.Identifier
                        ? this.visitIdentifier(curr)
                        : ts.factory.createIdentifier(this.typeRefToName(this.visitExpression(curr))),
                ]),
            this.checkAndEscapeIdentifier(node.rule) as ts.Expression,
        );
    }

    visitIdentifier(node: Identifier) {
        return this.checkAndEscapeIdentifier(node.name);
    }

    protected checkAndEscapeIdentifier(name: string) {
        const escaped = escapeId(name);
        const escapedName = escaped.text;
        if (isPrimitive(escapedName)) {
            this.referencedPrimitives.add(escapedName);
            // TODO more systematic way of handling transitive dependencies
            if (escapedName === "notElim") {
                this.referencedPrimitives.add("implElim");
            }
        }
        if (isPrimitiveAlias(escapedName)) {
            this.referencedPrimitives.add(escapedName);
            this.referencedPrimitives.add(getAliasedPrimitive(escapedName));
        }
        return escaped;
    }

    protected typeRefToName(tree: TypeRefTree): string {
        if (typeof tree === "string") {
            tree = tree.toLowerCase();
            if (tree in JS_KEYWORDS) {
                if (tree === "true") {
                    this.referencedPrimitives.add("true_");
                }
                return `${tree}_`;
            }
            return `${tree}0`;
        }
        return `${tree[0].toLowerCase()}_${tree[1].map((t) => this.typeRefToName(t)).join("")}_`;
    }

    visitImplication(node: Implication): TypeRefTree {
        return ["Impl", [this.visitExpression(node.left), this.visitExpression(node.right)]];
    }

    visitDisjunction(node: Disjunction): TypeRefTree {
        return ["Or", [this.visitExpression(node.left), this.visitExpression(node.right)]];
    }

    visitConjunction(node: Conjunction): TypeRefTree {
        return ["And", [this.visitExpression(node.left), this.visitExpression(node.right)]];
    }

    visitNegation(node: Negation): TypeRefTree {
        return ["Not", [this.visitExpression(node.value)]];
    }

    visitTypeVar(node: TypeVar): TypeRefTree {
        this.addFreeVariable(node.name);
        return node.name;
    }
}
