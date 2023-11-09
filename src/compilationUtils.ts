import * as ts from "typescript";
import { Unit, Result } from "./utils";

// export const fileToString = (sourceFile: ts.SourceFile): string =>
//     ts
//         .createPrinter({ newLine: ts.NewLineKind.LineFeed })
//         .printNode(
//             ts.EmitHint.Unspecified,
//             sourceFile,
//             ts.createSourceFile("output.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS),
//         );

export const statementsToFile = (statements: ts.Statement[]): ts.SourceFile =>
    ts.factory.createSourceFile(statements, ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);

export const fileToString = (sourceFile: ts.SourceFile): string =>
    ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(sourceFile);

// export const diagnosticsToString = (diagnostics: readonly ts.Diagnostic[]) => ts.formatDiagnostics(diagnostics, {
//     getCanonicalFileName: x => x,
//     getCurrentDirectory: () => "",
//     getNewLine: () => "\n",
// });

const getDiagnosticeLine = (
    text: string,
    sourceFile: ts.SourceFile,
    lineStarts: readonly number[],
    diagnostic: ts.Diagnostic,
): string => {
    if (diagnostic.start) {
        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
        const start = lineStarts[lineAndChar.line];
        const stop = lineAndChar.line === lineStarts.length ? undefined : lineStarts[lineAndChar.line + 1] - 1;
        const line = text.slice(start, stop);
        console.log(line);
        const underline = new Array(line.length).fill(" ");
        underline[diagnostic.start - start] = "^";
        return underline.join("");
    }
    return "";
};

export const diagnosticsToString = (diagnostics: readonly ts.Diagnostic[]): string =>
    ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (x) => x,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
    });

// export const diagnosticsToString = (text: string, sourceFile: ts.SourceFile, diagnostics: readonly ts.Diagnostic[]): string => {
//     const host: ts.FormatDiagnosticsHost = {
//         getCanonicalFileName: x => x,
//         getCurrentDirectory: () => "",
//         getNewLine: () => "\n",
//     }
//     const lineStarts = sourceFile.getLineStarts();
//     return diagnostics.map(diagnostic => (
//         `${ts.formatDiagnostic(diagnostic, host)}\n${getDiagnosticeLine(text, sourceFile, lineStarts, diagnostic)}`
//     )).join("\n")
//     // ts.formatDiagnostics(diagnostics, host);
//     // return "";
// }

export const compile = (sourceText: string): Result<Unit, readonly ts.Diagnostic[]> => {
    const sourceFile = ts.createSourceFile("module.ts", sourceText, ts.ScriptTarget.ES2015, false, ts.ScriptKind.TS);
    const options: ts.CompilerOptions = {
        jsx: ts.JsxEmit.None,
        suppressOutputPathCheck: true,
        allowNonTsExtensions: true,
        listEmittedFiles: true,
    };
    const host: ts.CompilerHost = {
        getSourceFile: (filename) => (filename == sourceFile.fileName ? sourceFile : undefined),
        writeFile: (name) => {
            throw new Error(`Unexpected write to file: ${name}`);
        },
        getDefaultLibFileName: () => "",
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName) => fileName === sourceFile.fileName,
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => [],
    };
    const program = ts.createProgram([sourceFile.fileName], options, host);
    const diagnostics = program.getSemanticDiagnostics(sourceFile);
    if (diagnostics.length > 0) {
        return Result.error(diagnostics);
    } else {
        return Result.ok(Unit.unit());
    }
};
