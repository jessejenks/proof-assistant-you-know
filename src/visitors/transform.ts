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
    Quantified,
    Generalization,
} from "../parser/parser";
import { Visitor } from "./visitor";
import { func, parameter, typeParameter } from "../utils/tsUtils";
import {
    PrimitiveAlias,
    PrimitiveName,
    basicDecl,
    getAliasedPrimitive,
    isPrimitive,
    isPrimitiveAlias,
    typedDecl,
} from "../utils/primitives";
import { Logger, inSystemFMode } from "../utils/utils";

const JS_KEYWORDS = {
    true: 0,
    false: 0,
    null: 0,
    undefined: 0,
};

export class TransformError extends Error {
    constructor(message: string) {
        super(message);
        // hack to get instanceof check to work
        Object.setPrototypeOf(this, TransformError.prototype);
    }
}

type Frame = Record<string, 0>;

type ReturnTypes = {
    [AstKind.Document]: ts.Statement[];
    [AstKind.Theorem]: ts.Statement;
    [AstKind.Proof]: ts.ConciseBody;
    [AstKind.Assumption]: ts.Expression;
    [AstKind.Generalization]: ts.Expression;
    [AstKind.Step]: [string, ts.VariableStatement];
    [AstKind.Application]: ts.Expression;
    [AstKind.Identifier]: ts.Identifier;
    [AstKind.Quantified]: [string, ts.TypeNode];
    [AstKind.Implication]: [string, ts.TypeReferenceNode];
    [AstKind.Disjunction]: [string, ts.TypeReferenceNode];
    [AstKind.Conjunction]: [string, ts.TypeReferenceNode];
    [AstKind.Negation]: [string, ts.TypeReferenceNode];
    [AstKind.TypeVar]: [string, ts.TypeReferenceNode];
};

export class Transformer extends Visitor<ReturnTypes> {
    protected frames: Frame[];
    protected referencedPrimitives: Set<PrimitiveName | PrimitiveAlias>;
    protected quantifierBindings: string[];
    protected extraDecls: ts.Statement[][];

    constructor() {
        super();
        this.frames = [];
        this.referencedPrimitives = new Set();
        this.quantifierBindings = [];
        this.extraDecls = [];
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
        this.quantifierBindings = [];
        return node.theorems.flatMap((t) => this.visitTheorem(t));
    }

    visitTheorem(node: Theorem) {
        this.enterFrame();
        const { name, expression } = node.expression;
        const [_, tp] = this.visitExpression(expression);
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
                case AstKind.Generalization:
                    return ts.factory.createExpressionStatement(this.visitGeneralization(s));
                case AstKind.Step: {
                    const [, decl] = this.visitStep(s);
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
            case AstKind.Generalization: {
                retExp = this.visitGeneralization(node.finalStep);
                break;
            }
            case AstKind.Assumption: {
                retExp = this.visitAssumption(node.finalStep);
                break;
            }
            case AstKind.Step: {
                const [name, decl] = this.visitStep(node.finalStep);
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
            const [n, tr] = this.visitExpression(expression);
            return [name === null ? n : name, tr] as [string, ts.TypeReferenceNode];
        });
        const body = this.visitProof(node.subproof);
        const assumptionsCopy = [...assumptions];
        const [nm, tp] = assumptionsCopy.pop()!;
        let typeVars = this.exitFrame();
        const f = func([parameter(nm, tp)], typeVars, undefined, body);
        return assumptionsCopy.reduceRight((ret, [nm, tp]) => {
            typeVars = this.exitFrame();
            return func([parameter(nm, tp)], typeVars, undefined, ret);
        }, f as ts.Expression);
    }

    visitGeneralization(node: Generalization) {
        this.quantifierBindings.push(...node.typeVars);
        const body = this.visitProof(node.subproof);
        for (let i = 0; i < node.typeVars.length; i++) {
            this.quantifierBindings.pop();
        }
        return node.typeVars.reduceRight((ret, tp) => func([], [tp], undefined, ret), body as ts.Expression);
    }

    visitStep(node: Step): [string, ts.VariableStatement] {
        const call = this.visitJustification(node.justification);
        const { name, expression } = node.expression;
        const [n, tp] = this.visitExpression(expression);
        const stepName = name === null ? n : name;
        return [
            // TODO: How to deal with repeats? Shouldn't happen but also shouldn't fail because of that either?
            stepName,
            typedDecl(stepName, tp, call),
        ];
    }

    visitApplication(node: Application) {
        if (inSystemFMode && node.rule === "forallElim") {
            if (node.arguments.length !== 2) {
                throw new TransformError(
                    `bad forallElim call: Incorrect number of arguments. Expects 2, got ${node.arguments.length}`,
                );
            }
            const [arg1, arg2] = node.arguments;
            if (arg1.kind === AstKind.Identifier || arg2.kind !== AstKind.Identifier) {
                throw new TransformError(`bad forallElim call: Requires 1 Type Expression and 1 Identifier`);
            }
            const [, tp1] = this.visitExpression(arg1);
            return ts.factory.createCallExpression(this.visitIdentifier(arg2), [tp1], []);
        }

        return node.arguments.reduce((acc, curr) => {
            if (curr.kind === AstKind.Identifier) {
                return ts.factory.createCallExpression(acc, undefined, [this.visitIdentifier(curr)]);
            }
            const [n, _] = this.visitExpression(curr);
            return ts.factory.createCallExpression(acc, undefined, [ts.factory.createIdentifier(n)]);
        }, this.checkAndEscapeIdentifier(node.rule) as ts.Expression);
    }

    visitIdentifier(node: Identifier) {
        return this.checkAndEscapeIdentifier(node.name);
    }

    protected checkAndEscapeIdentifier(name: string) {
        const escaped = this.escapeId(name);
        const escapedName = escaped.text;
        if (isPrimitive(escapedName)) {
            this.referencedPrimitives.add(escapedName);
            // TODO more systematic way of handling transitive dependencies
            if (escapedName === "notElim") {
                this.referencedPrimitives.add("implElim");
            }
            if (escapedName === "sorry") {
                Logger.warn("proof uses 'sorry'!");
            }
        }
        if (isPrimitiveAlias(escapedName)) {
            this.referencedPrimitives.add(escapedName);
            this.referencedPrimitives.add(getAliasedPrimitive(escapedName));
        }
        return escaped;
    }

    protected escapeId(name: string) {
        if (name === "true") {
            this.referencedPrimitives.add("true_");
        }
        return ts.factory.createIdentifier(name in JS_KEYWORDS ? `${name}_` : name);
    }

    visitQuantified(node: Quantified): [string, ts.TypeNode] {
        // [[forall X . phi(X)]] = <X>() => [[phi(X)]]
        this.quantifierBindings.push(...node.typeVars);
        const [n, tp] = this.visitExpression(node.body);
        const q = node.typeVars.reduceRight(
            (ret, tv) => ts.factory.createFunctionTypeNode([typeParameter(tv)], [], ret),
            tp,
        );
        // const t = ts.factory.createFunctionTypeNode(node.typeVars.map(typeParameter), [], tp);
        for (let i = 0; i < node.typeVars.length; i++) {
            this.quantifierBindings.pop();
        }
        return [`${n}_${node.typeVars.map((t) => t.toLowerCase()).join("_")}_`, q];
    }

    visitImplication(node: Implication): [string, ts.TypeReferenceNode] {
        const [ln, ltp] = this.visitExpression(node.left);
        const [rn, rtp] = this.visitExpression(node.right);
        return [`impl_${ln}_${rn}_`, ts.factory.createTypeReferenceNode("Impl", [ltp, rtp])];
    }

    visitDisjunction(node: Disjunction): [string, ts.TypeReferenceNode] {
        const [ln, ltp] = this.visitExpression(node.left);
        const [rn, rtp] = this.visitExpression(node.right);
        return [`or_${ln}_${rn}_`, ts.factory.createTypeReferenceNode("Or", [ltp, rtp])];
    }

    visitConjunction(node: Conjunction): [string, ts.TypeReferenceNode] {
        const [ln, ltp] = this.visitExpression(node.left);
        const [rn, rtp] = this.visitExpression(node.right);
        return [`and_${ln}_${rn}_`, ts.factory.createTypeReferenceNode("And", [ltp, rtp])];
    }

    visitNegation(node: Negation): [string, ts.TypeReferenceNode] {
        const [n, tp] = this.visitExpression(node.body);
        return [`not_${n}_`, ts.factory.createTypeReferenceNode("Not", [tp])];
    }

    visitTypeVar(node: TypeVar): [string, ts.TypeReferenceNode] {
        if (node.args.length > 0) {
            if (node.args.length > 1) {
                Logger.warn(node.name, "Type variables with arity > 1 are not yet supported");
            }
            if (!this.quantifierBindings.includes(node.name)) {
                this.addFreeVariable(node.name);
            }
            if (!this.quantifierBindings.includes(node.args[0])) {
                this.addFreeVariable(node.args[0]);
            }
            return [
                `apply_${node.name.toLowerCase()}_${node.args[0].toLowerCase()}_`,
                node.args.reduce(
                    (acc, curr) =>
                        ts.factory.createTypeReferenceNode("Apply", [acc, ts.factory.createTypeReferenceNode(curr)]),
                    ts.factory.createTypeReferenceNode(node.name),
                ),
            ];
        }
        if (!this.quantifierBindings.includes(node.name)) {
            this.addFreeVariable(node.name);
        }
        return [`${node.name.toLowerCase()}_`, ts.factory.createTypeReferenceNode(node.name)];
    }
}
