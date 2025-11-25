import * as ts from "typescript";
import { Unit, Result } from "./utils";

export const statementsToFile = (statements: ts.Statement[]): ts.SourceFile =>
    ts.factory.createSourceFile(statements, ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);

export const fileToString = (sourceFile: ts.SourceFile): string =>
    ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(sourceFile);

export const diagnosticsToString = (diagnostics: readonly ts.Diagnostic[]): string =>
    ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (x) => x,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
    });

const getCompilerOptions = (): ts.CompilerOptions => ({
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictPropertyInitialization: true,
    strictBindCallApply: true,
    noImplicitThis: true,
    noImplicitReturns: true,
    noUncheckedIndexedAccess: false,
    useDefineForClassFields: false,
    alwaysStrict: true,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    downlevelIteration: false,
    noEmitHelpers: false,
    noLib: false,
    noStrictGenericChecks: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    preserveConstEnums: false,
    removeComments: false,
    skipLibCheck: false,
    checkJs: false,
    allowJs: false,
    importHelpers: false,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    moduleResolution: undefined,
    target: ts.ScriptTarget.ES2017,
    jsx: ts.JsxEmit.None,
    module: ts.ModuleKind.None,
    esModuleInterop: false,
    declaration: false,
    suppressOutputPathCheck: true,
    allowNonTsExtensions: true,
    listEmittedFiles: true,
});

export const compile = (sourceText: string): Result<Unit, readonly ts.Diagnostic[]> => {
    const sourceFile = ts.createSourceFile("At ", sourceText, ts.ScriptTarget.ES2017, false, ts.ScriptKind.TS);
    const options: ts.CompilerOptions = getCompilerOptions();
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
