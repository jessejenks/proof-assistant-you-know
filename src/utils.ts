export type Unit = null;

export namespace Unit {
    // intro
    export const unit = (): Unit => null;
    // eliminator?
}

export type Result<T, E> =
    | { kind: "ok"; value: T }
    | { kind: "error"; error: E };

export namespace Result {
    // intro
    export const ok = <T, E>(value: T): Result<T, E> => ({ kind: "ok", value });
    export const error = <T, E>(error: E): Result<T, E> => ({
        kind: "error",
        error,
    });

    // eliminator
    export const elim = <T, E, V>(
        res: Result<T, E>,
        ok: (_: T) => V,
        err: (_: E) => V,
    ): V => (res.kind === "ok" ? ok(res.value) : err(res.error));
}

export namespace Timer {
    export const start = () => process.hrtime();

    export const elapsed = (start: [number, number], precision: number = 3) => {
        const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
        console.log(
            `${process.hrtime(start)[0]}s ${elapsed.toFixed(precision)}ms`,
        ); // print message + time
    };
}
