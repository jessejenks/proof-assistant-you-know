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
    Justification,
    Generalization,
    Quantified,
} from "../parser/parser";
import { Formatter, Visitor } from "./visitor";

export class PretterPrinter extends Visitor {
    protected f: Formatter;

    constructor(protected useTabs = true, protected tabWidth = 4) {
        super();
        this.f = new Formatter(useTabs, tabWidth);
    }

    getDocument() {
        return this.f.getDocument();
    }

    visitDocument(node: Document) {
        for (let i = 0; i < node.theorems.length; i++) {
            if (i > 0) {
                this.f.write("\n\n");
            }
            this.visitTheorem(node.theorems[i]);
        }
        this.f.write("\n");
    }

    visitTheorem(node: Theorem) {
        this.f.write("theorem ");
        if (node.expression.name) {
            this.f.write(node.expression.name, " : ");
        }
        this.visitExpression(node.expression.expression);
        this.f.write("\n");
        this.visitProof(node.proof);
    }

    visitProof(node: Proof) {
        for (let i = 0; i < node.statements.length; i++) {
            if (i > 0) {
                this.f.write("\n");
            }
            this.visitStatement(node.statements[i]);
        }
        if (node.statements.length > 0) {
            this.f.write("\n");
        }
        this.visitFinalStep(node.finalStep);
    }

    visitJustification(node: Justification): void {
        this.f.write("by ");
        super.visitJustification(node);
    }

    visitAssumption(node: Assumption) {
        this.f.write("assume ");
        for (let i = 0; i < node.assumptions.length; i++) {
            if (i > 0) {
                this.f.write(", ");
            }
            const namedExpr = node.assumptions[i];
            if (namedExpr.name) {
                this.f.write(namedExpr.name, " : ");
            }
            this.visitExpression(namedExpr.expression);
        }
        this.f.write(" {\n");
        this.visitProof(node.subproof);
        this.f.write("\n}");
    }

    visitGeneralization(node: Generalization) {
        this.f.write("forall ");
        this.f.write(node.typeVars.join(", "));
        this.f.write(" {\n");
        this.visitProof(node.subproof);
        this.f.write("\n}");
    }

    visitStep(node: Step) {
        this.f.write("have ");
        if (node.expression.name) {
            this.f.write(node.expression.name, " : ");
        }
        this.visitExpression(node.expression.expression);
        this.f.write(" ");
        this.visitJustification(node.justification);
    }

    visitApplication(node: Application) {
        this.f.write(node.rule);
        this.f.write(" ");
        for (let i = 0; i < node.arguments.length; i++) {
            if (i > 0) {
                this.f.write(", ");
            }
            this.visitArgument(node.arguments[i]);
        }
    }

    visitIdentifier(node: Identifier) {
        this.f.write(node.name);
    }

    visitQuantified(node: Quantified) {
        this.f.write("(");
        this.f.write("forall ");
        this.f.write(node.typeVars.join(", "));
        this.f.write(" . ");
        this.visitExpression(node.body);
        this.f.write(")");
    }

    visitImplication(node: Implication) {
        this.f.write("(");
        this.visitExpression(node.left);
        this.f.write(" => ");
        this.visitExpression(node.right);
        this.f.write(")");
    }

    visitDisjunction(node: Disjunction) {
        this.f.write("(");
        this.visitExpression(node.left);
        this.f.write(" | ");
        this.visitExpression(node.right);
        this.f.write(")");
    }

    visitConjunction(node: Conjunction) {
        this.f.write("(");
        this.visitExpression(node.left);
        this.f.write(" & ");
        this.visitExpression(node.right);
        this.f.write(")");
    }

    visitNegation(node: Negation) {
        this.f.write("(~");
        this.visitExpression(node.body);
        this.f.write(")");
    }

    visitTypeVar(node: TypeVar) {
        if (node.args.length > 0) {
            this.f.write(node.name);
            this.f.write("[");
        } else {
            this.f.write(node.name);
        }
        for (let i = 0; i < node.args.length; i++) {
            if (i > 0) {
                this.f.write(", ");
            }
            this.f.write(node.args[i]);
        }
        if (node.args.length > 0) {
            this.f.write("]");
        }
    }
}
