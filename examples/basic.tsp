// theorem : true
// by exact true

// theorem : P => P
// assume P {
// by exact P
// }

// theorem : P => P
// assume P {
// have P by exact P
// by exact P
// }

// // P & Q => P
// theorem : P & Q => P
// assume P & Q {
// by andElimLeft P & Q
// }

// theorem : P & Q => P
// assume P & Q {
// assume R {
// by exact R
// }
// by andElimLeft P & Q
// }

// theorem : P & Q => P
// assume R {
// by exact R
// }
// assume P & Q {
// by andElimLeft P & Q
// }

// |- (P => Q) & (P => R) => (P => Q & R)
theorem : (P => Q) & (P => R) => (P => Q & R)
assume (P => Q) & (P => R) {
have P => Q by andElimLeft (P => Q) & (P => R)
have P => R by andElimRight (P => Q) & (P => R)
assume P {
have Q by modusPonens P => Q, P
have R by modusPonens P => R, P
by andIntro Q, R
}
}

// |- (P => Q) => (P => R) => P => Q & R
theorem : (P => Q) => (P => R) => P => Q & R
assume P => Q {
assume P => R {
assume P {
have Q by modusPonens P => Q, P
have R by modusPonens P => R, P
by andIntro Q, R
}
}
}

// |- P => P | Q
theorem : P => P | Q
assume P {
have P | Q by orIntroRight P
}

theorem : P => Q => P
assume P {
assume Q {
by exact P
}
}