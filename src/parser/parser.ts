/*
Document        := Theorem*
Theorem         := "theorem" NamedExpression Proof
Proof           := Statement* FinalStep
Statement       := Assumption | Generalization | Step
FinalStep       := Statement | "by" Justification
Step            := "have" NamedExpression "by" Justification
Justification   := Application | Assumption | Generalization
Application     := identifier (identifier | Expression) ("," (identifier | Expression))*
Assumption      := "assume" NamedExpression ("," NamedExpression)* "{" Proof "}"
Generalization  := "forall" typeVar ("," typeVar)* "{" Proof "}"
NamedExpression := (identifier ":")? Expression
Expression      := Quantified
Quantified      := ("forall" typeVar ("," typeVar)* "." Implication) | Implication
Implication     := Disjunction ("=>" Disjunction)*
Disjunction     := Conjunction ("|" Conjunction)*
Conjunction     := Negation ("&" Negation)*
Negation        := "~" Negation | Atom
Atom            := TypeVar | "(" Expr ")"
TypeVar         := typeVar ("[" typeVar ("," typeVar)* "]")?
*/

import { inSystemFMode } from "../utils/utils";
import { TokenKind, Token, Lexer, tokenKindToString, locationToString, Location } from "./lexer";

export class ParseError extends Error {
    location: Location;
    constructor(message: string, location: Location) {
        super(message);
        this.location = location;
        // hack to get instanceof check to work
        Object.setPrototypeOf(this, ParseError.prototype);
    }

    toString() {
        return `${super.toString()} at ${locationToString(this.location)}`;
    }
}

export enum AstKind {
    Document,
    Theorem,
    Proof,
    Assumption,
    Step,
    Generalization,
    Application,
    Identifier,
    Quantified,
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
    [AstKind.Generalization]: "Generalization",
    [AstKind.Application]: "Application",
    [AstKind.Identifier]: "Identifier",
    [AstKind.Quantified]: "Quantified",
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
    theorems: Theorem[];
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

export type Statement = Assumption | Generalization | Step;
export type FinalStep = Statement | Justification;

export type Step = {
    kind: AstKind.Step;
    expression: NamedExpression;
    justification: Justification;
};

export type Justification = Application | Assumption | Generalization;
export type Generalization = {
    kind: AstKind.Generalization;
    typeVars: string[];
    subproof: Proof;
};
export type Argument = Identifier | Expression;
export type Application = {
    kind: AstKind.Application;
    rule: string;
    arguments: Argument[];
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

export type Expression = TypeVar | Negation | Conjunction | Disjunction | Implication | Quantified;
export type Quantified = {
    kind: AstKind.Quantified;
    typeVars: string[];
    body: Expression;
};
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
    body: Expression;
};
export type Identifier = { kind: AstKind.Identifier; name: string };
export type TypeVar = { kind: AstKind.TypeVar; name: string; args: string[] };

export class Parser {
    private lexer: Lexer;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
    }

    private nextIs(...tokenKinds: TokenKind[]): boolean {
        return tokenKinds.includes(this.lexer.peek().kind);
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
            `Unexpected token. Expected ${tokenKindToString(tokenKind)} but got ${tokenKindToString(tok?.kind)}`,
            tok?.location ?? this.lexer.location,
        );
    }

    parse(): Document {
        // Document      := Theorem*
        const theorems: Theorem[] = [];
        while (this.nextIs(TokenKind.TheoremKeyword)) {
            theorems.push(this.parseTheorem());
        }
        if (!this.lexer.eof()) {
            this.expect(TokenKind.EOF);
        }
        return { kind: AstKind.Document, theorems };
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
        while (this.nextIs(TokenKind.HaveKeyword, TokenKind.AssumeKeyword, TokenKind.ForallKeyword)) {
            statements.push(this.parseStatement());
        }
        // FinalStep       := Statement | "by" Justification
        let finalStep: FinalStep;
        if (this.chompIfNextIs(TokenKind.ByKeyword)) {
            finalStep = this.parseJustification();
        } else {
            const lastStatement = statements.pop();
            if (lastStatement === undefined)
                throw new ParseError(`Empty Proof, expected new statement or end of proof`, this.lexer.location);
            finalStep = lastStatement;
        }
        return { kind: AstKind.Proof, statements, finalStep };
    }

    parseStatement(): Statement {
        // Statement     := Assumption | Generalization | Step
        if (this.nextIs(TokenKind.AssumeKeyword)) {
            return this.parseAssumption();
        } else if (this.nextIs(TokenKind.ForallKeyword)) {
            return this.parseGeneralization();
        } else if (this.nextIs(TokenKind.HaveKeyword)) {
            return this.parseStep();
        }
        const tok = this.lexer.peek();
        throw new ParseError(
            `Unexpected token type: ${tokenKindToString(tok?.kind)}, expected "assume" or "have"`,
            tok?.location ?? this.lexer.location,
        );
    }

    parseStep(): Step {
        // Step          := "have" (identifier ":")? Expression "by" Justification
        this.expect(TokenKind.HaveKeyword);
        const expression = this.parseNamedExpression();
        this.expect(TokenKind.ByKeyword);
        const justification = this.parseJustification();
        return { kind: AstKind.Step, expression, justification };
    }

    parseJustification(): Justification {
        // Justification := Application | Assumption | Generalization

        if (this.nextIs(TokenKind.AssumeKeyword)) {
            return this.parseAssumption();
        } else if (this.nextIs(TokenKind.ForallKeyword)) {
            return this.parseGeneralization();
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

    parseGeneralization(): Generalization {
        // Generalization  := "forall" typeVar ("," typeVar)* "{" Proof "}"
        this.expect(TokenKind.ForallKeyword);
        const typeVars: string[] = [this.expect(TokenKind.TypeVar).value];
        while (this.chompIfNextIs(TokenKind.Comma)) {
            typeVars.push(this.expect(TokenKind.TypeVar).value);
        }
        this.expect(TokenKind.LBrace);
        const subproof = this.parseProof();
        this.expect(TokenKind.RBrace);
        return { kind: AstKind.Generalization, typeVars, subproof };
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
        // Expression      := Quantified
        return this.parseQuantified();
    }

    parseQuantified(): Expression {
        // Quantified      := ("forall" typeVar ("," typeVar)* "." Implication) | Implication
        if (this.chompIfNextIs(TokenKind.ForallKeyword)) {
            const typeVars = [this.expect(TokenKind.TypeVar).value];
            while (this.chompIfNextIs(TokenKind.Comma)) {
                typeVars.push(this.expect(TokenKind.TypeVar).value);
            }
            this.expect(TokenKind.Dot);
            const body = this.parseImplication();
            return { kind: AstKind.Quantified, typeVars, body };
        }
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
            return { kind: AstKind.Negation, body: this.parseNegation() };
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
            return this.parseTypeVar();
        }
        const tok = this.lexer.peek();
        throw new ParseError(
            `Unexpected token type: ${tokenKindToString(tok?.kind)}`,
            tok?.location ?? this.lexer.location,
        );
    }

    parseTypeVar(): TypeVar {
        const { value } = this.expect(TokenKind.TypeVar);
        const args: string[] = [];
        if (this.nextIs(TokenKind.LFlatBracket)) {
            const tok = this.expect(TokenKind.LFlatBracket);
            if (!inSystemFMode) {
                throw new ParseError(
                    `Unexpected token type: ${tokenKindToString(tok?.kind)}`,
                    tok?.location ?? this.lexer.location,
                );
            }
            args.push(this.expect(TokenKind.TypeVar).value);
            while (this.chompIfNextIs(TokenKind.Comma)) {
                args.push(this.expect(TokenKind.TypeVar).value);
            }
            this.expect(TokenKind.RFlatBracket);
        }
        return { kind: AstKind.TypeVar, name: value, args };
    }
}
