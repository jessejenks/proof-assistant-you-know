# Proof Assistant You Know

Based on [this video](https://www.youtube.com/watch?v=i-hRpYiNwBw).

## Quick Start

Compile the project

```sh
npm i
npm run build
```

This compiles to the `build` directory

Now run the assistant against a file containing theorems to check.

```sh
node build check examples/basic.tsp
```

## The Underlying Logic

This proof assistant only lets you write proofs for the intuitionistic propositional logic.

By setting the environment variable `CLASSICAL=1`, we can use the double negation elimination rule,
though the generated program can no longer actually be run as a TypeScript file.

## Developing

If you would like to help develop this or just hack on it further, this website is very useful:
https://ts-ast-viewer.com/
