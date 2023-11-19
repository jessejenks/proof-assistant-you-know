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
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
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
    );

export const createOrDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Or",
        [typeParameter("A"), typeParameter("B")],
        ts.factory.createUnionTypeNode([
            ts.factory.createTypeLiteralNode([
                ts.factory.createPropertySignature(
                    undefined,
                    ts.factory.createIdentifier("_isLeft"),
                    undefined,
                    ts.factory.createLiteralTypeNode(ts.factory.createTrue()),
                ),
                ts.factory.createPropertySignature(
                    undefined,
                    ts.factory.createIdentifier("left"),
                    undefined,
                    ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("A"), undefined),
                ),
            ]),
            ts.factory.createTypeLiteralNode([
                ts.factory.createPropertySignature(
                    undefined,
                    ts.factory.createIdentifier("_isLeft"),
                    undefined,
                    ts.factory.createLiteralTypeNode(ts.factory.createFalse()),
                ),
                ts.factory.createPropertySignature(
                    undefined,
                    ts.factory.createIdentifier("right"),
                    undefined,
                    ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("B"), undefined),
                ),
            ]),
        ]),
    );

export const createImplDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Impl",
        [typeParameter("A"), typeParameter("B")],
        ts.factory.createFunctionTypeNode(undefined, [parameter("_", typeReference("A"))], typeReference("B")),
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
    );

export const createNotDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Not",
        [typeParameter("A")],
        typeReference(["Impl", ["A", "False"]]),
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
            // There is also a ts.NodeFlags.Constant. what is the difference between these?
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

export const createModusTollens = () =>
    basicDecl(
        "modusTollens",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("aToB", typeReference(["Impl", ["A", "B"]])), parameter("notB", typeReference(["Not", ["B"]]))],
            typeReference(["Not", ["A"]]),
            undefined,
            ts.factory.createArrowFunction(
                undefined,
                undefined,
                [parameter("a", typeReference("A"))],
                undefined,
                undefined,
                ts.factory.createCallExpression(ts.factory.createIdentifier("notB"), undefined, [
                    ts.factory.createCallExpression(ts.factory.createIdentifier("aToB"), undefined, [
                        ts.factory.createIdentifier("a"),
                    ]),
                ]),
            ),
        ),
    );

export const createOrIntroLeft = () =>
    basicDecl(
        "orIntroLeft",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("right", typeReference("B"))],
            typeReference(["Or", ["A", "B"]]),
            undefined,
            ts.factory.createParenthesizedExpression(
                ts.factory.createObjectLiteralExpression(
                    [
                        ts.factory.createPropertyAssignment(
                            ts.factory.createIdentifier("_isLeft"),
                            ts.factory.createFalse(),
                        ),
                        ts.factory.createShorthandPropertyAssignment(ts.factory.createIdentifier("right"), undefined),
                    ],
                    false,
                ),
            ),
        ),
    );

export const createOrIntroRight = () =>
    basicDecl(
        "orIntroRight",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("left", typeReference("A"))],
            typeReference(["Or", ["A", "B"]]),
            undefined,
            ts.factory.createParenthesizedExpression(
                ts.factory.createObjectLiteralExpression(
                    [
                        ts.factory.createPropertyAssignment(
                            ts.factory.createIdentifier("_isLeft"),
                            ts.factory.createTrue(),
                        ),
                        ts.factory.createShorthandPropertyAssignment(ts.factory.createIdentifier("left"), undefined),
                    ],
                    false,
                ),
            ),
        ),
    );
