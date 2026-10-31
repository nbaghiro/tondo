const LIMIT = 100;
/** Changes to the same thing within this time count as one undo step, such as typing a word. */
const GROUP_MS = 800;

export interface History<T> {
    record: (before: T, group?: string) => void;
    undo: (current: T) => T | null;
    redo: (current: T) => T | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export function createHistory<T>(now: () => number = Date.now): History<T> {
    const past: T[] = [];
    const future: T[] = [];
    let lastGroup: string | undefined;
    let lastAt = 0;

    return {
        record(before, group) {
            const time = now();
            const sameStep = group !== undefined && group === lastGroup && time - lastAt < GROUP_MS;
            lastGroup = group;
            lastAt = time;
            if (sameStep) return;
            past.push(before);
            if (past.length > LIMIT) past.shift();
            future.length = 0;
        },
        undo(current) {
            const previous = past.pop();
            if (previous === undefined) return null;
            future.push(current);
            lastGroup = undefined;
            return previous;
        },
        redo(current) {
            const next = future.pop();
            if (next === undefined) return null;
            past.push(current);
            lastGroup = undefined;
            return next;
        },
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
    };
}
