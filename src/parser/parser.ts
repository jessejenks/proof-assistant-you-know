/*
Document    := Proof+
Proof       := "theorem" Expression ";" Statement+
Statement   := Assumption | Step
Assumption  := "assume" identifier ":" Expression ";"
Step        := identifier (":" Expression)? "by" (identifier+ | "[" Statement+ "]") ";"
Expression  := Implication
Implication := Disjunction ("=>" Disjunction)*
Disjunction := Conjunction ("|" Conjunction)*
Conjunction := Negation ("&" Negation)*
Negation    := "~" Negation | Atom
Atom        := true | false | identifier | "(" Expr ")"
*/

import { TokenKind, Token, Lexer, tokenKindToString, locationToString } from "./lexer";

class ParseError extends Error {}

export enum AstKind {
    Document,
    Proof,
    Assumption,
    SimpleStep,
    SubproofStep,
    Implication,
    Disjunction,
    Conjunction,
    Negation,
    Identifier,
    True,
    False,
}

const KIND_TO_NAME: Record<AstKind, string> = {
    [AstKind.Document]: "Document",
    [AstKind.Proof]: "Proof",
    [AstKind.Assumption]: "Assumption",
    [AstKind.SimpleStep]: "SimpleStep",
    [AstKind.SubproofStep]: "SubproofStep",
    [AstKind.Implication]: "Implication",
    [AstKind.Disjunction]: "Disjunction",
    [AstKind.Conjunction]: "Conjunction",
    [AstKind.Negation]: "Negation",
    [AstKind.Identifier]: "Identifier",
    [AstKind.True]: "True",
    [AstKind.False]: "False",
};

export const astKindToString = (astKind: AstKind | null | undefined): string =>
    astKind === null || astKind === undefined ? "?" : KIND_TO_NAME[astKind];

export type Ast = Document | Proof | Statement | Expression;
export type Document = {
    kind: AstKind.Document;
    proofs: Proof[];
};
export type Proof = {
    kind: AstKind.Proof;
    statement: Expression;
    justifications: Statement[];
};

export type Statement = Assumption | Step;
export type Assumption = {
    kind: AstKind.Assumption;
    name: Identifier;
    value: Expression;
};
export type Step = SimpleStep | SubproofStep;
export type SimpleStep = {
    kind: AstKind.SimpleStep;
    name: Identifier;
    value: Expression | null;
    justifications: Identifier[];
};
export type SubproofStep = {
    kind: AstKind.SubproofStep;
    name: Identifier;
    value: Expression | null;
    justifications: Statement[];
};

export type Expression = True | False | Identifier | Negation | Conjunction | Disjunction | Implication;
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
export type True = { kind: AstKind.True };
export type False = { kind: AstKind.False };

const makeId = (id: { kind: TokenKind.Identifier; value: string }): Identifier => ({
    kind: AstKind.Identifier,
    name: id.value,
});

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
            )} at ${locationToString(tok?.location)}`,
        );
    }
    parse(): Document {
        // Document    := Proof+
        const proofs = [this.parseProof()];
        while (!this.lexer.eof() && this.nextIs(TokenKind.TheoremKeyword)) {
            proofs.push(this.parseProof());
        }
        return { kind: AstKind.Document, proofs };
    }
    parseProof(): Proof {
        // Proof       := "theorem" Expression ";" Statement+
        this.expect(TokenKind.TheoremKeyword);
        const statement = this.parseExpression();
        this.expect(TokenKind.Semi);
        const justifications: Statement[] = [this.parseStatement()];
        while (!this.lexer.eof() && this.nextIs(TokenKind.Identifier)) {
            justifications.push(this.parseStatement());
        }
        return { kind: AstKind.Proof, statement, justifications };
    }
    parseStatement(): Statement {
        // Statement   := Assumption | Step
        if (this.nextIs(TokenKind.AssumeKeyword)) {
            return this.parseAssumption();
        } else {
            return this.parseStep();
        }
    }
    parseAssumption(): Assumption {
        // Assumption  := "assume" identifier ":" Expression ";"
        this.expect(TokenKind.AssumeKeyword);
        const name = this.expect(TokenKind.Identifier);
        this.expect(TokenKind.Colon);
        const value = this.parseExpression();
        this.expect(TokenKind.Semi);
        return { kind: AstKind.Assumption, name: makeId(name), value };
    }

    parseStep(): Step {
        // Step        := identifier (":" Expression)? "by" (identifier+ | "[" Statement+ "]") ";"
        const name = this.expect(TokenKind.Identifier);
        let value: Expression | null = null;
        if (this.chompIfNextIs(TokenKind.Colon)) {
            value = this.parseExpression();
        }
        this.expect(TokenKind.ByKeyword);
        if (this.chompIfNextIs(TokenKind.LFlatBracket)) {
            return this.parseSubproofStep(makeId(name), value);
        } else {
            return this.parseSimpleStep(makeId(name), value);
        }
    }

    private parseSimpleStep(name: Identifier, value: Expression | null): SimpleStep {
        const identifiers = [this.expect(TokenKind.Identifier)];
        while (!this.nextIs(TokenKind.Semi)) {
            identifiers.push(this.expect(TokenKind.Identifier));
        }
        this.expect(TokenKind.Semi);
        return {
            kind: AstKind.SimpleStep,
            name,
            value,
            justifications: identifiers.map(makeId),
        };
    }

    private parseSubproofStep(name: Identifier, value: Expression | null): SubproofStep {
        const statements = [this.parseStatement()];
        while (!this.nextIs(TokenKind.RFlatBracket)) {
            statements.push(this.parseStatement());
        }
        this.expect(TokenKind.RFlatBracket);
        this.expect(TokenKind.Semi);
        return {
            kind: AstKind.SubproofStep,
            name,
            value,
            justifications: statements,
        };
    }

    parseExpression(): Expression {
        // Expression  := Implication
        return this.parseImplication();
    }

    parseImplication(): Expression {
        // Implication := Disjunction ("=>" Disjunction)*

        const terms = [this.parseDisjunction()];
        while (this.chompIfNextIs(TokenKind.Implies)) {
            terms.push(this.parseDisjunction());
        }
        // => is right associating
        return terms.reduceRight((prev, curr) => ({ kind: AstKind.Implication, left: curr, right: prev }));
    }

    parseDisjunction(): Expression {
        // Disjunction := Conjunction ("|" Conjunction)*
        let left = this.parseConjunction();
        while (this.chompIfNextIs(TokenKind.Or)) {
            left = {
                kind: AstKind.Disjunction,
                left,
                right: this.parseConjunction(),
            };
        }
        return left;
    }

    parseConjunction(): Expression {
        // Conjunction := Negation ("&" Negation)*
        let left = this.parseNegation();
        while (this.chompIfNextIs(TokenKind.And)) {
            left = {
                kind: AstKind.Conjunction,
                left,
                right: this.parseConjunction(),
            };
        }
        return left;
    }

    parseNegation(): Expression {
        // Negation    := "~" Negation | Atom
        if (this.chompIfNextIs(TokenKind.Not)) {
            return { kind: AstKind.Negation, value: this.parseNegation() };
        }
        return this.parseAtom();
    }

    parseAtom(): Expression {
        // Atom        := true | false | identifier | "(" Expr ")"
        if (this.chompIfNextIs(TokenKind.LParen)) {
            const expr = this.parseExpression();
            this.expect(TokenKind.RParen);
            return expr;
        } else if (this.chompIfNextIs(TokenKind.True)) {
            return { kind: AstKind.True };
        } else if (this.chompIfNextIs(TokenKind.False)) {
            return { kind: AstKind.False };
        } else if (this.nextIs(TokenKind.Identifier)) {
            const { value } = this.expect(TokenKind.Identifier);
            return { kind: AstKind.Identifier, name: value };
        }
        throw new ParseError(`Unexpected token type: ${tokenKindToString(this.lexer.peek()?.kind)}`);
    }
}
