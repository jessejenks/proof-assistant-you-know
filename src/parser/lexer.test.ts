import { describe, it } from "node:test";
import * as assert from "node:assert";

import { LexError, Lexer, type Token, TokenKind } from "./lexer";

function testLexer(input: string, expectedTokenKinds: TokenKind[], withPeekTest = false) {
    const lexer = new Lexer(input);

    let i = 0;
    while (!lexer.eof()) {
        const expectedTokenKind = expectedTokenKinds[i];
        try {
            let nextToken: Token;

            if (withPeekTest) {
                const peekToken = lexer.peek();
                nextToken = lexer.next();
                assert(
                    peekToken.kind === nextToken.kind,
                    `peeked ${TokenKind[peekToken.kind]} != next ${TokenKind[nextToken.kind]}`,
                );
            } else {
                nextToken = lexer.next();
            }
            assert(
                nextToken.kind === expectedTokenKind,
                `${TokenKind[nextToken.kind]} != ${TokenKind[expectedTokenKind]}`,
            );
        } catch (e) {
            if (e instanceof LexError) {
                assert.fail(e.toString());
            }
            throw e;
        }
        i++;
    }
    return true;
}

describe("Lexer", () => {
    const testTable: [string, string, TokenKind[]][] = [
        ["empty input", "", [TokenKind.EOF]],
        ["empty ws input", "   \t  \n  \r  \r\n   ", [TokenKind.EOF]],
        [
            "empty ws input + comments",
            "   \t  \n  // comment comment\n // comment 2 \r  // comment 3 \r\n   \r  \r\n   ",
            [TokenKind.EOF],
        ],
        [
            "single character tokens",
            "()[]{}:,&|~",
            [
                TokenKind.LParen,
                TokenKind.RParen,
                TokenKind.LFlatBracket,
                TokenKind.RFlatBracket,
                TokenKind.LBrace,
                TokenKind.RBrace,
                TokenKind.Colon,
                TokenKind.Comma,
                TokenKind.And,
                TokenKind.Or,
                TokenKind.Not,
            ],
        ],
        ["two character tokens", "=>", [TokenKind.Implies]],
        [
            "keywords",
            "assume by have theorem",
            [TokenKind.AssumeKeyword, TokenKind.ByKeyword, TokenKind.HaveKeyword, TokenKind.TheoremKeyword],
        ],
        [
            "identifiers and type variables",
            "P Q R foo bar baz",
            [
                TokenKind.TypeVar,
                TokenKind.TypeVar,
                TokenKind.TypeVar,
                TokenKind.Identifier,
                TokenKind.Identifier,
                TokenKind.Identifier,
            ],
        ],
    ];

    for (let i = 0; i < testTable.length; i++) {
        const [name, input, expectedTokenKinds] = testTable[i];

        it(`(${i}) ${name}`, () => {
            testLexer(input, expectedTokenKinds, false);
        });

        it(`(${i}) ${name} with peek`, () => {
            testLexer(input, expectedTokenKinds, true);
        });
    }
});
