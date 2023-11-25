import * as ts from "typescript";
import { Document, Justification, Assumption, Theorem, Step, Proof, AstKind, Expression } from "./parser/parser";
import { TypeRefTree, typeReference, func, parameter } from "./tsUtils";

type Frame = Record<string, 0>;

const enterFrame = (frames: Frame[]) => {
    frames.push({});
};

const addFreeVariable = (frames: Frame[], name: string) => {
    if (name === "True" || name == "False") return;
    frames[frames.length - 1][name] = 0;
};

const exitFrame = (frames: Frame[]): string[] => {
    const frame = frames.pop();
    if (frame === undefined) throw new Error("No frame to exit");
    const allFree = frames.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    Object.keys(allFree).forEach((k) => {
        delete frame[k];
    });
    return Object.keys(frame);
};

const typeRefToName = (tree: TypeRefTree, id: number = 0): string =>
    typeof tree === "string" ? `${tree.toLowerCase()}${id}` : `${tree[0]}_${tree[1].map(typeRefToName).join("")}_`;

const handleJustification = (frames: Frame[], justification: Justification) =>
    justification.expressions.reduce(
        (acc, curr) =>
            ts.factory.createCallExpression(acc, undefined, [
                ts.factory.createIdentifier(typeRefToName(handleExpression(frames, curr))),
            ]),
        ts.factory.createCallExpression(ts.factory.createIdentifier(justification.rule), undefined, []),
    );

const handleAssumption = (frames: Frame[], assumption: Assumption): ts.Expression => {
    const assumptions = assumption.assumptions.map((e) => {
        enterFrame(frames);
        return handleExpression(frames, e);
    });
    const body = handleProof(frames, assumption.subproof);
    const assumptionsCopy = [...assumptions];
    const tp = assumptionsCopy.pop()!;
    const typeVars = exitFrame(frames);
    const f = func([parameter(typeRefToName(tp), typeReference(tp))], typeVars, undefined, body);
    return assumptionsCopy.reduceRight((ret, tp) => {
        const typeVars = exitFrame(frames);
        const f = func(
            [parameter(typeRefToName(tp), typeReference(tp))],
            typeVars,
            undefined,
            ts.factory.createBlock([ts.factory.createReturnStatement(ret)]),
        );
        return f;
    }, f as ts.Expression);
};

const handleStep = (frames: Frame[], step: Step): [ts.VariableStatement, string] => {
    const call = handleJustification(frames, step.justification);
    const tp = handleExpression(frames, step.have);
    const name = typeRefToName(tp);
    return [
        ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(name, undefined, typeReference(tp), call)],
                // TODO: How to deal with repeats? Shouldn't happen but also shouldn't fail because of that either?
                ts.NodeFlags.Const,
            ),
        ),
        name,
    ];
};

const handleTheorem = (frames: Frame[], node: Theorem): ts.Statement => {
    enterFrame(frames);
    const expr = handleExpression(frames, node.expression);
    const tp = typeReference(expr);
    const body = handleProof(frames, node.proof);
    const typeVars = exitFrame(frames);
    const f = func([], typeVars, tp, body);
    if (node.name === null) {
        return ts.factory.createExpressionStatement(f);
    } else {
        return ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(ts.factory.createIdentifier(node.name), undefined, undefined, f)],
                ts.NodeFlags.Const,
            ),
        );
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
        case AstKind.Justification: {
            retExp = handleJustification(frames, proof.finalStep);
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
    return root.proofs.map((p) => handleTheorem(frames, p));
};
