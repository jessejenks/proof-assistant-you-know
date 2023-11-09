import {
    Document,
    Proof,
    Assumption,
    Step,
    Implication,
    Disjunction,
    Conjunction,
    Negation,
    Identifier,
    True,
    False,
    Expression,
    AstKind,
    Ast,
} from "./parser";

export abstract class Visitor<T = void> {
    visit = (node: Ast): T => {
        switch (node.kind) {
            case AstKind.Document:
                return this.visitDocument(node);

            case AstKind.Proof:
                return this.visitProof(node);

            case AstKind.Assumption:
                return this.visitAssumption(node);

            case AstKind.Step:
                return this.visitStep(node);

            case AstKind.Implication:
                return this.visitImplication(node);

            case AstKind.Disjunction:
                return this.visitDisjunction(node);

            case AstKind.Conjunction:
                return this.visitConjunction(node);

            case AstKind.Negation:
                return this.visitNegation(node);

            case AstKind.Identifier:
                return this.visitIdentifier(node);

            case AstKind.True:
                return this.visitTrue(node);

            case AstKind.False:
                return this.visitFalse(node);
        }
    };

    abstract visitDocument(node: Document): T;
    abstract visitProof(node: Proof): T;
    abstract visitAssumption(node: Assumption): T;
    abstract visitStep(node: Step): T;
    abstract visitImplication(node: Implication): T;
    abstract visitDisjunction(node: Disjunction): T;
    abstract visitConjunction(node: Conjunction): T;
    abstract visitNegation(node: Negation): T;
    abstract visitIdentifier(node: Identifier): T;
    abstract visitTrue(node: True): T;
    abstract visitFalse(node: False): T;
}

export class PrettyPrinter extends Visitor<string> {
    private depth: number;
    private indent: Record<number, string>;

    constructor() {
        super();
        this.indent = { 0: "" };
        this.depth = 0;
    }

    private ind() {
        if (!(this.depth in this.indent)) {
            this.indent[this.depth] = new Array(this.depth).fill("    ").join("");
        }
        return this.indent[this.depth];
    }

    visitDocument = (node: Document): string => node.proofs.map(this.visit).join("\n");

    visitProof = (node: Proof): string =>
        `theorem ${this.visit(node.expression)};\n` + node.justifications.map(this.visit).join("\n");

    visitAssumption = (node: Assumption): string => {
        this.depth++;
        const subproof = node.subproof.map(this.visit).join("\n");
        this.depth--;
        const d = this.ind();
        return `${d}assume ${node.name.name}: ${this.visit(node.value)} [\n${subproof}\n${d}];`;
    };

    visitStep = (node: Step): string =>
        `${this.ind()}${node.name.name}${this.maybeType(node.value)} by ${node.justifications
            .map((n) => n.name)
            .join(" ")};`;

    private maybeType = (expr: Expression | null): string => (expr === null ? "" : `: ${this.visit(expr)}`);

    visitImplication = (node: Implication): string => `(${this.visit(node.left)} => ${this.visit(node.right)})`;

    visitDisjunction = (node: Disjunction): string => `(${this.visit(node.left)} | ${this.visit(node.right)})`;

    visitConjunction = (node: Conjunction): string => `(${this.visit(node.left)} & ${this.visit(node.right)})`;

    visitNegation = (node: Negation): string => `(~${this.visit(node.value)})`;

    visitIdentifier = (node: Identifier): string => node.name;

    visitTrue = (_: True): string => "true";

    visitFalse = (_: False): string => "false";
}
