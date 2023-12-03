import * as fs from "fs";
import * as ts from "typescript";
import { Timer } from "./utils";
import { statementsToFile, fileToString, compile, diagnosticsToString } from "./compilationUtils";
import { Parser, ParseError, Document } from "./parser/parser";
import {
    createTrueType,
    createFalseType,
    createAndDeclaration,
    createOrDeclaration,
    createImplDeclaration,
    createNotDeclaration,
    createTrueIntro,
    createFalseElim,
    createAndIntro,
    createAndElimLeft,
    createAndElimRight,
    createOrIntroLeft,
    createOrIntroRight,
    createImplElim,
    createOrElim,
    createId,
    createTrueTrueIntroAlias,
    createExFalsoFalseElimAlias,
    createAbsurdFalseElimAlias,
    createModusPonensImplElimAlias,
    createExactIdAlias,
    createModusTollens,
    createNotElim,
} from "./primitives";
import { toStatements } from "./astToTs";
import { Lexer, Location } from "./parser/lexer";

let start: [number, number];

const sourceText = fs.readFileSync(process.argv[2], { encoding: "utf-8" });

// console.log(
//     sourceText
//         .split("\n")
//         .map((line, i) => `${String(i + 1).padStart(2, " ")}: ${line}`)
//         .join("\n"),
// );

const errorLine = (source: string, location: Location) => {
    const line = source.split("\n")[location.line - 1];
    const column = new Array(location.column).fill(" ");
    column[column.length - 1] = "^";
    return `${line}\n${column.join("")}`;
};

start = Timer.start();
console.log("Initializing parser");
const parser = new Parser(new Lexer(sourceText));
Timer.elapsed(start);

start = Timer.start();
console.log("Begin parsing");
let parsed: Document;
try {
    parsed = parser.parse();
} catch (e: unknown) {
    // if (e instanceof Error && e.name === "ParseError") {
    //     console.log(e.message);
    //     console.log(errorLine(sourceText, e.location));
    //     process.exit(1);
    // }
    if (e instanceof ParseError) {
        console.log(e.toString());
        console.log(errorLine(sourceText, e.location));
        process.exit(1);
    } else {
        throw e;
    }
}
Timer.elapsed(start);

// start = Timer.start();
// console.log("Begin formatting");
// const recreated = prettyPrint(parsed);
// Timer.elapsed(start);
// console.log(
//     recreated
//         .split("\n")
//         .map((line, i) => `${String(i + 1).padStart(2, " ")}: ${line}`)
//         .join("\n"),
// );

console.log("Transforming...");
start = Timer.start();
const statements = toStatements(parsed);
Timer.elapsed(start);

console.log("generating...");
start = Timer.start();

const text = fileToString(
    statementsToFile([
        createTrueType(),
        createFalseType(),
        createAndDeclaration(),
        createOrDeclaration(),
        createImplDeclaration(),
        createNotDeclaration(),
        createTrueIntro(),
        createFalseElim(),
        createAndIntro(),
        createAndElimLeft(),
        createAndElimRight(),
        createOrIntroLeft(),
        createOrIntroRight(),
        createImplElim(),
        createOrElim(),
        createId(),
        createTrueTrueIntroAlias(),
        createExFalsoFalseElimAlias(),
        createAbsurdFalseElimAlias(),
        createModusPonensImplElimAlias(),
        createExactIdAlias(),
        createModusTollens(),
        createNotElim(),
        ...statements,
    ]),
);
console.log("---");
console.log(
    text
        .split("\n")
        .map((line, i) => `${String(i + 1).padStart(3, " ")} ${line}`)
        .join("\n"),
);

console.log(`Compiling with ts ${ts.version}`);
const result = compile(text);
switch (result.kind) {
    case "ok":
        console.log("Success!");
        break;
    case "error":
        console.log(diagnosticsToString(result.error));
        break;
}
