/*
Document    := Proof+
Proof       := "theorem" "[" ((identifier ":" "Expression" ("," identifier ":" Expression)*)?)? "]" Expression ";" Statement+
Statement   := Assumption | Step
Assumption  := "assume" identifier ":" Expression "[" Statement+ "]" ";"
Step        := identifier (":" Expression)? "by" identifier+ ";"
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
    Step,
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
    [AstKind.Step]: "Step",
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
    hypotheses: [Identifier, Expression][];
    expression: Expression;
    justifications: Statement[];
};

export type Statement = Assumption | Step;
export type Assumption = {
    kind: AstKind.Assumption;
    name: Identifier;
    value: Expression;
    subproof: Statement[];
};
export type Step = {
    kind: AstKind.Step;
    name: Identifier;
    value: Expression | null;
    justifications: Identifier[];
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
            )} at ${locationToString(tok?.location || this.lexer.location)}`,
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
        // Proof       := "theorem" "[" ((identifier ":" "Expression" ("," identifier ":" Expression)*)?)? "]" Expression ";" Statement+
        this.expect(TokenKind.TheoremKeyword);
        const hypotheses: [Identifier, Expression][] = [];
        if (this.chompIfNextIs(TokenKind.LFlatBracket)) {
            if (this.chompIfNextIs(TokenKind.RFlatBracket)) {
            } else {
            let param = makeId(this.expect(TokenKind.Identifier));
            this.expect(TokenKind.Colon);
            let value = this.parseExpression();
            hypotheses.push([param, value]);
            while (this.chompIfNextIs(TokenKind.Comma)) {
                param = makeId(this.expect(TokenKind.Identifier));
                this.expect(TokenKind.Colon);
                value = this.parseExpression();
                hypotheses.push([param, value]);
            }
            this.expect(TokenKind.RFlatBracket);
            }
        }
        const expression = this.parseExpression();
        this.expect(TokenKind.Semi);
        const justifications: Statement[] = [this.parseStatement()];
        while (!this.lexer.eof() && (this.nextIs(TokenKind.Identifier) || this.nextIs(TokenKind.AssumeKeyword))) {
            justifications.push(this.parseStatement());
        }
        return { kind: AstKind.Proof, hypotheses, expression, justifications };
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
        // Assumption  := "assume" identifier ":" Expression "[" Statement+ "]" ";"
        this.expect(TokenKind.AssumeKeyword);
        const name = makeId(this.expect(TokenKind.Identifier));
        this.expect(TokenKind.Colon);
        const value = this.parseExpression();
        this.expect(TokenKind.LFlatBracket);
        const statements = [this.parseStatement()];
        while (!this.nextIs(TokenKind.RFlatBracket)) {
            statements.push(this.parseStatement());
        }
        this.expect(TokenKind.RFlatBracket);
        this.expect(TokenKind.Semi);
        return { kind: AstKind.Assumption, name, value, subproof: statements };
    }

    parseStep(): Step {
        // Step        := identifier (":" Expression)? "by" identifier+ ";"
        const name = makeId(this.expect(TokenKind.Identifier));
        let value: Expression | null = null;
        if (this.chompIfNextIs(TokenKind.Colon)) {
            value = this.parseExpression();
        }
        this.expect(TokenKind.ByKeyword);
        const identifiers = [this.expect(TokenKind.Identifier)];
        while (!this.nextIs(TokenKind.Semi)) {
            identifiers.push(this.expect(TokenKind.Identifier));
        }
        this.expect(TokenKind.Semi);
        return {
            kind: AstKind.Step,
            name,
            value,
            justifications: identifiers.map(makeId),
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
