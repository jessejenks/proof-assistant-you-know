# Proof Assistant You Know

Based on [this video](https://www.youtube.com/watch?v=i-hRpYiNwBw).

## Quick Start

Compile the project

```sh
npm i
npm run compile
```

This compiles to the `build` directory

Now run the assistant against a file containing theorems to check.

```sh
node build examples/basic.tsp
```

## The Underlying Logic

This proof assistant only lets you write proofs for the intuitionistic propositional logic.

Future work could be adding declarations or tags, to assume classical axioms. This would be similar to
`open classical` in `lean`. See [lean docs](https://lean-lang.org/logic_and_proof/classical_reasoning.html).

## Developing

If you would like to help develop this or just hack on it further, this website is very useful:
https://ts-ast-viewer.com/
