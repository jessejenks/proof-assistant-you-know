// set environment variable CLASSICAL=1 to assume DNE
theorem lem : P | ~P
have h : ~~(P | ~P) by assume a : ~(P | ~P) {
have h1 : ~P by assume P {
    have h : P | ~P by orIntroRight P
    by notElim h, a
}
have h2 : ~~P by assume ~P {
    have h : P | ~P by orIntroLeft ~P
    by notElim h, a
}
by notElim h1, h2
}
by doubleNegationElim h