import * as ts from "typescript";
import { typeParameter, typeReference, parameter } from "./tsUtils";

// True, False, and connctives
export const createTrueType = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "True",
        undefined,
        ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("true_")),
    );

export const createFalseType = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "False",
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
    );

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

// Not<P> is an alias for Impl<P, False>
export const createNotDeclaration = () =>
    ts.factory.createTypeAliasDeclaration(
        undefined,
        "Not",
        [typeParameter("A")],
        typeReference(["Impl", ["A", "False"]]),
    );

// helpers
export const basicDecl = (name: string, value: ts.Expression): ts.VariableStatement =>
    ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(name, undefined, undefined, value)],
            // There is also a ts.NodeFlags.Constant. what is the difference between these?
            ts.NodeFlags.Const,
        ),
    );

export const typedDecl = (name: string, type: ts.TypeNode, value: ts.Expression): ts.VariableStatement =>
    ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(name, undefined, type, value)],
            ts.NodeFlags.Const,
        ),
    );

// Rules of inference

export const createTrueIntro = () =>
    typedDecl("trueIntro", typeReference("True"), ts.factory.createStringLiteral("true_"));

// not sure how to categorize this in terms of introduction or elimination
export const createFalseElim = () =>
    basicDecl(
        "falseElim",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A")],
            [parameter("_", typeReference("False"))],
            undefined,
            undefined,
            ts.factory.createAsExpression(ts.factory.createStringLiteral("never"), typeReference("A")),
        ),
    );

export const createAndIntro = () =>
    basicDecl(
        "andIntro",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A")],
            [parameter("left", typeReference("A"))],
            undefined,
            undefined,
            ts.factory.createArrowFunction(
                undefined,
                [typeParameter("B")],
                [parameter("right", typeReference("B"))],
                typeReference(["And", ["A", "B"]]),
                undefined,
                ts.factory.createArrayLiteralExpression(
                    [ts.factory.createIdentifier("left"), ts.factory.createIdentifier("right")],
                    false,
                ),
            ),
        ),
    );

export const createAndElimLeft = () =>
    basicDecl(
        "andElimLeft",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("and", typeReference(["And", ["A", "B"]]))],
            typeReference("A"),
            undefined,
            ts.factory.createElementAccessExpression(
                ts.factory.createIdentifier("and"),
                ts.factory.createNumericLiteral("0"),
            ),
        ),
    );

export const createAndElimRight = () =>
    basicDecl(
        "andElimRight",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("and", typeReference(["And", ["A", "B"]]))],
            typeReference("B"),
            undefined,
            ts.factory.createElementAccessExpression(
                ts.factory.createIdentifier("and"),
                ts.factory.createNumericLiteral("1"),
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

export const createImplElim = () =>
    basicDecl(
        "implElim",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("aToB", typeReference(["Impl", ["A", "B"]]))],
            undefined,
            undefined,
            ts.factory.createArrowFunction(
                undefined,
                undefined,
                [parameter("a", typeReference("A"))],
                typeReference("B"),
                undefined,
                ts.factory.createCallExpression(ts.factory.createIdentifier("aToB"), undefined, [
                    ts.factory.createIdentifier("a"),
                ]),
            ),
        ),
    );

export const createOrElim = () =>
    basicDecl(
        "orElim",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("or", typeReference(["Or", ["A", "B"]]))],
            undefined,
            undefined,
            ts.factory.createArrowFunction(
                undefined,
                [typeParameter("C")],
                [parameter("aToC", typeReference(["Impl", ["A", "C"]]))],
                undefined,
                undefined,
                ts.factory.createArrowFunction(
                    undefined,
                    undefined,
                    [parameter("bToC", typeReference(["Impl", ["B", "C"]]))],
                    typeReference("C"),
                    undefined,
                    ts.factory.createConditionalExpression(
                        ts.factory.createPropertyAccessExpression(
                            ts.factory.createIdentifier("or"),
                            ts.factory.createIdentifier("_isLeft"),
                        ),
                        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createCallExpression(ts.factory.createIdentifier("aToC"), undefined, [
                            ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier("or"),
                                ts.factory.createIdentifier("left"),
                            ),
                        ]),
                        ts.factory.createToken(ts.SyntaxKind.ColonToken),
                        ts.factory.createCallExpression(ts.factory.createIdentifier("bToC"), undefined, [
                            ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier("or"),
                                ts.factory.createIdentifier("right"),
                            ),
                        ]),
                    ),
                ),
            ),
        ),
    );

export const createId = () =>
    basicDecl(
        "id",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A")],
            [parameter("a", typeReference("A"))],
            typeReference("A"),
            undefined,
            ts.factory.createIdentifier("a"),
        ),
    );

// We can't call it "true" because that's a keyword in js. The typescript generator is aware of this and has special handling
export const createTrueTrueIntroAlias = () => basicDecl("true_", ts.factory.createIdentifier("trueIntro"));
export const createExFalsoFalseElimAlias = () => basicDecl("exFalso", ts.factory.createIdentifier("falseElim"));
export const createAbsurdFalseElimAlias = () => basicDecl("absurd", ts.factory.createIdentifier("falseElim"));
export const createModusPonensImplElimAlias = () => basicDecl("modusPonens", ts.factory.createIdentifier("implElim"));
export const createExactIdAlias = () => basicDecl("exact", ts.factory.createIdentifier("id"));

// modus tollens is actually provable from modus ponens and the definition of negation
export const createModusTollens = () =>
    basicDecl(
        "modusTollens",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A"), typeParameter("B")],
            [parameter("aToB", typeReference(["Impl", ["A", "B"]]))],
            undefined,
            undefined,
            ts.factory.createArrowFunction(
                undefined,
                undefined,
                [parameter("notB", typeReference(["Not", ["B"]]))],
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
        ),
    );

// not elimination is also provable from modus ponens and the definition of negation
export const createNotElim = () =>
    basicDecl(
        "notElim",
        ts.factory.createArrowFunction(
            undefined,
            [typeParameter("A")],
            [parameter("a", typeReference("A"))],
            undefined,
            undefined,
            ts.factory.createArrowFunction(
                undefined,
                undefined,
                [parameter("notA", typeReference(["Not", ["A"]]))],
                typeReference("False"),
                undefined,
                ts.factory.createCallExpression(
                    ts.factory.createCallExpression(ts.factory.createIdentifier("implElim"), undefined, [
                        ts.factory.createIdentifier("notA"),
                    ]),
                    undefined,
                    [ts.factory.createIdentifier("a")],
                ),
            ),
        ),
    );
