import {
    Document,
    Assumption,
    Theorem,
    Step,
    Identifier,
    Proof,
    TypeVar,
    Negation,
    Conjunction,
    Disjunction,
    Implication,
    Application,
    Expression,
    AstKind,
    Statement,
    FinalStep,
    Justification,
    Argument,
    Generalization,
    Quantified,
} from "../parser/parser";

export abstract class Visitor<R extends Record<AstKind, any> = Record<AstKind, void>> {
    abstract visitDocument(node: Document): R[AstKind.Document];
    abstract visitTheorem(node: Theorem): R[AstKind.Theorem];
    abstract visitProof(node: Proof): R[AstKind.Proof];
    visitFinalStep(node: FinalStep): R[FinalStep["kind"]] {
        switch (node.kind) {
            case AstKind.Assumption:
            case AstKind.Generalization:
            case AstKind.Step:
                return this.visitStatement(node);
            case AstKind.Application:
                return this.visitJustification(node);
        }
    }
    visitStatement(node: Statement): R[Statement["kind"]] {
        switch (node.kind) {
            case AstKind.Assumption:
                return this.visitAssumption(node);
            case AstKind.Generalization:
                return this.visitGeneralization(node);
            case AstKind.Step:
                return this.visitStep(node);
        }
    }
    visitJustification(node: Justification): R[Justification["kind"]] {
        switch (node.kind) {
            case AstKind.Assumption:
                return this.visitAssumption(node);
            case AstKind.Generalization:
                return this.visitGeneralization(node);
            case AstKind.Application:
                return this.visitApplication(node);
        }
    }
    abstract visitAssumption(node: Assumption): R[AstKind.Assumption];
    abstract visitGeneralization(node: Generalization): R[AstKind.Generalization];
    abstract visitStep(node: Step): R[AstKind.Step];
    abstract visitApplication(node: Application): R[AstKind.Application];
    visitArgument(node: Argument): R[Argument["kind"]] {
        switch (node.kind) {
            case AstKind.Identifier:
                return this.visitIdentifier(node);
            default:
                return this.visitExpression(node);
        }
    }
    abstract visitIdentifier(node: Identifier): R[AstKind.Identifier];
    visitExpression(node: Expression): R[Expression["kind"]] {
        switch (node.kind) {
            case AstKind.Quantified:
                return this.visitQuantified(node);
            case AstKind.Implication:
                return this.visitImplication(node);
            case AstKind.Disjunction:
                return this.visitDisjunction(node);
            case AstKind.Conjunction:
                return this.visitConjunction(node);
            case AstKind.Negation:
                return this.visitNegation(node);
            case AstKind.TypeVar:
                return this.visitTypeVar(node);
        }
    }
    abstract visitQuantified(node: Quantified): R[AstKind.Quantified];
    abstract visitImplication(node: Implication): R[AstKind.Implication];
    abstract visitDisjunction(node: Disjunction): R[AstKind.Disjunction];
    abstract visitConjunction(node: Conjunction): R[AstKind.Conjunction];
    abstract visitNegation(node: Negation): R[AstKind.Negation];
    abstract visitTypeVar(node: TypeVar): R[AstKind.TypeVar];
}

export class Formatter {
    private indentation: string;

    protected depth: number;
    protected builder: string[];

    constructor(protected useTabs = true, protected tabWidth = 4) {
        this.depth = 0;
        this.indentation = useTabs ? "\t" : "".padStart(tabWidth);
        this.builder = [];
    }

    reset() {
        this.depth = 0;
        this.builder = [];
    }

    getDocument(): string {
        return this.builder.join("");
    }

    indent() {
        for (let i = 0; i < this.depth; i++) {
            this.builder.push(this.indentation);
        }
    }

    enter() {
        this.depth++;
    }

    exit() {
        this.depth--;
    }

    write(...line: string[]) {
        this.builder.push(...line);
    }
}
