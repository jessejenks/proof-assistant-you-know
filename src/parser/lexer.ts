export enum TokenKind {
    EOF,
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
    [TokenKind.EOF]: "EOF",
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
    | { kind: TokenKind.EOF; location: Location }
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

const KEYWORDS = new Map<
    string,
    TokenKind.AssumeKeyword | TokenKind.ByKeyword | TokenKind.HaveKeyword | TokenKind.TheoremKeyword
>([
    ["assume", TokenKind.AssumeKeyword],
    ["by", TokenKind.ByKeyword],
    ["have", TokenKind.HaveKeyword],
    ["theorem", TokenKind.TheoremKeyword],
]);

export class LexError extends Error {
    location: Location;
    constructor(message: string, location: Location) {
        super(message);
        this.location = location;
        // hack to get instanceof check to work
        Object.setPrototypeOf(this, LexError.prototype);
    }

    toString() {
        return `${super.toString()} at ${locationToString(this.location)}`;
    }
}

export class Lexer {
    private input!: string;
    private index!: number;
    location!: Location;
    private currentIndex!: number;
    private currentToken!: Token | null;

    constructor(input: string = "") {
        this.setInput(input);
    }

    setInput(input: string) {
        this.input = input;
        this.index = 0;
        this.location = { line: 1, column: 1 };
        this.currentToken = null;
        this.currentIndex = 0;
        // initialize currentToken
        this.peek();
    }

    next(): Token {
        const tok = this.peek();
        this.currentToken = null;
        this.currentIndex = this.index;
        return tok;
    }

    peek(): Token {
        if (this.currentToken === null) {
            this.currentToken = this.getNextToken();
        }
        return this.currentToken;
    }

    private getLocation(increment: boolean = true): Location {
        if (increment) {
            this.location.column++;
            this.index++;
        }
        return { ...this.location };
    }

    private getNextToken(): Token {
        while (this.index < this.input.length) {
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
                        while (!this.eof() && this.currentChar() != "\r" && this.currentChar() != "\n") {
                            this.location.column++;
                            this.index++;
                        }
                    }
                    break;
                }
                // \r\n, \r, \n all treated as though \n
                case "\r": {
                    if (this.nextChar() === "\n") {
                        this.index++;
                    }
                    this.location.column = 1;
                    this.location.line++;
                    this.index++;
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
                default:
                    return this.readWord();
                }
            }
        if (this.index >= this.input.length) {
            // EOF is special. Don't have to consume token to update current index
            this.currentIndex = this.index;
            return { kind: TokenKind.EOF, location: this.getLocation(false) };
        }
        this.croak("Unknown symbol");
    }

    private readWord(): Token {
        const location = this.getLocation(false);
        const start = this.index;
        if (IDENTIFIER_START.test(this.currentChar())) {
            this.location.column++;
            this.index++;
            while (!this.eof() && IDENTIFIER.test(this.currentChar())) {
                this.location.column++;
                this.index++;
            }
            if (this.index > start) {
                const value = this.input.slice(start, this.index);
                if (KEYWORDS.has(value)) {
                    return { kind: KEYWORDS.get(value)!, location };
                } else {
                    return { kind: TokenKind.Identifier, value, location };
                }
            }
        } else if (TYPEVAR_START.test(this.currentChar())) {
            this.location.column++;
            this.index++;
            while (!this.eof() && TYPEVAR.test(this.currentChar())) {
                this.location.column++;
                this.index++;
            }
            if (this.index > start) {
                const value = this.input.slice(start, this.index);
                return { kind: TokenKind.TypeVar, value, location };
            }
        }
        this.croak("Unknown symbol");
    }

    private currentChar() {
        return this.input.charAt(this.index);
    }

    private nextChar() {
        return this.input.charAt(this.index + 1);
    }

    croak(msg: string): never {
        throw new LexError(msg, this.getLocation(false));
    }

    eof(): boolean {
        return this.currentIndex >= this.input.length;
    }
}
