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

const handleJustification = (justification: Justification) =>
    `${justification.rule} ${justification.expressions.map(handleExpression).join(", ")}`;

const handleAssumption = (assumption: Assumption) =>
    `assume ${assumption.assumptions.map(handleExpression).join(", ")} {\n${handleProof(assumption.subproof)}\n}`;

const handleStep = (step: Step) => `have ${handleExpression(step.have)} by ${handleJustification(step.justification)}`;

const handleStatement = (statement: Statement) => {
    switch (statement.kind) {
        case AstKind.Assumption:
            return handleAssumption(statement);
        case AstKind.Step:
            return handleStep(statement);
    }
};

const handleFinalStep = (step: FinalStep) =>
    step.kind === AstKind.Justification ? handleJustification(step) : handleStatement(step);

const handleProof = (proof: Proof) =>
    proof.statements.map(handleStatement).concat(handleFinalStep(proof.finalStep)).join("\n");

const handleTheorem = (theorem: Theorem) =>
    `theorem ${theorem.name === null ? "" : theorem.name + " "}: ${handleExpression(theorem.expression)}\n${handleProof(
        theorem.proof,
    )}`;

export const prettyPrint = (document: Document) => document.proofs.map(handleTheorem).join("\n\n") + "\n";