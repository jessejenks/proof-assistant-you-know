export type Unit = null;

export namespace Unit {
    // intro
    export const unit = (): Unit => null;
    // eliminator?
}

export type Result<T, E> = { kind: "ok"; value: T } | { kind: "error"; error: E };

export namespace Result {
    // intro
    export const ok = <T, E>(value: T): Result<T, E> => ({ kind: "ok", value });
    export const error = <T, E>(error: E): Result<T, E> => ({
        kind: "error",
        error,
    });

    // eliminator
    export const elim = <T, E, V>(res: Result<T, E>, ok: (_: T) => V, err: (_: E) => V): V =>
        res.kind === "ok" ? ok(res.value) : err(res.error);
}

const LOGLEVEL = Number.parseInt(process.env["LOGLEVEL"] ?? "3");

export namespace Logger {
    function log(prefix: string, ...msgs: any[]) {
        process.stderr.write(prefix);
        for (let i = 0; i < msgs.length; i++) {
            process.stderr.write(" ");
            process.stderr.write(String(msgs[i]));
        }
        process.stderr.write("\n");
    }

    export function debug(...msgs: any[]) {
        if (LOGLEVEL < 4) {
            return;
        }
        log("DEBUG", ...msgs);
    }

    export function info(...msgs: any[]) {
        if (LOGLEVEL < 3) {
            return;
        }
        log("INFO ", ...msgs);
    }

    export function warn(...msgs: any[]) {
        if (LOGLEVEL < 2) {
            return;
        }
        log("WARN ", ...msgs);
    }

    export function error(...msgs: any[]) {
        if (LOGLEVEL < 1) {
            return;
        }
        log("ERROR ", ...msgs);
    }
}

export namespace Timer {
    export const start = (...msgs: any[]) => {
        Logger.debug(...msgs);
        return process.hrtime();
    };

    export const elapsed = (start: [number, number], precision: number = 3) => {
        const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
        Logger.debug(`${process.hrtime(start)[0]}s ${elapsed.toFixed(precision)}ms`); // print message + time
    };
}
