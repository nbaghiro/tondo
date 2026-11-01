import type { Page } from "@tondo/page";
import { createSignal } from "solid-js";
import { saveDraft } from "../lib/api";
import { clearBackup, saveBackup } from "./storage";

export type SaveState = "saved" | "saving" | "retrying" | "conflict" | "refused";

const WAIT_MS = 1000;
const RETRY_MS = 5000;

/** Saves about a second after the last change. Work is kept in the browser until the server has it. */
export function createSaver(options: {
    handle: string;
    updatedAt: string;
    onLoggedOut: () => void;
}) {
    const { handle, onLoggedOut } = options;
    const [state, setState] = createSignal<SaveState>("saved");
    const [message, setMessage] = createSignal("");
    let updatedAt = options.updatedAt;
    let waiting: Page | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Promise<void> | null = null;

    // Changes can arrive while a save is running, so this reads the latest value each time.
    const pending = (): Page | null => waiting;

    const run = async (): Promise<void> => {
        const page = pending();
        if (!page || state() === "conflict") return;
        waiting = null;
        setState("saving");
        const result = await saveDraft(page, updatedAt);
        if (result.state === "saved") {
            updatedAt = result.updatedAt;
            if (pending()) {
                await run();
                return;
            }
            clearBackup(handle);
            setState("saved");
            return;
        }
        waiting ??= page;
        if (result.state === "conflict") setState("conflict");
        else if (result.state === "logged-out") onLoggedOut();
        else if (result.state === "refused") {
            setMessage(result.message ?? "");
            setState("refused");
        } else {
            setState("retrying");
            clearTimeout(timer);
            timer = setTimeout(startSoon, RETRY_MS);
        }
    };
    function start(): Promise<void> {
        running ??= run().finally(() => {
            running = null;
        });
        return running;
    }
    function startSoon(): void {
        start().catch(() => {
            setState("retrying");
        });
    }

    return {
        state,
        message,
        updatedAt: () => updatedAt,
        change(page: Page) {
            waiting = page;
            saveBackup(handle, page, updatedAt);
            if (state() === "saved") setState("saving");
            clearTimeout(timer);
            timer = setTimeout(startSoon, WAIT_MS);
        },
        /** Saves anything outstanding now. True once the server has everything. */
        async flush(): Promise<boolean> {
            clearTimeout(timer);
            const stuck = () => ["conflict", "refused", "retrying"].includes(state());
            for (let tries = 0; tries < 5 && (pending() ?? running); tries++) {
                await start();
                if (stuck()) return false;
            }
            return state() === "saved";
        },
    };
}
