export enum TokenKind {
    Comment,
    LParen,
    RParen,
    LFlatBracket,
    RFlatBracket,
    Implies,
    Colon,
    Semi,
    And,
    Or,
    Not,
    True,
    False,
    Identifier,
    AssumeKeyword,
    ByKeyword,
    TheoremKeyword,
}

const KIND_TO_NAME: Record<TokenKind, string> = {
    [TokenKind.Comment]: "Comment",
    [TokenKind.LParen]: "LParen",
    [TokenKind.RParen]: "RParen",
    [TokenKind.LFlatBracket]: "LFlatBracket",
    [TokenKind.RFlatBracket]: "RFlatBracket",
    [TokenKind.Implies]: "Implies",
    [TokenKind.Colon]: "Colon",
    [TokenKind.Semi]: "Semi",
    [TokenKind.And]: "And",
    [TokenKind.Or]: "Or",
    [TokenKind.Not]: "Not",
    [TokenKind.True]: "True",
    [TokenKind.False]: "False",
    [TokenKind.Identifier]: "Identifier",
    [TokenKind.AssumeKeyword]: "AssumeKeyword",
    [TokenKind.ByKeyword]: "ByKeyword",
    [TokenKind.TheoremKeyword]: "TheoremKeyword",
};

export const tokenKindToString = (tokenKind: TokenKind | null | undefined): string =>
    tokenKind === null || tokenKind === undefined ? "?" : KIND_TO_NAME[tokenKind];

export type Location = { line: number; column: number };

export const locationToString = (loc: Location | undefined): string =>
    loc === undefined ? "[?, ?]" : `[${loc.line}, ${loc.column}]`;

export type Token =
    | { kind: TokenKind.Comment; location: Location }
    | { kind: TokenKind.LParen; location: Location }
    | { kind: TokenKind.RParen; location: Location }
    | { kind: TokenKind.LFlatBracket; location: Location }
    | { kind: TokenKind.RFlatBracket; location: Location }
    | { kind: TokenKind.Implies; location: Location }
    | { kind: TokenKind.Colon; location: Location }
    | { kind: TokenKind.Semi; location: Location }
    | { kind: TokenKind.And; location: Location }
    | { kind: TokenKind.Or; location: Location }
    | { kind: TokenKind.Not; location: Location }
    | { kind: TokenKind.True; location: Location }
    | { kind: TokenKind.False; location: Location }
    | { kind: TokenKind.Identifier; value: string; location: Location }
    | { kind: TokenKind.AssumeKeyword; location: Location }
    | { kind: TokenKind.ByKeyword; location: Location }
    | { kind: TokenKind.TheoremKeyword; location: Location };

const WS = /\s/;
const IDENTIFIER = /[a-zA-Z_-]/;
const KEYWORDS_AND_LITERALS = {
    true: TokenKind.True,
    false: TokenKind.False,
    assume: TokenKind.AssumeKeyword,
    by: TokenKind.ByKeyword,
    theorem: TokenKind.TheoremKeyword,
};

export class Lexer {
    private input: string;
    private index: number;
    // both 1-indexed
    private location: Location;
    private currentToken: Token | null;

    constructor(input: string) {
        this.input = input;
        this.index = 0;
        this.location = { line: 1, column: 1 };
        this.currentToken = null;
    }

    next(): Token | null {
        const tok = this.peek();
        this.currentToken = null;
        return tok;
    }

    peek(): Token | null {
        if (this.currentToken === null) {
            this.currentToken = this.getNextToken();
        }
        return this.currentToken;
    }

    private getNextToken(): Token | null {
        this.skipWhiteSpace();
        this.skipComments();
        let tok: Token | null = null;
        tok = this.readSymbol();
        if (tok !== null) {
            this.skipWhiteSpace();
            this.skipComments();
            return tok;
        }
        tok = this.readWord();
        if (tok !== null) {
            this.skipWhiteSpace();
            this.skipComments();
            return tok;
        }

        return null;
    }

    private skipWhiteSpace() {
        let c: string;
        while (!this.eof() && WS.test((c = this.currentChar()))) {
            if (c === "\n") {
                this.location.line++;
                this.location.column = 1;
            } else {
                this.location.column++;
            }
            this.index++;
        }
    }

    private skipComments() {
        // TODO: Save these comments somewhere
        // line comments
        while (this.currentChar() === "/" && this.nextChar() === "/") {
            while (!this.eof() && this.currentChar() !== "\n") {
                this.location.column++;
                this.index++;
            }
            if (this.eof()) return;
            this.location.line++;
            this.location.column = 1;
            this.index++;
        }
    }

    private getLocation(increment: boolean = true): Location {
        if (increment) {
            this.location.column++;
            this.index++;
        }
        return { ...this.location };
    }

    private readSymbol(): Token | null {
        switch (this.currentChar()) {
            case ";":
                return { kind: TokenKind.Semi, location: this.getLocation() };
            case ":":
                return { kind: TokenKind.Colon, location: this.getLocation() };
            case "(":
                return { kind: TokenKind.LParen, location: this.getLocation() };
            case ")":
                return { kind: TokenKind.RParen, location: this.getLocation() };
            case "[":
                return { kind: TokenKind.LFlatBracket, location: this.getLocation() };
            case "]":
                return { kind: TokenKind.RFlatBracket, location: this.getLocation() };
            case "&":
                return { kind: TokenKind.And, location: this.getLocation() };
            case "=": {
                if (this.nextChar() == ">") {
                    this.location.column += 2;
                    this.index += 2;
                    return { kind: TokenKind.Implies, location: this.getLocation(false) };
                }
            }
            case "|":
                return { kind: TokenKind.Or, location: this.getLocation() };
            case "~":
                return { kind: TokenKind.Not, location: this.getLocation() };
            default:
                return null;
        }
    }

    private readWord(): Token | null {
        const location = this.getLocation(false);
        const start = this.index;
        while (!this.eof() && IDENTIFIER.test(this.currentChar())) {
            this.index++;
        }
        if (this.index > start) {
            const value = this.input.slice(start, this.index);
            if (value in KEYWORDS_AND_LITERALS) {
                return { kind: KEYWORDS_AND_LITERALS[value], location };
            } else {
                return { kind: TokenKind.Identifier, value, location };
            }
        }
        return null;
    }

    private currentChar() {
        return this.input.charAt(this.index);
    }

    private nextChar() {
        return this.input.charAt(this.index + 1);
    }

    eof(): boolean {
        return this.index >= this.input.length;
    }
}
