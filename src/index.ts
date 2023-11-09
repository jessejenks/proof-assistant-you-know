import * as fs from "fs";
import { statementsToFile, fileToString, compile, diagnosticsToString } from "./compilationUtils";
import { Timer } from "./utils";
import {
    createTrue,
    createFalse,
    createAndDeclaration,
    createOrDeclaration,
    createImplDeclaration,
    createEquivDeclaration,
    createNotDeclaration,
    createAndIntro,
    createAndElimLeft,
    createAndElimRight,
    createModusPonens,
} from "./primitives";
import { Lexer } from "./parser/lexer";
import { Parser } from "./parser/parser";
import { PrettyPrinter } from "./parser/visitor";
import { AstToTs } from "./astToTs";

let start: [number, number];

const sourceText = fs.readFileSync(process.argv[2], { encoding: "utf-8" });

// const sourceText = `
// theorem P => P;
// _ by [
//     assume p: P;
//     _ by p;
// ];
// // comment
// // theorem ((P => Q) & (P => R)) => (P => Q & R);
// // assume h: ((P => Q) & (P => R));
// // pToQ: (P => Q) by andElimLeft h;
// // pToR: (P => R) by andElimRight h;
// // _ by [
// //     assume p: P;
// //     q: Q by modusPonens pToQ p;
// //     r: R by modusPonens pToR p;
// //     _: Q & R by andIntro q r;
// // ];`;
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
const recreated = new PrettyPrinter().visit(parsed);
Timer.elapsed(start);
console.log(
    recreated
        .split("\n")
        .map((line, i) => `${String(i + 1).padStart(2, " ")}: ${line}`)
        .join("\n"),
);

console.log("Initializing...");
start = Timer.start();
const astToTs = new AstToTs();
Timer.elapsed(start);

console.log("Transforming...");
start = Timer.start();
const transformed = parsed.proofs.map(astToTs.visitProof);
Timer.elapsed(start);

console.log("generating...");
start = Timer.start();
const sourceFile = statementsToFile([
    createTrue(),
    createFalse(),
    createAndDeclaration(),
    createOrDeclaration(),
    createImplDeclaration(),
    createEquivDeclaration(),
    createNotDeclaration(),
    createAndIntro(),
    createAndElimLeft(),
    createAndElimRight(),
    createModusPonens(),
    ...transformed,
]);
const text = fileToString(sourceFile);
Timer.elapsed(start);
// console.log(
//     text
//         .split("\n")
//         .map((line, i) => `${String(i + 1).padStart(3, " ")} ${line}`)
//         .join("\n"),
// );
console.log(text);
console.log("compiling...");
start = Timer.start();
const result = compile(text);
Timer.elapsed(start);
switch (result.kind) {
    case "ok":
        console.log("Success!");
        break;
    case "error":
        console.log(diagnosticsToString(result.error));
        break;
}
