import type { AssistantOffer } from "@tondo/contract";
import { findSection, HEADER, setupChecklist } from "@tondo/page";
import { createEffect, createSignal, For, Match, on, Show, Switch, untrack } from "solid-js";
import type { AssistantState, HelpMessage } from "../state/assistant";
import type { EditorState } from "../state/document";
import { Glyph } from "./Panels";

const FIRST_USE =
    "I can change your draft, and nothing goes live until you publish. I can get things wrong, so check names, prices and dates.";

const SUGGESTIONS: Readonly<Record<string, string>> = {
    about: "Write a short line about me",
    socials: "Add my social icons",
    content: "What's still sample text?",
    photo: "Find me a photo for the top",
};

function ChoiceCard(props: {
    assistant: AssistantState;
    offer: Extract<AssistantOffer, { type: "choice" }>;
}) {
    return (
        <div class="help-card">
            <p>{props.offer.question}</p>
            <div class="help-actions">
                <For each={props.offer.options}>
                    {(option) => (
                        <button
                            type="button"
                            class="help-chip"
                            disabled={props.assistant.busy()}
                            onClick={() => {
                                props.assistant.send(option);
                            }}
                        >
                            {option}
                        </button>
                    )}
                </For>
            </div>
        </div>
    );
}

function PhotoCard(props: {
    assistant: AssistantState;
    offer: Extract<AssistantOffer, { type: "photos" }>;
}) {
    const providers = () => [
        ...new Map(props.offer.choices.map((c) => [c.provider, c.providerUrl])).entries(),
    ];
    return (
        <div class="help-card">
            <p>Pick one and I'll add it.</p>
            <div class="help-photos">
                <For each={props.offer.choices}>
                    {(choice) => (
                        <figure>
                            <button
                                type="button"
                                aria-label={`Use ${choice.alt}`}
                                onClick={() => {
                                    props.assistant
                                        .pickPhoto(choice.url, props.offer.target, choice.credit)
                                        .catch(() => undefined);
                                }}
                            >
                                <img src={choice.thumb} alt={choice.alt} />
                            </button>
                            <figcaption>
                                <a href={choice.creditUrl} target="_blank" rel="noreferrer">
                                    {choice.credit}
                                </a>
                                <Show when={choice.licence}> · {choice.licence}</Show>
                            </figcaption>
                        </figure>
                    )}
                </For>
            </div>
            <p class="help-small">
                Photos from{" "}
                <For each={providers()}>
                    {([name, url], i) => (
                        <>
                            {i() ? " and " : ""}
                            <a href={url} target="_blank" rel="noreferrer">
                                {name}
                            </a>
                        </>
                    )}
                </For>
                .
            </p>
        </div>
    );
}

function ImageCard(props: {
    assistant: AssistantState;
    offer: Extract<AssistantOffer, { type: "image" }>;
}) {
    const [asked, setAsked] = createSignal(false);
    const left = () => props.assistant.status()?.creditsLeft ?? 0;
    const words = () => (props.offer.kind === "logo" ? "logo ideas" : "images");
    return (
        <div class="help-card">
            <p>
                Make {props.offer.count} {words()}? This uses {props.offer.credits} of your {left()}{" "}
                credits.
            </p>
            <div class="help-actions">
                <button
                    type="button"
                    class="help-go"
                    disabled={asked() || left() < props.offer.credits}
                    onClick={() => {
                        setAsked(true);
                        props.assistant.makeImage(props.offer).catch(() => undefined);
                    }}
                >
                    Make them
                </button>
            </div>
        </div>
    );
}

function Offer(props: {
    assistant: AssistantState;
    offer: AssistantOffer;
    onPublish: () => void;
    handle: string;
}) {
    const [used, setUsed] = createSignal(false);
    const of = <T extends AssistantOffer["type"]>(type: T) => {
        const offer = props.offer;
        return offer.type === type ? (offer as Extract<AssistantOffer, { type: T }>) : undefined;
    };
    return (
        <Show when={!used()}>
            <Switch>
                <Match when={of("choice")}>
                    {(offer) => <ChoiceCard assistant={props.assistant} offer={offer()} />}
                </Match>
                <Match when={of("photos")}>
                    {(offer) => <PhotoCard assistant={props.assistant} offer={offer()} />}
                </Match>
                <Match when={of("image")}>
                    {(offer) => <ImageCard assistant={props.assistant} offer={offer()} />}
                </Match>
                <Match when={of("publish")}>
                    <div class="help-card">
                        <p>
                            Ready to publish? Your page will go live at tondo.page/{props.handle}.
                        </p>
                        <div class="help-actions">
                            <button
                                type="button"
                                class="help-go"
                                data-help-publish
                                onClick={() => {
                                    props.onPublish();
                                }}
                            >
                                Check and publish
                            </button>
                        </div>
                    </div>
                </Match>
                <Match when={of("remove")}>
                    {(offer) => (
                        <div class="help-card">
                            <p>Remove {offer().sections.length} sections?</p>
                            <p class="help-small">
                                {offer()
                                    .sections.map((section) => section.name)
                                    .join(", ")}
                            </p>
                            <div class="help-actions">
                                <button
                                    type="button"
                                    class="help-go"
                                    onClick={() => {
                                        setUsed(true);
                                        props.assistant.removeSections(offer().sections);
                                    }}
                                >
                                    Remove them
                                </button>
                                <button
                                    type="button"
                                    class="help-chip"
                                    onClick={() => setUsed(true)}
                                >
                                    Keep them
                                </button>
                            </div>
                        </div>
                    )}
                </Match>
                <Match when={of("replace")}>
                    {(offer) => (
                        <div class="help-card">
                            <p>
                                This replaces what's on your page. Undo brings it back until you
                                leave this page.
                            </p>
                            <div class="help-actions">
                                <button
                                    type="button"
                                    class="help-go"
                                    onClick={() => {
                                        setUsed(true);
                                        props.assistant.replacePage(offer().page);
                                    }}
                                >
                                    Replace my page
                                </button>
                                <button
                                    type="button"
                                    class="help-chip"
                                    onClick={() => {
                                        setUsed(true);
                                        props.assistant.addToPage(offer().page);
                                    }}
                                >
                                    Add to it
                                </button>
                            </div>
                        </div>
                    )}
                </Match>
            </Switch>
        </Show>
    );
}

function Reply(props: {
    assistant: AssistantState;
    editor: EditorState;
    message: Extract<HelpMessage, { role: "model" }>;
    onPublish: () => void;
}) {
    const canUndo = () =>
        props.message.result !== null && props.editor.page() === props.message.result;
    const count = () => props.message.changes.length;
    return (
        <div class="help-reply">
            <Show when={props.message.text}>
                <p>{props.message.text}</p>
            </Show>
            <Show when={count() > 0}>
                <ul class="help-changes">
                    <For each={props.message.changes}>{(change) => <li>{change}</li>}</For>
                </ul>
            </Show>
            <Show when={canUndo() && count() > 0}>
                <button
                    type="button"
                    class="help-undo"
                    onClick={() => {
                        props.editor.undo();
                    }}
                >
                    {count() > 1 ? "Undo all" : "Undo"}
                </button>
            </Show>
            <For each={props.message.offers}>
                {(offer) => (
                    <Offer
                        assistant={props.assistant}
                        offer={offer}
                        onPublish={props.onPublish}
                        handle={props.assistant.handle}
                    />
                )}
            </For>
        </div>
    );
}

export function HelpPanel(props: {
    assistant: AssistantState;
    editor: EditorState;
    onPublish: () => void;
    onClose: () => void;
    /** Words to start with, from a link on Home. */
    start?: string | undefined;
}) {
    const assistant = untrack(() => props.assistant);
    const editor = untrack(() => props.editor);
    const [draft, setDraft] = createSignal(untrack(() => props.start) ?? "");
    let list: HTMLDivElement | undefined;
    let box: HTMLTextAreaElement | undefined;
    const name = () => {
        const id = assistant.chosen();
        if (!id) return "";
        if (id === HEADER) return "Your name and links";
        return findSection(editor.page(), id)?.section.definition.name ?? "";
    };
    const left = () => assistant.status()?.creditsLeft ?? 0;
    const blank = () => editor.page().blocks.length === 0;
    const suggestions = () =>
        setupChecklist(editor.page(), { published: editor.hasLive() })
            .filter((item) => !item.done && SUGGESTIONS[item.id])
            .slice(0, 2)
            .map((item) => SUGGESTIONS[item.id] ?? "")
            .concat("What's missing?");
    const send = (text: string) => {
        assistant.send(text);
        setDraft("");
        if (box) box.style.height = "";
    };
    createEffect(
        on(
            () => [assistant.messages().length, assistant.working(), assistant.made()],
            () => {
                list?.scrollTo({ top: list.scrollHeight });
            },
        ),
    );
    return (
        <div class="help">
            <div class="help-list" ref={(el) => (list = el)} aria-live="polite">
                <Show when={!assistant.messages().length}>
                    <div class="help-first">
                        <p class="help-lead">
                            {blank()
                                ? "Tell me what your page is for, or paste your links. You can change everything afterwards."
                                : "Ask for a change, or try one of these:"}
                        </p>
                        <Show when={!blank()}>
                            <div class="help-actions">
                                <For each={suggestions()}>
                                    {(words) => (
                                        <button
                                            type="button"
                                            class="help-chip"
                                            onClick={() => {
                                                send(words);
                                            }}
                                        >
                                            {words}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <p class="help-small">{FIRST_USE}</p>
                    </div>
                </Show>
                <For each={assistant.messages()}>
                    {(message) =>
                        message.role === "user" ? (
                            <p class="help-you">{message.text}</p>
                        ) : message.role === "note" ? (
                            <p class="help-note">{message.text}</p>
                        ) : (
                            <Reply
                                assistant={assistant}
                                editor={editor}
                                message={message}
                                onPublish={props.onPublish}
                            />
                        )
                    }
                </For>
                <Show when={assistant.made()}>
                    {(made) => (
                        <div class="help-card">
                            <p>
                                Made with AI. Check it before you use it, especially for anything
                                that looks like a real brand.
                            </p>
                            <div class="help-photos">
                                <For each={made().files}>
                                    {(file) => (
                                        <button
                                            type="button"
                                            aria-label="Use this image"
                                            onClick={() => {
                                                assistant.pickImage(file);
                                            }}
                                        >
                                            <img src={`/photos/${file}`} alt="" />
                                        </button>
                                    )}
                                </For>
                            </div>
                            <div class="help-actions">
                                <button
                                    type="button"
                                    class="help-chip"
                                    onClick={() => {
                                        assistant.pickImage(null);
                                    }}
                                >
                                    None of these
                                </button>
                            </div>
                        </div>
                    )}
                </Show>
                <Show when={assistant.working()}>
                    <p class="help-working" role="status">
                        <i />
                        {assistant.working()}
                    </p>
                </Show>
            </div>
            <form
                class="help-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    send(draft());
                }}
            >
                <Show when={name()}>
                    <span class="help-context">
                        {name()}
                        <button
                            type="button"
                            aria-label="Don't use this section"
                            onClick={() => {
                                assistant.choose(null);
                            }}
                        >
                            <Glyph name="x" />
                        </button>
                    </span>
                </Show>
                <div class="help-box">
                    <textarea
                        ref={(el) => {
                            box = el;
                            // On a phone this would pull up the keyboard before anyone asked for it.
                            if (matchMedia("(pointer: fine)").matches) {
                                setTimeout(() => {
                                    el.focus();
                                }, 0);
                            }
                        }}
                        id="help-input"
                        rows={1}
                        placeholder="Tell me what to change"
                        aria-label="Tell me what to change"
                        value={draft()}
                        maxLength={4000}
                        onInput={(e) => {
                            setDraft(e.currentTarget.value);
                            e.currentTarget.style.height = "";
                            e.currentTarget.style.height = `${String(Math.min(e.currentTarget.scrollHeight, 120))}px`;
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") props.onClose();
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send(draft());
                            }
                        }}
                    />
                    <Show
                        when={assistant.busy()}
                        fallback={
                            <button
                                type="submit"
                                class="help-send"
                                aria-label="Send"
                                disabled={!draft().trim() || left() < 1}
                            >
                                <Glyph name="up" />
                            </button>
                        }
                    >
                        <button
                            type="button"
                            class="help-stop"
                            onClick={() => {
                                assistant.stop();
                            }}
                        >
                            Stop
                        </button>
                    </Show>
                </div>
                <p class="help-credits" data-help-credits>
                    <Show
                        when={left() > 0}
                        fallback={
                            assistant.status()?.once
                                ? "You've used your credits. A plan gives you more each month, and everything else in Tondo still works."
                                : `You've used this month's credits. They reset on ${assistant.status()?.resetsOn ?? "the 1st"}, and everything else in Tondo still works.`
                        }
                    >
                        {left() === 1 ? "1 credit" : `${String(left())} credits`} left
                        {assistant.status()?.once ? "" : " this month"}
                    </Show>
                </p>
            </form>
        </div>
    );
}
