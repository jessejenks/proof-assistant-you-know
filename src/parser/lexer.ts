export enum TokenKind {
    Comment,
    LParen,
    RParen,
    LFlatBracket,
    RFlatBracket,
    LBrace,
    RBrace,
    Implies,
    Colon,
    Comma,
    And,
    Or,
    Not,
    TypeVar,
    Identifier,
    AssumeKeyword,
    ByKeyword,
    HaveKeyword,
    TheoremKeyword,
}

const KIND_TO_NAME: Record<TokenKind, string> = {
    [TokenKind.Comment]: "Comment",
    [TokenKind.LParen]: "(",
    [TokenKind.RParen]: ")",
    [TokenKind.LFlatBracket]: "[",
    [TokenKind.RFlatBracket]: "]",
    [TokenKind.LBrace]: "{",
    [TokenKind.RBrace]: "}",
    [TokenKind.Implies]: "=>",
    [TokenKind.Colon]: ":",
    [TokenKind.Comma]: ",",
    [TokenKind.And]: "&",
    [TokenKind.Or]: "|",
    [TokenKind.Not]: "~",
    [TokenKind.TypeVar]: "Type Variable",
    [TokenKind.Identifier]: "Identifier",
    [TokenKind.AssumeKeyword]: "assume",
    [TokenKind.ByKeyword]: "by",
    [TokenKind.HaveKeyword]: "have",
    [TokenKind.TheoremKeyword]: "theorem",
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
    | { kind: TokenKind.LBrace; location: Location }
    | { kind: TokenKind.RBrace; location: Location }
    | { kind: TokenKind.Implies; location: Location }
    | { kind: TokenKind.Colon; location: Location }
    | { kind: TokenKind.Comma; location: Location }
    | { kind: TokenKind.And; location: Location }
    | { kind: TokenKind.Or; location: Location }
    | { kind: TokenKind.Not; location: Location }
    | { kind: TokenKind.TypeVar; value: string; location: Location }
    | { kind: TokenKind.Identifier; value: string; location: Location }
    | { kind: TokenKind.AssumeKeyword; location: Location }
    | { kind: TokenKind.ByKeyword; location: Location }
    | { kind: TokenKind.HaveKeyword; location: Location }
    | { kind: TokenKind.TheoremKeyword; location: Location };

const TYPEVAR_START = /[A-Z]/;
const TYPEVAR = /[a-zA-Z]/;

const IDENTIFIER_START = /[a-z]/;
const IDENTIFIER = /[a-zA-Z0-9_]/;

const KEYWORDS = {
    assume: TokenKind.AssumeKeyword,
    by: TokenKind.ByKeyword,
    have: TokenKind.HaveKeyword,
    theorem: TokenKind.TheoremKeyword,
};

export class Lexer {
    private input: string;
    private index: number;
    // both 1-indexed
    location: Location;
    private currentToken: Token | null;

    constructor(input?: string) {
        this.setInput(input === undefined ? "" : input);
    }

    setInput(input: string) {
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
        return this.readSymbol();
    }

    private getLocation(increment: boolean = true): Location {
        if (increment) {
            this.location.column++;
            this.index++;
        }
        return { ...this.location };
    }

    private readSymbol(): Token | null {
        while (!this.eof()) {
            switch (this.currentChar()) {
                case ",":
                    return { kind: TokenKind.Comma, location: this.getLocation() };
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
                case "{":
                    return { kind: TokenKind.LBrace, location: this.getLocation() };
                case "}":
                    return { kind: TokenKind.RBrace, location: this.getLocation() };
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
                case "/": {
                    if (this.nextChar() == "/") {
                        this.index += 2;
                        while (!this.eof() && this.currentChar() != "\n") {
                            this.location.column++;
                            this.index++;
                        }
                    }
                    break;
                }
                case "\n": {
                    this.location.column = 1;
                    this.location.line++;
                    this.index++;
                    break;
                }
                case "\t":
                case " ": {
                    this.index++;
                    this.location.column++;
                    break;
                }
                default: {
                    return this.readWord();
                }
            }
        }
        return null;
    }

    private readWord(): Token | null {
        const location = this.getLocation(false);
        const start = this.index;
        if (IDENTIFIER_START.test(this.currentChar())) {
            this.index++;
            while (!this.eof() && IDENTIFIER.test(this.currentChar())) {
                this.index++;
            }
            if (this.index > start) {
                const value = this.input.slice(start, this.index);
                if (value in KEYWORDS) {
                    return { kind: KEYWORDS[value], location };
                } else {
                    return { kind: TokenKind.Identifier, value, location };
                }
            }
        } else if (TYPEVAR_START.test(this.currentChar())) {
            this.index++;
            while (!this.eof() && TYPEVAR.test(this.currentChar())) {
                this.index++;
            }
            if (this.index > start) {
                const value = this.input.slice(start, this.index);
                return { kind: TokenKind.TypeVar, value, location };
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
