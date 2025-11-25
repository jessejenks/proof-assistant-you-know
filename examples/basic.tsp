// True is the simplest theorem
theorem True
// the "true" here refers to a built-in canonical proof of "True"
// exact is like the trivial rule of inference P |- P
by exact true

// explosion/ex falso is an axiom
theorem False => P
assume False {
by absurd False
}

// and-introduction and elimination rules

theorem P => Q => P & Q
assume P, Q {
by andIntro P, Q
}

theorem Q => P => P & Q
assume Q, P {
by andIntro P, Q
}

theorem P & Q => P
assume P & Q {
by andElimLeft P & Q
}

theorem P & Q => Q
assume P & Q {
by andElimRight P & Q
}

// or-introduction and elimination rules

// for more complex expressions, you may have to explicitly write out the desired expression with "have"
// because typescript's type inference is not perfect. e.g.
// `have P | Q by orIntroRight P`
// instead of just
// `by orIntroRight P`

theorem P => P | Q
assume P {
by orIntroRight P
}

theorem Q => P | Q
assume Q {
by orIntroLeft Q
}

theorem P | Q => (P => R) => (Q => R) => R
assume P | Q, P => R, Q => R {
by orElim P | Q, P => R, Q => R
}

// we don't have a rule of inference for conditional introduction
// instead that is part of the syntax
// i.e. assume P { ... by Q }
// is how we introduce P => Q
// and these can be chained
// i.e. assume P, Q, R { ... by S }
// is P => (Q => (R => S))

theorem (P => Q) => P => Q
assume P => Q, P {
by modusPonens P => Q, P
}

theorem (P => Q) => ~Q => ~P
assume P => Q, ~Q {
by modusTollens P => Q, ~Q
}

// modusTollens does not need to be a built-in rule of inference
// but is included for convenience
theorem (P => Q) => ~Q => ~P
assume P => Q, ~Q, P {
have Q by modusPonens P => Q, P
by modusPonens ~Q, Q
}

// Similarly, since `~P` is just shorthand for `P => False`, we don't need a built-in rule for not-elimination
// but it is included for convenience

theorem P => ~P => False
assume P, ~P {
by notElim P, ~P
}

theorem P => ~P => False
assume P, ~P {
by modusPonens ~P, P
}

// there is currently no special syntax for iff, like `<=>`

theorem (P => False) => ~P
assume P => False {
by exact P => False
}

theorem ~P => (P => False)
assume ~P {
by exact ~P
}

// === example theorems ===

theorem P => Q => P
assume P, Q {
by exact P
}

// theorems can be given names and referred to later
theorem myTheorem : P => Q => (P | R) & Q
assume P, Q {
have P | R by orIntroRight P
by andIntro P | R, Q
}

theorem ~P => P => Q
assume ~P, P {
have False by modusPonens ~P, P
by absurd False
}

theorem lawOfNonContradiction : ~(P & ~P)
assume P & ~P {
have P by andElimLeft P & ~P
have ~P by andElimRight P & ~P
by modusPonens ~P, P
}

// this statement is *not* provable!
// theorem ~~P => P
// this is called "double negation elimination" and is provable in the classical logic propositional logic,
// similarly P | ~P is called the "law of excluded middle" and is also not provable.

// example 19.7 from pg. 238 of open logic project's "what if" revision 8be15d6 (2021-07-11)
theorem example19_7 : ~~(P | ~P)
assume g : ~(P | ~P) {
have h1 : P => P | ~P by assume P { by orIntroRight P }
have h2 : ~P => P | ~P by assume ~P { by orIntroLeft ~P }
have k : ~P by assume P {
    have c : P | ~P by h1 P
    by g c
}
have l : ~~P by assume ~P {
    have c : P | ~P by h2 ~P
    by g c
}
by l k
}
