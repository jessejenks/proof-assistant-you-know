// set environment variable SYSTEM_F=1

// weakening
theorem forall A . (forall B . A => B => A)
forall A {
forall B {
assume A {
assume B {
by exact A
}}}}

theorem forall A, B . A => B => A
forall A, B {
assume A, B {
by exact A
}}

// S-combinator
theorem forall A, B, C . (A => B => C) => (A => B) => A => C
forall A, B, C {
assume abc : A => B => C, ab : A => B, A {
have bc : B => C by abc A
have B by ab A
by bc B
}
}

// composition
theorem forall A, B, C . (B => C) => (A => B) => A => C
forall A, B, C {
assume bc : B => C, ab : A => B, A {
have B by ab A
by bc B
}}

theorem forall A, B, C . (B => C) => (A => B) => A => C
forall A, B, C {
assume bc : B => C, ab : A => B, A {
have B by ab A
have C by bc B
by exact C
}}

theorem (forall A . P[A]) => P[B]
assume f : forall A . P[A] {
by forallElim B, f
}

theorem (forall A . (P => Q[A])) => P => (forall A . Q[A])
assume f : forall A . (P => Q[A]), P {
forall A {
have pToQA : P => Q[A] by forallElim A, f
by pToQA P
}}



// theorem forallId : forall A . A => A | ~A
// assume A, x : A {
// by exact x
// }

// theorem (forall A. P[A] => Q) => P[B] => Q
// assume h : forall C . P[C] => Q, pb : P[B] {
// have pToQ : P[B] => Q by forallElim B, h
// by modusPonens pToQ, pb
// }

// theorem (forall R . (forall A . P[A] => R) => R)
// by exact sorry

// theorem (forall A. P[A] => Q) => (exists B. P[B]) => Q
// assume h : forall C. P[C] => Q, w : exists D. P[D] {
// by exact sorry
// }

// theorem (forall A. P[A] => Q[A]) => (exists B. P[B]) => (exists C. Q[C])
// assume h : forall A. P[A] => Q[A], ex : exists B. P[B] {
// have Q[B] by existsElim ex, h
// // have pToQ : P[A] => Q[A] by forallElim A, h
// by exact sorry
// }

// theorem (exists A . P[A]) => (forall B . P[B] => Q) => Q
// assume e : exists A . P[A], k : (forall B . (P[B] => Q)) {
// by existsElim e, k
// }



