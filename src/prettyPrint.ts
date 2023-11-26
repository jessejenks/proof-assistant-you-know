import {
    Document,
    Theorem,
    Proof,
    Statement,
    FinalStep,
    Expression,
    AstKind,
    Assumption,
    Step,
    Justification,
    Identifier,
    Application,
    NamedExpression,
} from "./parser/parser";

const handleExpression = (expression: Expression) => {
    switch (expression.kind) {
        case AstKind.Implication: {
            return `(${handleExpression(expression.left)} => ${handleExpression(expression.right)})`;
        }
        case AstKind.Disjunction: {
            return `(${handleExpression(expression.left)} | ${handleExpression(expression.right)})`;
        }
        case AstKind.Conjunction: {
            return `(${handleExpression(expression.left)} & ${handleExpression(expression.right)})`;
        }
        case AstKind.Negation: {
            return `(~${handleExpression(expression.value)})`;
        }
        case AstKind.TypeVar: {
            return expression.name;
        }
    }
};

const handleIdentifierOrExpression = (idOrExpr: Identifier | Expression) =>
    idOrExpr.kind === AstKind.Identifier ? idOrExpr.name : handleExpression(idOrExpr);

const handleNamedExpression = ({ name, expression }: NamedExpression) =>
    name === null ? handleExpression(expression) : `${name} : ${handleExpression(expression)}`;

const handleAssumption = (assumption: Assumption) =>
    `assume ${assumption.assumptions.map(handleNamedExpression).join(", ")} {\n${handleProof(assumption.subproof)}\n}`;

const handleApplication = (application: Application) =>
    `${application.rule} ${application.arguments.map(handleIdentifierOrExpression).join(", ")}`;

const handleJustification = (justification: Justification) =>
    justification.kind === AstKind.Application ? handleApplication(justification) : handleAssumption(justification);

const handleStep = (step: Step) =>
    `have ${handleNamedExpression(step.expression)} by ${handleJustification(step.justification)}`;

const handleStatement = (statement: Statement) => {
    switch (statement.kind) {
        case AstKind.Assumption:
            return handleAssumption(statement);
        case AstKind.Step:
            return handleStep(statement);
    }
};

const handleFinalStep = (step: FinalStep) =>
    step.kind === AstKind.Step ? handleStatement(step) : handleJustification(step);

const handleProof = (proof: Proof) =>
    proof.statements.map(handleStatement).concat(handleFinalStep(proof.finalStep)).join("\n");

const handleTheorem = (theorem: Theorem) =>
    `theorem ${handleNamedExpression(theorem.expression)}\n${handleProof(theorem.proof)}`;

export const prettyPrint = (document: Document) => document.proofs.map(handleTheorem).join("\n\n") + "\n";
