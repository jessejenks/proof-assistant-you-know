import * as fs from "fs";
import * as ts from "typescript";
import { Timer, Logger } from "./utils/utils";
import { statementsToFile, fileToString, compile, diagnosticsToString } from "./utils/compilationUtils";
import { Parser, ParseError } from "./parser/parser";
import {
    createTrueType,
    createFalseType,
    createAndDeclaration,
    createOrDeclaration,
    createImplDeclaration,
    createNotDeclaration,
    primitiveNames,
    primitiveToConstructor,
    primitiveAliases,
} from "./utils/primitives";
import { LexError, Lexer, Location, Token, TokenKind, locationToString, tokenKindToString } from "./parser/lexer";
import { PretterPrinter } from "./visitors/prettyPrint";
import { SExpVisitor } from "./visitors/sexp";
import { Transformer } from "./visitors/transform";

function help() {
    console.log("Usage");
    console.log("  lex <path>");
    console.log("    print tokens in file");
    console.log("  ast <path>");
    console.log("    print ast as s-expression");
    console.log("  fmt <path>");
    console.log("    format file");
    console.log("  transform <path>");
    console.log("    show code translated to TS");
    console.log("  check <path>");
    console.log("    run full typecheck");
    console.log("set environment variable");
    console.log("  LOGLEVEL={1,2,3,4} to set log level to ERROR, WARN, INFO, or DEBUG. Default is INFO");
}

const errorLine = (source: string, location: Location) => {
    return source.split("\n")[location.line - 1];
};

function lex(path: string) {
    const sourceText = fs.readFileSync(path, { encoding: "utf-8" });
    let start = Timer.start("Initializing lexer");
    const lexer = new Lexer(sourceText);
    Timer.elapsed(start);

    start = Timer.start("Begin lexing");
    let tok: Token | null;

    try {
        while (!lexer.eof()) {
            tok = lexer.next();
            switch (tok.kind) {
                case TokenKind.EOF:
                    console.log("".padEnd(10), TokenKind[tok.kind].padEnd(15));
                    break;
                case TokenKind.Comment:
                case TokenKind.LParen:
                case TokenKind.RParen:
                case TokenKind.LFlatBracket:
                case TokenKind.RFlatBracket:
                case TokenKind.LBrace:
                case TokenKind.RBrace:
                case TokenKind.Implies:
                case TokenKind.Colon:
                case TokenKind.Comma:
                case TokenKind.And:
                case TokenKind.Or:
                case TokenKind.Not:
                case TokenKind.AssumeKeyword:
                case TokenKind.ByKeyword:
                case TokenKind.HaveKeyword:
                case TokenKind.TheoremKeyword:
                    console.log(
                        locationToString(tok.location).padEnd(10),
                        TokenKind[tok.kind].padEnd(15),
                        `"${tokenKindToString(tok.kind)}"`,
                    );
                    break;
                case TokenKind.TypeVar:
                case TokenKind.Identifier:
                    console.log(
                        locationToString(tok.location).padEnd(10),
                        TokenKind[tok.kind].padEnd(15),
                        `"${tok.value}"`,
                    );
                    break;
            }
        }
    } catch (e) {
        if (e instanceof LexError) {
            Logger.error(e.toString());
            Logger.error(errorLine(sourceText, e.location));
            Logger.error("^".padStart(e.location.column));
            process.exit(1);
        } else {
            throw e;
        }
    }
    Timer.elapsed(start);
}

function parseFile(path: string) {
    const sourceText = fs.readFileSync(path, { encoding: "utf-8" });
    let start = Timer.start("Initializing parser");
    const parser = new Parser(new Lexer(sourceText));
    Timer.elapsed(start);

    start = Timer.start("Begin parsing");
    try {
        const document = parser.parse();
        Timer.elapsed(start);
        return document;
    } catch (e) {
        if (e instanceof ParseError || e instanceof LexError) {
            Logger.error(e.toString());
            Logger.error(errorLine(sourceText, e.location));
            Logger.error("^".padStart(e.location.column));
            process.exit(1);
        } else {
            throw e;
        }
    }
}

function ast(path: string) {
    const parsed = parseFile(path);
    const start = Timer.start("Begin formatting");
    const visitor = new SExpVisitor(false, 2);
    visitor.visitDocument(parsed);
    const recreated = visitor.getDocument();
    Timer.elapsed(start);

    console.log(recreated);
}

function format(path: string) {
    const parsed = parseFile(path);
    const start = Timer.start("Begin formatting");
    const visitor = new PretterPrinter(false, 4);
    visitor.visitDocument(parsed);
    const recreated = visitor.getDocument();
    Timer.elapsed(start);

    console.log(recreated);
}

function baseTransform(path: string) {
    const parsed = parseFile(path);
    const start = Timer.start("Begin transform");
    const transformer = new Transformer();
    const statements = transformer.visitDocument(parsed);
    Timer.elapsed(start);

    const fullStatements: ts.Statement[] = [
        createTrueType(),
        createFalseType(),
        createAndDeclaration(),
        createOrDeclaration(),
        createImplDeclaration(),
        createNotDeclaration(),
    ];
    for (let i = 0; i < primitiveNames.length; i++) {
        if (transformer.usedPrimitive(primitiveNames[i])) {
            fullStatements.push(primitiveToConstructor[primitiveNames[i]]());
        }
    }
    for (let i = 0; i < primitiveAliases.length; i++) {
        if (transformer.usedPrimitiveAlias(primitiveAliases[i])) {
            fullStatements.push(primitiveToConstructor[primitiveAliases[i]]());
        }
    }
    fullStatements.push(...statements);

    return fileToString(statementsToFile(fullStatements));
}

function transform(path: string) {
    console.log(baseTransform(path));
}

function check(path: string) {
    const text = baseTransform(path);
    Logger.debug(`Compiling with ts ${ts.version}`);
    const result = compile(text);
    switch (result.kind) {
        case "ok":
            Logger.info("Success!");
            break;
        case "error":
            Logger.error(diagnosticsToString(result.error));
            break;
    }
}

function main(args: string[]) {
    switch (args[0]) {
        case undefined:
            help();
            process.exit(1);
        case "lex":
            if (args.length < 2) {
                Logger.error("No path provided");
                help();
                process.exit(1);
            }
            lex(args[1]);
            break;
        case "ast":
            if (args.length < 2) {
                Logger.error("No path provided");
                help();
                process.exit(1);
            }
            ast(args[1]);
            break;
        case "fmt":
            if (args.length < 2) {
                Logger.error("No path provided");
                help();
                process.exit(1);
            }
            format(args[1]);
            break;
        case "transform":
            if (args.length < 2) {
                Logger.error("No path provided");
                help();
                process.exit(1);
            }
            transform(args[1]);
            break;
        case "check":
            if (args.length < 2) {
                Logger.error("No path provided");
                help();
                process.exit(1);
            }
            check(args[1]);
            break;
        default:
            help();
            process.exit(1);
    }
}

main(process.argv.slice(2));
