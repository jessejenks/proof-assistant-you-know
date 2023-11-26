/*
Document        := Theorem+
Theorem         := "theorem" NamedExpression Proof
Proof           := Statement* FinalStep
Statement       := Assumption | Step
FinalStep       := Statement | Justification
Step            := "have" NamedExpression Justification
Justification   := "by" Application | Assumption
Application     := identifier (identifier | Expression) ("," (identifier | Expression))*
Assumption      := "assume" NamedExpression ("," NamedExpression)* "{" Proof "}"
NamedExpression := (identifier ":")? Expression
Expression      := Implication
Implication     := Disjunction ("=>" Disjunction)*
Disjunction     := Conjunction ("|" Conjunction)*
Conjunction     := Negation ("&" Negation)*
Negation        := "~" Negation | Atom
Atom            := typeVar | "(" Expr ")"
*/

import { TokenKind, Token, Lexer, tokenKindToString, locationToString } from "./lexer";

class ParseError extends Error {}

export enum AstKind {
    Document,
    Theorem,
    Proof,
    Assumption,
    Step,
    Application,
    Identifier,
    Implication,
    Disjunction,
    Conjunction,
    Negation,
    TypeVar,
}

const KIND_TO_NAME: Record<AstKind, string> = {
    [AstKind.Document]: "Document",
    [AstKind.Theorem]: "Theorem",
    [AstKind.Proof]: "Proof",
    [AstKind.Assumption]: "Assumption",
    [AstKind.Step]: "Step",
    [AstKind.Application]: "Application",
    [AstKind.Identifier]: "Identifier",
    [AstKind.Implication]: "Implication",
    [AstKind.Disjunction]: "Disjunction",
    [AstKind.Conjunction]: "Conjunction",
    [AstKind.Negation]: "Negation",
    [AstKind.TypeVar]: "TypeVar",
};

export const astKindToString = (astKind: AstKind | null | undefined): string =>
    astKind === null || astKind === undefined ? "?" : KIND_TO_NAME[astKind];

export type Ast = Document | Theorem | Statement | Expression;
export type Document = {
    kind: AstKind.Document;
    proofs: Theorem[];
};
export type Theorem = {
    kind: AstKind.Theorem;
    expression: NamedExpression;
    proof: Proof;
};

export type Proof = {
    kind: AstKind.Proof;
    statements: Statement[];
    finalStep: FinalStep;
};

export type Statement = Assumption | Step;
export type FinalStep = Statement | Justification;

export type Step = {
    kind: AstKind.Step;
    expression: NamedExpression;
    justification: Justification;
};

export type Justification = Application | Assumption;
export type Application = {
    kind: AstKind.Application;
    rule: string;
    arguments: (Identifier | Expression)[];
};
export type Assumption = {
    kind: AstKind.Assumption;
    assumptions: NamedExpression[];
    subproof: Proof;
};

export type NamedExpression = {
    name: string | null;
    expression: Expression;
};

export type Expression = TypeVar | Negation | Conjunction | Disjunction | Implication;
export type Implication = {
    kind: AstKind.Implication;
    left: Expression;
    right: Expression;
};
export type Disjunction = {
    kind: AstKind.Disjunction;
    left: Expression;
    right: Expression;
};
export type Conjunction = {
    kind: AstKind.Conjunction;
    left: Expression;
    right: Expression;
};
export type Negation = {
    kind: AstKind.Negation;
    value: Expression;
};
export type Identifier = { kind: AstKind.Identifier; name: string };
export type TypeVar = { kind: AstKind.TypeVar; name: string };

export class Parser {
    private lexer: Lexer;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
    }

    private nextIs(tokenKind: TokenKind): boolean {
        return this.lexer.peek()?.kind === tokenKind;
    }

    private chomp() {
        this.lexer.next();
    }

    private chompIfNextIs(tokenKind: TokenKind): boolean {
        if (this.nextIs(tokenKind)) {
            this.chomp();
            return true;
        }
        return false;
    }

    private expect<T extends TokenKind>(tokenKind: T): Token & { kind: T } {
        const tok = this.lexer.next();
        if (tok?.kind === tokenKind) {
            return tok as Token & { kind: T };
        }
        throw new ParseError(
            `Unexpected token. Expected ${tokenKindToString(tokenKind)} but got ${tokenKindToString(
                tok?.kind,
            )} at ${locationToString(tok?.location || this.lexer.location)}`,
        );
    }

    parse(): Document {
        // Document      := Theorem+
        const proofs = [this.parseTheorem()];
        while (!this.lexer.eof() && this.nextIs(TokenKind.TheoremKeyword)) {
            proofs.push(this.parseTheorem());
        }
        return { kind: AstKind.Document, proofs };
    }

    parseTheorem(): Theorem {
        // Theorem       := "theorem" (identifier ":")? Expression Proof
        this.expect(TokenKind.TheoremKeyword);
        const expression = this.parseNamedExpression();
        const proof = this.parseProof();
        return { kind: AstKind.Theorem, expression, proof };
    }

    parseProof(): Proof {
        // Proof         := Statement* FinalStep
        const statements: Statement[] = [];
        while (!this.lexer.eof() && (this.nextIs(TokenKind.HaveKeyword) || this.nextIs(TokenKind.AssumeKeyword))) {
            statements.push(this.parseStatement());
        }
        let finalStep: FinalStep;
        if (this.nextIs(TokenKind.ByKeyword)) {
            finalStep = this.parseJustification();
        } else {
            const lastStatement = statements.pop();
            if (lastStatement === undefined)
                throw new ParseError(`Empty Proof at ${locationToString(this.lexer.location)}`);
            finalStep = lastStatement;
        }
        return { kind: AstKind.Proof, statements, finalStep };
    }

    parseStatement(): Statement {
        // Statement     := Assumption | Step
        if (this.nextIs(TokenKind.AssumeKeyword)) {
            return this.parseAssumption();
        } else if (this.nextIs(TokenKind.HaveKeyword)) {
            return this.parseStep();
        }
        throw new ParseError(
            `Unexpected token type: ${tokenKindToString(this.lexer.peek()?.kind)} at ${locationToString(
                this.lexer.location,
            )}, expected "assume" or "have"`,
        );
    }

    parseStep(): Step {
        // Step          := "have" (identifier ":")? Expression Justification
        this.expect(TokenKind.HaveKeyword);
        const expression = this.parseNamedExpression();
        const justification = this.parseJustification();
        return { kind: AstKind.Step, expression, justification };
    }

    parseJustification(): Justification {
        // Justification := "by" Application | Assumption
        this.expect(TokenKind.ByKeyword);
        if (this.nextIs(TokenKind.AssumeKeyword)) {
            return this.parseAssumption();
        }
        return this.parseApplication();
    }

    parseApplication(): Application {
        // Application   := identifier (identifier | Expression) ("," (identifier | Expression))*
        const { value: rule } = this.expect(TokenKind.Identifier);
        const arguments_: (Identifier | Expression)[] = [this.parseIdentifierOrExpression()];
        while (this.chompIfNextIs(TokenKind.Comma)) {
            arguments_.push(this.parseIdentifierOrExpression());
        }
        return { kind: AstKind.Application, rule, arguments: arguments_ };
    }

    private parseIdentifierOrExpression(): Identifier | Expression {
        if (this.nextIs(TokenKind.Identifier)) {
            const { value: name } = this.expect(TokenKind.Identifier);
            return { kind: AstKind.Identifier, name };
        }
        return this.parseExpression();
    }

    parseAssumption(): Assumption {
        // Assumption    := "assume" (identifier ":")? Expression ("," (identifier ":")? Expression)* "{" Proof "}"
        this.expect(TokenKind.AssumeKeyword);
        const assumptions: NamedExpression[] = [this.parseNamedExpression()];
        while (this.chompIfNextIs(TokenKind.Comma)) {
            assumptions.push(this.parseNamedExpression());
        }
        this.expect(TokenKind.LBrace);
        const subproof = this.parseProof();
        this.expect(TokenKind.RBrace);
        return { kind: AstKind.Assumption, assumptions, subproof };
    }

    parseNamedExpression(): NamedExpression {
        let name: string | null = null;
        if (this.nextIs(TokenKind.Identifier)) {
            const { value } = this.expect(TokenKind.Identifier);
            this.expect(TokenKind.Colon);
            name = value;
        }
        return { name, expression: this.parseExpression() };
    }

    parseExpression(): Expression {
        // Expression    := Implication
        return this.parseImplication();
    }

    parseImplication(): Expression {
        // Implication   := Disjunction ("=>" Disjunction)*
        const terms = [this.parseDisjunction()];
        while (this.chompIfNextIs(TokenKind.Implies)) {
            terms.push(this.parseDisjunction());
        }
        // => is right associating
        return terms.reduceRight((prev, curr) => ({ kind: AstKind.Implication, left: curr, right: prev }));
    }

    parseDisjunction(): Expression {
        // Disjunction   := Conjunction ("|" Conjunction)*
        const terms = [this.parseConjunction()];
        while (this.chompIfNextIs(TokenKind.Or)) {
            terms.push(this.parseConjunction());
        }
        // | is left associating
        return terms.reduce((prev, curr) => ({ kind: AstKind.Disjunction, left: prev, right: curr }));
    }

    parseConjunction(): Expression {
        // Conjunction   := Negation ("&" Negation)*
        const terms = [this.parseNegation()];
        while (this.chompIfNextIs(TokenKind.And)) {
            terms.push(this.parseNegation());
        }
        // & is left associating
        return terms.reduce((prev, curr) => ({ kind: AstKind.Conjunction, left: prev, right: curr }));
    }

    parseNegation(): Expression {
        // Negation      := "~" Negation | Atom
        if (this.chompIfNextIs(TokenKind.Not)) {
            return { kind: AstKind.Negation, value: this.parseNegation() };
        }
        return this.parseAtom();
    }

    parseAtom(): Expression {
        // Atom          := typeVar | "(" Expr ")"
        if (this.chompIfNextIs(TokenKind.LParen)) {
            const expr = this.parseExpression();
            this.expect(TokenKind.RParen);
            return expr;
        } else if (this.nextIs(TokenKind.TypeVar)) {
            const { value } = this.expect(TokenKind.TypeVar);
            return { kind: AstKind.TypeVar, name: value };
        }
        throw new ParseError(
            `Unexpected token type: ${tokenKindToString(this.lexer.peek()?.kind)} at ${locationToString(
                this.lexer.location,
            )}`,
        );
    }
}
