import type { AssistantOffer, AssistantStatus } from "@tondo/contract";
import { placePhoto, removeSection, addBuilt } from "@tondo/page";
import type { Page } from "@tondo/page";
import { createSignal, untrack } from "solid-js";
import {
    discardImages,
    keepPhoto,
    loadAssistant,
    makeImages,
    streamTurn,
} from "../lib/assistant-stream";
import type { EditorState } from "./document";

export type HelpMessage =
    | { role: "user"; text: string }
    | {
          role: "model";
          text: string;
          changes: string[];
          /** The page this turn produced, so its Undo only shows while that's still what's there. */
          result: Page | null;
          offers: AssistantOffer[];
      }
    | { role: "note"; text: string };

const KEY = "tondo.help";
const HISTORY = 20;
const CONFLICT = "Your page changed in another tab. Choose which version to keep first.";
const DROPPED = "The connection dropped, so your page hasn't changed. Please try again.";
const STOPPED = "Stopped. Your page hasn't changed.";

function loadWords(): HelpMessage[] {
    try {
        const raw = sessionStorage.getItem(KEY);
        const list = raw ? (JSON.parse(raw) as { role: "user" | "model"; text: string }[]) : [];
        return list.map((entry) =>
            entry.role === "user"
                ? { role: "user", text: entry.text }
                : { role: "model", text: entry.text, changes: [], result: null, offers: [] },
        );
    } catch {
        return [];
    }
}

/** The conversation stays in this tab, and goes when it closes. Nothing about it is kept on a server. */
export function createAssistant(editor: EditorState, handle: string) {
    const [status, setStatus] = createSignal<AssistantStatus | null>(null);
    const [messages, setMessages] = createSignal<HelpMessage[]>(loadWords());
    const [working, setWorking] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [chosen, setChosen] = createSignal<string | null>(null);
    const [made, setMade] = createSignal<{ files: string[]; target: string } | null>(null);
    let stopper: AbortController | null = null;

    const remember = (list: HelpMessage[]) => {
        const words = list.flatMap((entry) =>
            entry.role === "note" ? [] : [{ role: entry.role, text: entry.text }],
        );
        try {
            sessionStorage.setItem(KEY, JSON.stringify(words.slice(-HISTORY)));
        } catch {
            // A private window can refuse storage, and the conversation still works without it.
        }
    };
    const add = (message: HelpMessage) => {
        setMessages((list) => {
            const next = [...list, message];
            remember(next);
            return next;
        });
    };
    const note = (text: string) => {
        add({ role: "note", text });
    };
    const credits = (left: number) => {
        setStatus((was) => (was ? { ...was, creditsLeft: left } : was));
    };

    const load = () => {
        loadAssistant()
            .then(setStatus)
            .catch(() => undefined);
    };

    const send = async (text: string) => {
        const message = text.trim();
        if (!message || untrack(busy)) return;
        const history = untrack(messages)
            .flatMap((entry) =>
                entry.role === "note" || !entry.text
                    ? []
                    : [{ role: entry.role, text: entry.text.slice(0, 4000) }],
            )
            .slice(-HISTORY);
        add({ role: "user", text: message });
        setBusy(true);
        setWorking("Reading your page");
        const saved = await editor.saver.flush();
        if (!saved) {
            setBusy(false);
            setWorking("");
            note(CONFLICT);
            return;
        }
        const stopping = new AbortController();
        stopper = stopping;
        const before = untrack(editor.page);
        editor.beginTurn();
        const offers: AssistantOffer[] = [];
        const ended = { yes: false };
        try {
            await streamTurn(
                {
                    page: before,
                    message,
                    history,
                    selected: untrack(chosen),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                stopping.signal,
                (event) => {
                    if (event.type === "status") setWorking(event.text);
                    if (event.type === "page") editor.showTurn(event.page);
                    if (event.type === "offer") offers.push(event.offer);
                    if (event.type === "stopped") {
                        ended.yes = true;
                        editor.endTurn(null);
                        note(event.message);
                    }
                    if (event.type === "done") {
                        ended.yes = true;
                        const result = editor.endTurn(event.page);
                        credits(event.creditsLeft);
                        const said = event.partial
                            ? `I did part of this${event.changes.length ? `: ${event.changes.join(", ").toLowerCase()}` : ""}. Ask again for the rest.`
                            : event.reply;
                        add({
                            role: "model",
                            text: said,
                            changes: event.changes,
                            result,
                            offers,
                        });
                    }
                },
            );
            if (!ended.yes) {
                editor.endTurn(null);
                note(DROPPED);
            }
        } catch (error) {
            if (!ended.yes) {
                editor.endTurn(null);
                if (stopping.signal.aborted) note(STOPPED);
                else note(error instanceof TypeError ? DROPPED : errorText(error));
            }
        } finally {
            stopper = null;
            setBusy(false);
            setWorking("");
        }
    };

    return {
        status,
        messages,
        working,
        busy,
        chosen,
        made,
        load,
        /** The section "this" means. It's kept here, since opening the panel clears the selection. */
        choose: setChosen,
        send(text: string) {
            send(text).catch(() => undefined);
        },
        stop() {
            stopper?.abort();
        },
        /** A tap on a card. The person's tap is what acts, using the same functions as the editor. */
        removeSections(sections: readonly { id: string }[]) {
            editor.commitPage(
                sections.reduce((page, { id }) => removeSection(page, id), editor.page()),
            );
            note(`Removed ${String(sections.length)} sections. Undo brings them back.`);
        },
        replacePage(page: Page) {
            editor.commitPage({ ...page, timeZone: editor.page().timeZone });
            note("Replaced your page. Undo brings the old one back until you leave this page.");
        },
        addToPage(page: Page) {
            editor.commitPage(addBuilt(editor.page(), page));
            note("Added those sections below what you had.");
        },
        async pickPhoto(url: string, target: string, credit: string) {
            setWorking("Getting your photo");
            const kept = await keepPhoto(url);
            setWorking("");
            if ("error" in kept) {
                note(kept.error);
                return;
            }
            const next = placePhoto(editor.page(), target, kept.file);
            if (!next) {
                note("The place for that photo has gone, so I didn't add it.");
                return;
            }
            editor.commitPage(next);
            note(`Added the photo by ${credit}. Undo takes it off.`);
        },
        async makeImage(offer: Extract<AssistantOffer, { type: "image" }>) {
            setWorking("Making your images");
            const result = await makeImages({
                prompt: offer.prompt,
                kind: offer.kind,
                count: offer.count,
                name: editor.page().header.name,
            });
            setWorking("");
            if ("error" in result) {
                note(result.error);
                return;
            }
            credits(result.creditsLeft);
            setMade({ files: result.files, target: offer.target });
        },
        pickImage(file: string | null) {
            const offered = made();
            if (!offered) return;
            setMade(null);
            discardImages(offered.files.filter((other) => other !== file));
            if (!file) return;
            const next = placePhoto(editor.page(), offered.target, file);
            if (next) {
                editor.commitPage(next);
                note("Added it. Check it before you publish, and Undo takes it off.");
            }
        },
        handle,
    };
}

const errorText = (error: unknown) =>
    error instanceof Error ? error.message : "Help me isn't available right now.";

export type AssistantState = ReturnType<typeof createAssistant>;
