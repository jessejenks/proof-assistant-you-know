import * as ts from "typescript";
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
    Statement,
} from "./parser/parser";
import { Visitor } from "./parser/visitor";

// TODO: Optimize out `_` return cases. `const _x0 = ...; return _x0` could just be `return ...`;

type Frame = {
    freeVariables: Record<string, 0>;
    lastName: string | null;
};

export class AstToTs extends Visitor<ts.Node> {
    private frameStack: Frame[];
    private varCounter: number;
    constructor() {
        super();
        this.frameStack = [];
        this.varCounter = 0;
    }

    private addFreeVariable(name: string) {
        this.frameStack[this.frameStack.length - 1].freeVariables[name] = 0;
    }

    private setLastName(name: string) {
        this.frameStack[this.frameStack.length - 1].lastName = name;
    }

    private getLastName() {
        return this.frameStack[this.frameStack.length - 1].lastName;
    }

    private getAllFree() {
        let combined: Record<string, 0> = {};
        this.frameStack.forEach(({ freeVariables }) => {
            combined = { ...combined, ...freeVariables };
        });
        return combined;
    }

    private getName(name: { name: string }): string {
        if (name.name === "_") {
            const n = `_x${this.varCounter}`;
            this.varCounter++;
            this.setLastName(n);
            return n;
        }
        this.setLastName(name.name);
        return name.name;
    }

    private makeBody(stmts: Statement[]): ts.Block {
        const visited = stmts.map(this.visit) as ts.Statement[];
        const lastName = this.getLastName();
        if (lastName === null) throw new Error("No name to return");
        visited.push(ts.factory.createReturnStatement(ts.factory.createIdentifier(lastName)));
        return ts.factory.createBlock(visited);
    }

    visitDocument = (node: Document): ts.Block => ts.factory.createBlock(node.proofs.map(this.visitProof));

    visitProof = (node: Proof): ts.Statement => {
        this.frameStack.push({
            freeVariables: {},
            lastName: null,
        });
        this.varCounter = 0;
        const tp = this.visit(node.expression) as ts.TypeNode;
        const parameters = node.hypotheses.map(([name, type]) =>
            ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                ts.factory.createIdentifier(name.name),
                undefined,
                this.visit(type) as ts.TypeNode,
            ),
        );
        const body = this.makeBody(node.justifications);
        const popped = this.frameStack.pop();
        return ts.factory.createExpressionStatement(
            ts.factory.createArrowFunction(
                undefined,
                popped === undefined
                    ? undefined
                    : Object.keys(popped.freeVariables)
                          .sort()
                          .map((x) =>
                              ts.factory.createTypeParameterDeclaration(undefined, ts.factory.createIdentifier(x)),
                          ),
                parameters,
                tp,
                undefined,
                body,
            ),
        );
    };

    visitAssumption = (node: Assumption) => {
        const name = this.getName({ name: "_" });
        this.frameStack.push({
            freeVariables: {},
            lastName: null,
        });
        const parameter = ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            ts.factory.createIdentifier(this.getName(node.name)),
            undefined,
            this.visit(node.value) as ts.TypeNode,
        );
        const body = this.makeBody(node.subproof);
        const popped = this.frameStack.pop();
        if (popped) {
            Object.keys(this.getAllFree()).forEach((k) => {
                delete popped.freeVariables[k];
            });
        }
        return ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [
                    ts.factory.createVariableDeclaration(
                        name,
                        undefined,
                        undefined,
                        ts.factory.createArrowFunction(
                            undefined,
                            popped === undefined
                                ? undefined
                                : Object.keys(popped.freeVariables)
                                      .sort()
                                      .map((x) =>
                                          ts.factory.createTypeParameterDeclaration(
                                              undefined,
                                              ts.factory.createIdentifier(x),
                                          ),
                                      ),
                            [parameter],
                            undefined,
                            undefined,
                            body,
                        ),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        );
    };

    visitStep = (node: Step) => {
        const name = this.getName(node.name);
        const tp = node.value === null ? undefined : (this.visit(node.value) as ts.TypeNode);
        const [caller, ...args] = node.justifications.map((n) => ts.factory.createIdentifier(n.name));
        return ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [
                    ts.factory.createVariableDeclaration(
                        name,
                        undefined,
                        tp,
                        args.length === 0 ? caller : ts.factory.createCallExpression(caller, undefined, args),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        );
    };

    visitImplication = (node: Implication) =>
        ts.factory.createTypeReferenceNode("Impl", [
            this.visit(node.left) as ts.TypeNode,
            this.visit(node.right) as ts.TypeNode,
        ]);
    visitDisjunction = (node: Disjunction) =>
        ts.factory.createTypeReferenceNode("Or", [
            this.visit(node.left) as ts.TypeNode,
            this.visit(node.right) as ts.TypeNode,
        ]);
    visitConjunction = (node: Conjunction) =>
        ts.factory.createTypeReferenceNode("And", [
            this.visit(node.left) as ts.TypeNode,
            this.visit(node.right) as ts.TypeNode,
        ]);
    visitNegation = (node: Negation) =>
        ts.factory.createTypeReferenceNode("Not", [this.visit(node.value) as ts.TypeNode]);
    visitIdentifier = (node: Identifier) => {
        // we're assuming all identifiers that make it here are in a type expression
        // other kinds of identifiers should be manually handled
        this.addFreeVariable(node.name);
        return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(node.name));
    };
    visitTrue = (_: True) => ts.factory.createTypeReferenceNode("True");
    visitFalse = (_: False) => ts.factory.createTypeReferenceNode("False");
}
