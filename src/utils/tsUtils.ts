import * as ts from "typescript";

export const typeParameter = (name: string) =>
    ts.factory.createTypeParameterDeclaration(undefined, ts.factory.createIdentifier(name), undefined, undefined);

export type TypeRefTree = string | [string, TypeRefTree[]];
export const typeReference = (tree: TypeRefTree): ts.TypeReferenceNode =>
    typeof tree === "string"
        ? ts.factory.createTypeReferenceNode(tree)
        : ts.factory.createTypeReferenceNode(tree[0], tree[1].map(typeReference));

export const parameter = (name: string, type: ts.TypeNode) =>
    ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(name),
        undefined,
        type,
        undefined,
    );

export const func = (
    params: ts.ParameterDeclaration[],
    tpParams: string[] | undefined,
    tp: ts.TypeNode | undefined,
    body: ts.ConciseBody,
): ts.ArrowFunction =>
    ts.factory.createArrowFunction(
        undefined,
        tpParams === undefined
            ? undefined
            : tpParams.map((x) => ts.factory.createTypeParameterDeclaration(undefined, ts.factory.createIdentifier(x))),
        params,
        tp,
        undefined,
        body,
    );
