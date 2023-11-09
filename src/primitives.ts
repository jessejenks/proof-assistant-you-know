import * as ts from "typescript";

export const createTrue = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "True",
        undefined,
        ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("_true")),
    );

export const createFalse = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "False",
        undefined,
        ts.factory.createTypeLiteralNode([
            ts.factory.createPropertySignature(
                undefined,
                "false",
                undefined,
                ts.factory.createTypeReferenceNode("False"),
            ),
        ]),
    );

const typeParameter = (name: string) =>
    ts.factory.createTypeParameterDeclaration(undefined, ts.factory.createIdentifier(name), undefined, undefined);

type TypeRefTree = string | [string, TypeRefTree[]];
const typeReference = (tree: TypeRefTree) =>
    typeof tree === "string"
        ? ts.factory.createTypeReferenceNode(tree)
        : ts.factory.createTypeReferenceNode(tree[0], tree[1].map(typeReference));

export const createAndDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "And",
        [typeParameter("A"), typeParameter("B")],
        ts.factory.createTupleTypeNode([
            ts.factory.createTypeReferenceNode("A"),
            ts.factory.createTypeReferenceNode("B"),
        ]),
        // ts.factory.createTypeLiteralNode(
        //     [
        //         ts.factory.createPropertySignature(
        //             undefined,
        //             "left",
        //             undefined,
        //             ts.factory.createTypeReferenceNode("A"),
        //         ),
        //         ts.factory.createPropertySignature(
        //             undefined,
        //             "right",
        //             undefined,
        //             ts.factory.createTypeReferenceNode("B"),
        //         ),
        //     ]
    );

export const createOrDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Or",
        [typeParameter("A"), typeParameter("B")],
        ts.factory.createUnionTypeNode([
            ts.factory.createTupleTypeNode([
                ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("left")),
                ts.factory.createTypeReferenceNode("A"),
            ]),
            ts.factory.createTupleTypeNode([
                ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("right")),
                ts.factory.createTypeReferenceNode("B"),
            ]),
            // ts.factory.createTypeLiteralNode(
            //     [
            //         ts.factory.createPropertySignature(
            //             undefined,
            //             "left",
            //             undefined,
            //             ts.factory.createTypeReferenceNode("A"),
            //         ),
            //     ]
            // ),
            // ts.factory.createTypeLiteralNode(
            //     [
            //         ts.factory.createPropertySignature(
            //             undefined,
            //             "right",
            //             undefined,
            //             ts.factory.createTypeReferenceNode("B"),
            //         ),
            //     ]
            // )
        ]),
    );

export const createImplDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Impl",
        [typeParameter("A"), typeParameter("B")],
        ts.factory.createFunctionTypeNode(
            undefined,
            [
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    "_",
                    undefined,
                    ts.factory.createTypeReferenceNode("A"),
                    undefined,
                ),
            ],
            ts.factory.createTypeReferenceNode("B"),
        ),
    );

export const createEquivDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Equiv",
        [typeParameter("A"), typeParameter("B")],
        typeReference([
            "And",
            [
                ["Impl", ["A", "B"]],
                ["Impl", ["B", "A"]],
            ],
        ]),
        // ts.factory.createTypeReferenceNode(
        //     "And",
        //     [
        //         ts.factory.createTypeReferenceNode(
        //             "Impl",
        //             [
        //                 ts.factory.createTypeReferenceNode(
        //                     "A",
        //                     undefined,
        //                 ),
        //                 ts.factory.createTypeReferenceNode(
        //                     "B",
        //                     undefined,
        //                 ),
        //             ],
        //         ),
        //         ts.factory.createTypeReferenceNode(
        //             "Impl",
        //             [
        //                 ts.factory.createTypeReferenceNode(
        //                     "B",
        //                     undefined,
        //                 ),
        //                 ts.factory.createTypeReferenceNode(
        //                     "A",
        //                     undefined,
        //                 ),
        //             ],
        //         ),
        //     ],
        // ),
    );

export const createNotDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Not",
        [typeParameter("A")],
        typeReference(["Impl", ["A", "False"]]),
        // ts.factory.createTypeReferenceNode(
        //     "Impl",
        //     [
        //         ts.factory.createTypeReferenceNode(
        //             "A",
        //             undefined,
        //         ),
        //         ts.factory.createTypeReferenceNode(
        //             "False",
        //             undefined,
        //         ),
        //     ],
        // ),
    );

const parameter = (name: string, type: ts.TypeReferenceNode) =>
    ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(name),
        undefined,
        type,
        undefined,
    );

export const basicDecl = (name: string, value: ts.Expression): ts.VariableStatement =>
    ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(name, undefined, undefined, value)],
            // what is the difference between these?
            ts.NodeFlags.Const,
        ),
    );

export const createAndIntro = () =>
    basicDecl(
        "andIntro",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("left", typeReference("A")), parameter("right", typeReference("B"))],
            typeReference(["And", ["A", "B"]]),
            undefined,
            ts.factory.createArrayLiteralExpression(
                [ts.factory.createIdentifier("left"), ts.factory.createIdentifier("right")],
                false,
            ),
        ),
    );

export const createAndElimLeft = () =>
    basicDecl(
        "andElimLeft",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    ts.factory.createArrayBindingPattern([
                        ts.factory.createBindingElement(undefined, undefined, ts.factory.createIdentifier("left")),
                        ts.factory.createBindingElement(undefined, undefined, ts.factory.createIdentifier("_")),
                    ]),
                    undefined,
                    typeReference(["And", ["A", "B"]]),
                ),
            ],
            ts.factory.createTypeReferenceNode("A"),
            undefined,
            ts.factory.createIdentifier("left"),
        ),
    );

export const createAndElimRight = () =>
    basicDecl(
        "andElimRight",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    ts.factory.createArrayBindingPattern([
                        ts.factory.createBindingElement(undefined, undefined, ts.factory.createIdentifier("_")),
                        ts.factory.createBindingElement(undefined, undefined, ts.factory.createIdentifier("right")),
                    ]),
                    undefined,
                    typeReference(["And", ["A", "B"]]),
                    undefined,
                ),
            ],
            typeReference("B"),
            undefined,
            ts.factory.createIdentifier("right"),
        ),
    );

export const createModusPonens = () =>
    basicDecl(
        "modusPonens",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("aToB", typeReference(["Impl", ["A", "B"]])), parameter("a", typeReference("A"))],
            typeReference("B"),
            undefined,
            ts.factory.createCallExpression(ts.factory.createIdentifier("aToB"), undefined, [
                ts.factory.createIdentifier("a"),
            ]),
        ),
    );
