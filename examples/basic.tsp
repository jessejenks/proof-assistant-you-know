// P |- P
theorem [p: P] P;
_ by p;

// vs
// |- P => P
theorem P => P;
assume p: P [
    _ by p;
];

// P & Q |- P
theorem [h: P & Q] P;
_ by andElimLeft h;

// |- P & Q => P
theorem P & Q => P;
assume h: P & Q [
    _ by andElimLeft h;
];

theorem P & Q => P;
assume h: P & Q [
    assume r: R [
        _ by r;
    ];
    _ by andElimLeft h;
];

theorem P & Q => P;
assume r: R [
    _ by r;
];
assume h: P & Q [
    _ by andElimLeft h;
];

theorem (P => Q) & (P => R) => (P => Q & R);
assume h: (P => Q) & (P => R) [
    pToQ by andElimLeft h;
    pToR by andElimRight h;
    assume p: P [
        q by modusPonens pToQ p;
        r by modusPonens pToR p;
        _ by andIntro q r;
    ];
];

theorem (P => Q) => (P => R) => P => Q & R;
assume pToQ: P => Q [
    assume pToR: P => R [
        assume p: P [
            q by modusPonens pToQ p;
            r by modusPonens pToR p;
            _ by andIntro q r;
        ];
    ];
];

theorem [pToQ: (P => Q), pToR: (P => R)] (P => Q & R);
assume p: P [
    q by modusPonens pToQ p;
    r by modusPonens pToR p;
    _ by andIntro q r;
];