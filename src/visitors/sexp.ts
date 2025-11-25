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
} from "../parser/parser";
import { Visitor, Formatter } from "./visitor";

export class SExpVisitor extends Visitor {
    protected f: Formatter;

    constructor(protected useTabs = true, protected tabWidth = 4) {
        super();
        this.f = new Formatter(useTabs, tabWidth);
    }

    protected indent() {
        this.f.write("\n");
        this.f.indent();
    }

    protected enter(name: string, ...line: string[]) {
        this.f.write("(", name);
        for (let i = 0; i < line.length; i++) {
            this.f.write(" ", line[i]);
        }
        this.f.enter();
    }

    protected exit() {
        this.f.exit();
        this.f.write(")");
    }

    protected leaf(name: string, ...line: string[]) {
        this.enter(name, ...line);
        this.exit();
    }

    getDocument() {
        return this.f.getDocument();
    }

    visitDocument(node: Document) {
        this.f.reset();
        this.enter("Document");
        for (let i = 0; i < node.theorems.length; i++) {
            this.indent();
            this.visitTheorem(node.theorems[i]);
        }
        this.exit();
    }

    visitTheorem(node: Theorem) {
        if (node.expression.name) {
            this.enter("Theorem", node.expression.name);
        } else {
            this.enter("Theorem");
        }
        this.indent();
        this.visitExpression(node.expression.expression);
        this.indent();
        this.visitProof(node.proof);
        this.exit();
    }

    visitProof(node: Proof) {
        this.enter("Proof");
        for (let i = 0; i < node.statements.length; i++) {
            this.indent();
            this.visitStatement(node.statements[i]);
        }
        this.indent();
        this.visitFinalStep(node.finalStep);
        this.exit();
    }

    visitAssumption(node: Assumption) {
        this.enter("Assumption");
        for (let i = 0; i < node.assumptions.length; i++) {
            const assumption = node.assumptions[i];
            if (assumption.name) {
                this.f.write(" ", assumption.name);
            }
            this.indent();
            this.visitExpression(assumption.expression);
        }
        this.indent();
        this.visitProof(node.subproof);
        this.exit();
    }

    visitStep(node: Step) {
        if (node.expression.name) {
            this.enter("Step", node.expression.name);
        } else {
            this.enter("Step");
        }
        this.indent();
        this.visitExpression(node.expression.expression);
        this.indent();
        this.visitJustification(node.justification);
        this.exit();
    }

    visitApplication(node: Application) {
        this.enter("Application", node.rule);
        for (let i = 0; i < node.arguments.length; i++) {
            this.indent();
            this.visitArgument(node.arguments[i]);
        }
        this.exit();
    }

    visitIdentifier(node: Identifier) {
        this.leaf("Identifier", node.name);
    }

    visitImplication(node: Implication) {
        this.enter("Implication");
        this.indent();
        this.visitExpression(node.left);
        this.indent();
        this.visitExpression(node.right);
        this.exit();
    }

    visitDisjunction(node: Disjunction) {
        this.enter("Disjunction");
        this.indent();
        this.visitExpression(node.left);
        this.indent();
        this.visitExpression(node.right);
        this.exit();
    }

    visitConjunction(node: Conjunction) {
        this.enter("Conjunction");
        this.indent();
        this.visitExpression(node.left);
        this.indent();
        this.visitExpression(node.right);
        this.exit();
    }

    visitNegation(node: Negation) {
        this.enter("Negation");
        this.indent();
        this.visitExpression(node.value);
        this.exit();
    }

    visitTypeVar(node: TypeVar) {
        this.leaf("Proposition", node.name);
    }
}
