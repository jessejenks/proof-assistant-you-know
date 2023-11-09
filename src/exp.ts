import * as ts from "typescript";

const printMessages = (
    msg: string | ts.DiagnosticMessageChain,
    depth: number = 0,
) => {
    if (typeof msg === "string") {
        console.log(depth, msg);
    } else {
        console.log(depth, msg.messageText);
        if (msg.next) {
            msg.next.forEach((msgChain) => printMessages(msgChain, depth + 1));
        }
    }
};

function runTypeCheck(input: string) {
    const options: ts.CompilerOptions = {
        jsx: ts.JsxEmit.None,
        suppressOutputPathCheck: true,
        allowNonTsExtensions: true,
        listEmittedFiles: true,
    };

    const inputFileName = "module.ts";
    const sourceFile = ts.createSourceFile(
        inputFileName,
        input,
        {
            languageVersion: ts.ScriptTarget.ESNext,
            impliedNodeFormat: ts.ModuleKind.ESNext,
        },
        undefined,
        ts.ScriptKind.TS,
    );

    const host: ts.CompilerHost = {
        getSourceFile: (filename) =>
            filename == inputFileName ? sourceFile : undefined,
        writeFile: (name) => {
            throw new Error(`Unexpected write to file: ${name}`);
        },
        getDefaultLibFileName: () => "lib.d.ts",
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName) => fileName === inputFileName,
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => [],
    };

    const program = ts.createProgram([inputFileName], options, host);
    const semanticDiagnostics = program.getSemanticDiagnostics();
    if (!semanticDiagnostics.length) {
        console.log("Success!");
    } else {
        const lineStarts = sourceFile.getLineStarts();
        semanticDiagnostics.forEach((diagnostic) => {
            printMessages(diagnostic.messageText);
            if (diagnostic.start) {
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(
                    diagnostic.start,
                );
                const start = lineStarts[lineAndChar.line];
                const stop =
                    lineAndChar.line === lineStarts.length
                        ? undefined
                        : lineStarts[lineAndChar.line + 1] - 1;
                const line = input.slice(start, stop);
                console.log(line);
                const underline = new Array(line.length).fill(" ");
                underline[diagnostic.start - start] = "^";
                console.log(underline.join(""));
            }
        });
    }
}

// const createCompilableSourceFile = (statements: readonly ts.Statement[]): ts.SourceFile => {
//     const sourceFile = ts.factory.createSourceFile(
//         statements,
//         ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
//         ts.NodeFlags.None,
//     );
//     sourceFile.typeReferenceDirectives = [];
//     sourceFile["parseDiagnostics"] = [];
//     sourceFile["bindDiagnostics"] = [];
//     return sourceFile
// }

// const sourceFile = createCompilableSourceFile(
//     [
//         createTrue(),
//         createFalse(),
//         createAndDeclaration(),
//         createOrDeclaration(),
//         createImplDeclaration(),
//         createEquivDeclaration(),
//         createNotDeclaration(),
//         createAndIntro(),
//         createAndElimLeft(),
//         createAndElimRight(),
//     ]
// );

const STATEMENTS = [
    ts.factory.createFunctionDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier("add"),
        undefined,
        [
            ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                "x",
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                undefined,
            ),
        ],
        undefined,
        ts.factory.createBlock([
            ts.factory.createReturnStatement(ts.factory.createIdentifier("x")),
        ]),
    ),
    ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(
            ts.factory.createIdentifier("add"),
            undefined,
            [ts.factory.createStringLiteral("wrong type")],
        ),
    ),
];

const host: ts.CompilerHost = {
    getSourceFile: (filename) =>
        filename == "foo.ts" ? ts.createLanguageServiceSourceFile() : undefined,
    writeFile: (name) => {
        throw new Error(`Unexpected write to file: ${name}`);
    },
    getDefaultLibFileName: () => "",
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => "",
    getNewLine: () => "\n",
    fileExists: (fileName) => fileName === "foo.ts",
    readFile: () => "",
    directoryExists: () => true,
    getDirectories: () => [],
};
const program = ts.createProgram(["foo.ts"], {}, host);
const sourceFile = program.getSourceFile("foo.ts")!;

const fileToString = (sourceFile: ts.SourceFile): string =>
    ts
        .createPrinter({ newLine: ts.NewLineKind.LineFeed })
        .printNode(
            ts.EmitHint.Unspecified,
            sourceFile,
            ts.createSourceFile(
                "output.ts",
                "",
                ts.ScriptTarget.Latest,
                false,
                ts.ScriptKind.TS,
            ),
        );

function visit(node: ts.Node) {
    console.log("VISITING", node.kind);
    ts.forEachChild(node, visit);
}

console.log(fileToString(sourceFile));

visit(sourceFile);

// const sourceFile2 = ts.createSourceFile("bar.ts", `function add(x: number) { return x; }\nadd("wrong type");\n`, ts.ScriptTarget.ES2015);

// console.log(fileToString(sourceFile2));

// visit(sourceFile2)

// console.log("getSyntacticDiagnostics", program.getSyntacticDiagnostics());
// console.log("getSemanticDiagnostics", ts.formatDiagnostics(program.getSemanticDiagnostics(), {
//     getCanonicalFileName: x => x,
//     getCurrentDirectory: () => "",
//     getNewLine: () => "\n",
// }));
// console.log("getDeclarationDiagnostics", program.getDeclarationDiagnostics());
// const semanticDiagnostics = program.getSemanticDiagnostics();

// runTypeCheck(`
// type True = "_true";
// type False = {false: False};

// const sorry = <T>(): T => "sorry" as unknown as T;
// const falseImpliesAny = <A>() => (_: False) => sorry<A>();

// type And<A, B> = {left: A, right: B};
// type Or<A, B> = {left: A} | {right: B};
// type Impl<A, B> = (_: A) => B;
// type Equiv<A, B> = And<Impl<A, B>, Impl<B, A>>;
// type Not<A> = Impl<A, False>;

// type ModusPonens<A, B> = Impl<And<Impl<A, B>, A>, B>;
// type ModusTollens<A, B> = Impl<And<Impl<A, B>, Not<B>>, Not<A>>;
// type AndElimLeft<A, B> = Impl<And<A, B>, A>;
// type AndElimRight<A, B> = Impl<And<A, B>, B>;

// const andElimLeft = <A, B>(): AndElimLeft<A, B> => (and) => and.left;
// const andElimRight = <A, B>(): AndElimRight<A, B> => (and) => and.right;

// type Paradox = (_: Paradox) => False;
// const paradox: Paradox = p => p(p);
// const contradiction = paradox(paradox);

// // assume we have an A, a B, and a C
// // implementation note for the future:
// // propositions need to be scoped...
// function context<P, Q, R>(_p: P, _q: Q, _r: R) {
//     // proofs of propositions

//     // ((P -> Q) & P) -> Q;
//     // h    = Assume ((P -> Q) & P)
//     // pToQ = AndElimLeft h
//     // p    = AndElimRight h
//     // QED pToQ(p)
//     const modusPonens: ModusPonens<P, Q> = (h) => {
//         const pToQ = andElimLeft<Impl<P, Q>, any>()(h);
//         const p: P = andElimRight<any, P>()(h);
//         return pToQ(p);
//     };

//     // ((P -> Q) & ~Q) -> ~P;
//     // h    = Assume ((P -> Q) & ~Q)
//     // pToQ = AndElimLeft h
//     // notQ = AndElimRight h
//     // _    = p => [
//     //     q = pToQ(p)
//     //     notQ(q)
//     // ]
//     const modusTollens: ModusTollens<P, Q> = (h) => {
//         const pToQ = andElimLeft<Impl<P, Q>, any>()(h);
//         const notQ = andElimLeft<any, Not<Q>>()(h);
//         return p => {
//             const q = pToQ(p)
//             return notQ(q);
//         }
//     }

//     // ((P -> Q) & (P -> R)) -> (P -> (Q & R))
//     // h    = Assume (P -> Q) & (P -> R)
//     // // = Sorry (P -> (Q & R))
//     // ---
//     // // p => <sorry P, sorry Q>
//     // ---
//     // pToQ = AndElimLeft h
//     // pToR = AndElimRight h
//     // _ = ImplIntro p []
//     // QED    p => <pToQ p, pToR p>
//     const proof = (h: And<Impl<P, Q>, Impl<P, R>>): Impl<P, And<Q, R>> => {
//         // return sorry<Impl<P, And<Q, R>>>();
//         // ---
//         // return (p) => ({
//         //     left: sorry<Q>(),
//         //     right: sorry<R>(),
//         // });
//         // ---
//         const pToQ = andElimLeft<Impl<P, Q>, any>()(h)
//         const pToR = andElimRight<any, Impl<P, R>>()(h)
//         return (p) => ({
//             left: pToQ(p),
//             right: pToR(p),
//         })
//     }
// }
// `);
