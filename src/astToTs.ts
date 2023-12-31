import * as ts from "typescript";
import {
    Document,
    Justification,
    Assumption,
    Theorem,
    Step,
    Proof,
    AstKind,
    Expression,
    Application,
} from "./parser/parser";
import { TypeRefTree, typeReference, func, parameter } from "./tsUtils";
import { basicDecl, typedDecl } from "./primitives";

type Frame = Record<string, 0>;

const enterFrame = (frames: Frame[]) => {
    frames.push({});
};

const addFreeVariable = (frames: Frame[], name: string) => {
    frames[frames.length - 1][name] = 0;
};

const exitFrame = (frames: Frame[]): string[] => {
    const frame = frames.pop();
    if (frame === undefined) throw new Error("No frame to exit");
    const allFree = frames.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    Object.keys(allFree).forEach((k) => {
        delete frame[k];
    });
    if ("True" in frame) delete frame["True"];
    if ("False" in frame) delete frame["False"];
    return Object.keys(frame);
};

const JS_KEYWORDS = {
    true: 0,
    false: 0,
    null: 0,
    undefined: 0,
};

const escapeId = (name: string) => ts.factory.createIdentifier(name in JS_KEYWORDS ? `${name}_` : name);

const typeRefToName = (tree: TypeRefTree, id: number = 0): string => {
    if (typeof tree === "string") {
        tree = tree.toLowerCase();
        if (tree in JS_KEYWORDS) {
            return `${tree}_`;
        }
        return `${tree}${id}`;
    }
    return `${tree[0]}_${tree[1].map(typeRefToName).join("")}_`;
};

const handleJustification = (frames: Frame[], justification: Justification) =>
    justification.kind === AstKind.Application
        ? handleApplication(frames, justification)
        : handleAssumption(frames, justification);

const handleApplication = (frames: Frame[], application: Application) =>
    application.arguments.reduce(
        (acc, curr) =>
            ts.factory.createCallExpression(acc, undefined, [
                curr.kind === AstKind.Identifier
                    ? escapeId(curr.name)
                    : ts.factory.createIdentifier(typeRefToName(handleExpression(frames, curr))),
            ]),
        escapeId(application.rule) as ts.Expression,
    );

const handleAssumption = (frames: Frame[], assumption: Assumption): ts.Expression => {
    const assumptions = assumption.assumptions.map(({ name, expression }) => {
        enterFrame(frames);
        const tr = handleExpression(frames, expression);
        return [name === null ? typeRefToName(tr) : name, tr] as [string, TypeRefTree];
    });
    const body = handleProof(frames, assumption.subproof);
    const assumptionsCopy = [...assumptions];
    const [nm, tp] = assumptionsCopy.pop()!;
    let typeVars = exitFrame(frames);
    const f = func([parameter(nm, typeReference(tp))], typeVars, undefined, body);
    return assumptionsCopy.reduceRight((ret, [nm, tp]) => {
        typeVars = exitFrame(frames);
        return func([parameter(nm, typeReference(tp))], typeVars, undefined, ret);
    }, f as ts.Expression);
};

const handleStep = (frames: Frame[], step: Step): [ts.VariableStatement, string] => {
    const call = handleJustification(frames, step.justification);
    const { name, expression } = step.expression;
    const tp = handleExpression(frames, expression);
    const stepName = name === null ? typeRefToName(tp) : name;
    return [
        // TODO: How to deal with repeats? Shouldn't happen but also shouldn't fail because of that either?
        typedDecl(stepName, typeReference(tp), call),
        stepName,
    ];
};

const handleTheorem = (frames: Frame[], node: Theorem): ts.Statement => {
    enterFrame(frames);
    const { name, expression } = node.expression;
    const expr = handleExpression(frames, expression);
    const tp = typeReference(expr);
    const body = handleProof(frames, node.proof);
    const typeVars = exitFrame(frames);
    const f = func([], typeVars, tp, body);
    if (name === null) {
        return ts.factory.createExpressionStatement(f);
    } else {
        return basicDecl(name, f);
    }
};

const handleProof = (frames: Frame[], proof: Proof): ts.ConciseBody => {
    const body: ts.Statement[] = proof.statements.map((s) => {
        switch (s.kind) {
            case AstKind.Assumption:
                return ts.factory.createExpressionStatement(handleAssumption(frames, s));
            case AstKind.Step: {
                const [decl] = handleStep(frames, s);
                return decl;
            }
        }
    });
    let retExp: ts.Expression;
    switch (proof.finalStep.kind) {
        case AstKind.Application: {
            retExp = handleApplication(frames, proof.finalStep);
            break;
        }
        case AstKind.Assumption: {
            retExp = handleAssumption(frames, proof.finalStep);
            break;
        }
        case AstKind.Step: {
            const [decl, name] = handleStep(frames, proof.finalStep);
            body.push(decl);
            retExp = ts.factory.createIdentifier(name);
        }
    }
    return body.length === 0 ? retExp : ts.factory.createBlock(body.concat(ts.factory.createReturnStatement(retExp)));
};

const handleExpression = (frames: Frame[], expr: Expression): TypeRefTree => {
    switch (expr.kind) {
        case AstKind.Implication:
            return ["Impl", [handleExpression(frames, expr.left), handleExpression(frames, expr.right)]];
        case AstKind.Disjunction:
            return ["Or", [handleExpression(frames, expr.left), handleExpression(frames, expr.right)]];
        case AstKind.Conjunction:
            return ["And", [handleExpression(frames, expr.left), handleExpression(frames, expr.right)]];
        case AstKind.Negation:
            return ["Not", [handleExpression(frames, expr.value)]];
        case AstKind.TypeVar: {
            addFreeVariable(frames, expr.name);
            return expr.name;
        }
    }
};

export const toStatements = (root: Document): ts.Statement[] => {
    const frames: Frame[] = [];
    return root.theorems.map((p) => handleTheorem(frames, p));
};
