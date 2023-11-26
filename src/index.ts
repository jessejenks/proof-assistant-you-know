import * as fs from "fs";
import * as ts from "typescript";
import { Timer } from "./utils";
import { statementsToFile, fileToString, compile, diagnosticsToString } from "./compilationUtils";
import { Parser } from "./parser/parser";
import {
    createTrueType,
    createFalseType,
    createAndDeclaration,
    createOrDeclaration,
    createImplDeclaration,
    createNotDeclaration,
    createTrueTheorem,
    createAndIntro,
    createAndElimLeft,
    createAndElimRight,
    createOrIntroLeft,
    createOrIntroRight,
    createOrElim,
    createModusPonens,
    createModusTollens,
    createExact,
} from "./primitives";
import { toStatements } from "./astToTs";
import { Lexer } from "./parser/lexer";
import { prettyPrint } from "./prettyPrint";

let start: [number, number];

const sourceText = fs.readFileSync(process.argv[2], { encoding: "utf-8" });

console.log(
    sourceText
        .split("\n")
        .map((line, i) => `${String(i + 1).padStart(2, " ")}: ${line}`)
        .join("\n"),
);

start = Timer.start();
console.log("Initializing parser");
const parser = new Parser(new Lexer(sourceText));
Timer.elapsed(start);

start = Timer.start();
console.log("Begin parsing");
const parsed = parser.parse();
Timer.elapsed(start);

start = Timer.start();
console.log("Begin formatting");
const recreated = prettyPrint(parsed);
Timer.elapsed(start);
console.log(
    recreated
        .split("\n")
        .map((line, i) => `${String(i + 1).padStart(2, " ")}: ${line}`)
        .join("\n"),
);

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
        createTrueTheorem(),
        createAndIntro(),
        createAndElimLeft(),
        createAndElimRight(),
        createOrIntroLeft(),
        createOrIntroRight(),
        createOrElim(),
        createModusPonens(),
        createModusTollens(),
        createExact(),
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
