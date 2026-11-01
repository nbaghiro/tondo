import { routes } from "@tondo/contract";
import type { HandleResponse } from "@tondo/contract";
import {
    addSection,
    makeSection,
    normaliseHandle,
    PAGE_VERSION,
    sectionAvailable,
    sectionDefinition,
    sectionDefinitions,
    wordmarks,
} from "@tondo/page";
import type { Block, LookName, Page } from "@tondo/page";
import { looks, paint } from "@tondo/render";
import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack } from "solid-js";
import { GRIP } from "../lib/drawings";
import { LivePage } from "./LivePage";
import { LookTiles } from "./LookPanel";
import { Glyph } from "./Panels";
import { Phone } from "./Phone";

const LOGO = paint(["#c8385f", "#e8876a", "#a42a55", "#f2b56b"], 9).replace('class="tondo"', "");
const STEPS = 5;
const makeId = () => crypto.randomUUID();

const USES = [
    ["shop", "A shop", ["links", "spotlight", "shop", "find"]],
    ["services", "My services", ["about", "services", "bookings", "proof", "find"]],
    ["creator", "My creative work", ["banner", "photos", "media", "links"]],
    ["place", "A place or event", ["spotlight", "events", "photos", "find"]],
    ["me", "Just me", ["about", "links", "photos"]],
] as const;

const WORDMARK_LABELS: Record<string, string> = {
    plain: "Plain text",
    bubble: "Bubble",
    poster: "Poster",
    script: "Script",
    paint: "Painted",
    seal: "Seal",
};

function toHandle(name: string): string {
    return normaliseHandle(name)
        .replace(/[^a-z0-9-]+/g, "")
        .slice(0, 30);
}

/** After sign-up: name, sections, a logo, a look and an address, with the page filling in beside it. */
const MARK_ROOM = 300;

export function StartFlow(props: {
    wanted: string;
    onDone: (handle: string, page: Page) => Promise<string | null>;
}) {
    const [step, setStep] = createSignal(0);
    const [name, setName] = createSignal("");
    // A longer name gets smaller type, so its logo always fits its tile.
    const markSize = () => Math.max(12, Math.min(30, MARK_ROOM / Math.max(name().length, 1)));
    const [use, setUse] = createSignal<string | null>(null);
    const mainKeys = sectionDefinitions.filter((s) => !s.less).map((s) => s.key);
    const [order, setOrder] = createSignal<string[]>(mainKeys);
    const [picked, setPicked] = createSignal<string[]>(["about", "links", "photos"]);
    const [mark, setMark] = createSignal<string>("plain");
    const [look, setLook] = createSignal<LookName>("lagoon");
    const [handle, setHandle] = createSignal(untrack(() => props.wanted));
    const [note, setNote] = createSignal<{ tone: "" | "ok" | "bad"; text: string }>({
        tone: "",
        text: "Lowercase letters, numbers and hyphens.",
    });
    const [free, setFree] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [peek, setPeek] = createSignal(false);
    const blocksByKey = new Map<string, Block[]>();

    const blocksFor = (key: string) => {
        const known = blocksByKey.get(key);
        if (known) return known;
        const definition = sectionDefinition(key);
        const blocks = definition ? makeSection(definition, makeId) : [];
        blocksByKey.set(key, blocks);
        return blocks;
    };
    const page = createMemo<Page>(() => {
        const wordmark = mark();
        let next: Page = {
            version: PAGE_VERSION,
            look: look(),
            header: {
                layout: "look",
                name: name().trim() || "Your name",
                links: [],
                ...(wordmark !== "plain"
                    ? { wordmark: wordmark as (typeof wordmarks)[number] }
                    : {}),
            },
            blocks: [],
        };
        const chosen = order().filter((key) => picked().includes(key));
        chosen.forEach((key, i) => {
            next = addSection(next, blocksFor(key), i);
        });
        return next;
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    createEffect(() => {
        const value = normaliseHandle(handle());
        clearTimeout(timer);
        setFree(false);
        if (step() !== 4) return;
        if (!value) {
            setNote({ tone: "", text: "Lowercase letters, numbers and hyphens." });
            return;
        }
        setNote({ tone: "", text: "Checking" });
        timer = setTimeout(() => {
            fetch(routes.handleCheck(value))
                .then(async (res) => {
                    if (normaliseHandle(handle()) !== value) return;
                    if (!res.ok) throw new Error("check failed");
                    const body = (await res.json()) as HandleResponse;
                    setFree(body.available);
                    setNote({ tone: body.available ? "ok" : "bad", text: body.message });
                })
                .catch(() => {
                    setNote({
                        tone: "bad",
                        text: "We couldn't check that. Try again in a moment.",
                    });
                });
        }, 250);
    });
    onCleanup(() => {
        clearTimeout(timer);
    });

    const next = () => {
        const current = step();
        if (current === 0 && !name().trim()) return;
        if (current === 3 && !handle()) setHandle(toHandle(name()));
        if (current < 4) {
            setStep(current + 1);
            return;
        }
        if (!free() || busy()) return;
        setBusy(true);
        props
            .onDone(normaliseHandle(handle()), page())
            .then((problem) => {
                setBusy(false);
                if (problem) {
                    setFree(false);
                    setNote({ tone: "bad", text: problem });
                }
            })
            .catch(() => {
                setBusy(false);
                setNote({ tone: "bad", text: "We couldn't reach Tondo. Please try again." });
            });
    };
    const footLabel = () => {
        const count = picked().length;
        switch (step()) {
            case 0:
                return "Continue";
            case 1:
                return count
                    ? `Continue with ${String(count)} section${count > 1 ? "s" : ""}`
                    : "Start with an empty page";
            case 2:
                return "Use this logo";
            case 3:
                return `Use ${looks[look()].label}`;
            default:
                return busy() ? "Setting up your page" : "Start editing";
        }
    };

    const startSort = (key: string, e: PointerEvent, box: HTMLElement) => {
        e.preventDefault();
        e.stopPropagation();
        const move = (ev: PointerEvent) => {
            const others = [...box.children].filter((node) => node.getAttribute("data-id") !== key);
            const after = others.findIndex((node) => {
                const r = node.getBoundingClientRect();
                return ev.clientY < r.top + r.height / 2;
            });
            const keys = others.map((node) => node.getAttribute("data-id") ?? "");
            keys.splice(after < 0 ? keys.length : after, 0, key);
            setOrder(keys);
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };
    const [checks, setChecks] = createSignal<HTMLDivElement>();

    return (
        <div class="flow" classList={{ peeking: peek() }}>
            <div class="step">
                <div class="step-top">
                    <div class="brand">
                        <i
                            ref={(el) => {
                                el.innerHTML = LOGO;
                            }}
                        />
                        <span>Tondo</span>
                    </div>
                    <div class="bar">
                        <i style={{ width: `${String(((step() + 1) / STEPS) * 100)}%` }} />
                    </div>
                </div>
                <div class="step-body">
                    <div class="step-in">
                        <Show when={step() === 0}>
                            <h1>Let's make your page</h1>
                            <p class="lead">
                                What should it be called? You can change anything later.
                            </p>
                            <label class="lbl" for="start-name">
                                Your name, or your business
                            </label>
                            <input
                                class="big"
                                id="start-name"
                                autofocus
                                autocomplete="off"
                                placeholder="Maya Okafor"
                                value={name()}
                                onInput={(e) => setName(e.currentTarget.value.slice(0, 80))}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") next();
                                }}
                            />
                            <div class="gapped">
                                <span class="lbl">What's it mostly for?</span>
                                <div class="chips">
                                    <For each={USES}>
                                        {([id, label, picks]) => (
                                            <button
                                                type="button"
                                                class="chip"
                                                aria-pressed={use() === id}
                                                onClick={() => {
                                                    setUse(id);
                                                    setPicked([...picks]);
                                                }}
                                            >
                                                {label}
                                            </button>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </Show>
                        <Show when={step() === 1}>
                            <h1>What goes on it?</h1>
                            <p class="lead">
                                Tick what you'd like. It's already designed, so you only fill in
                                your details.
                            </p>
                            <div class="checks" id="checks" ref={setChecks}>
                                <For each={order()}>
                                    {(key) => {
                                        const definition = sectionDefinition(key);
                                        const usable = () =>
                                            definition ? sectionAvailable(definition) : false;
                                        const on = () => picked().includes(key);
                                        const toggle = () => {
                                            if (!usable()) return;
                                            setPicked((was) =>
                                                was.includes(key)
                                                    ? was.filter((other) => other !== key)
                                                    : [...was, key],
                                            );
                                        };
                                        return (
                                            <div
                                                class="check"
                                                classList={{ on: on(), soon: !usable() }}
                                                data-id={key}
                                                role="checkbox"
                                                aria-checked={on()}
                                                aria-disabled={!usable()}
                                                tabindex={usable() ? 0 : -1}
                                                onClick={toggle}
                                                onKeyDown={(e) => {
                                                    if (e.key === " " || e.key === "Enter") {
                                                        e.preventDefault();
                                                        toggle();
                                                    }
                                                }}
                                            >
                                                <span
                                                    class="grip"
                                                    ref={(el) => {
                                                        el.innerHTML = GRIP;
                                                    }}
                                                    onPointerDown={(e) => {
                                                        const box = checks();
                                                        if (box) startSort(key, e, box);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                />
                                                <span class="tico">
                                                    <Glyph name={definition?.icon ?? "link"} />
                                                </span>
                                                <span>
                                                    <b>{definition?.name}</b>
                                                    <small>{definition?.why}</small>
                                                </span>
                                                <Show
                                                    when={usable()}
                                                    fallback={<em class="soon-tag">Soon</em>}
                                                >
                                                    <span class="tick">
                                                        <Show when={on()}>
                                                            <Glyph name="check" />
                                                        </Show>
                                                    </span>
                                                </Show>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </Show>
                        <Show when={step() === 2}>
                            <h1>A logo from your name</h1>
                            <p class="lead">
                                Pick one that feels like you. Each one follows your look's colours.
                            </p>
                            <div class="marks" id="marks">
                                <For each={["plain", ...wordmarks]}>
                                    {(id) => (
                                        <button
                                            type="button"
                                            class="mark-t"
                                            data-mark={id}
                                            aria-pressed={mark() === id}
                                            onClick={() => setMark(id)}
                                        >
                                            <span
                                                class={
                                                    id === "plain"
                                                        ? "mark-plain"
                                                        : `mark-s mark-${id}`
                                                }
                                                style={{ "--mark-size": `${String(markSize())}px` }}
                                            >
                                                {id === "poster" ? name().toUpperCase() : name()}
                                            </span>
                                            <em>{WORDMARK_LABELS[id]}</em>
                                        </button>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <Show when={step() === 3}>
                            <h1>Choose your look</h1>
                            <p class="lead">
                                Colours, fonts and shapes, all chosen to go together. Tap one to see
                                it.
                            </p>
                            <LookTiles page={page} onPick={setLook} />
                        </Show>
                        <Show when={step() === 4}>
                            <h1>Choose your address</h1>
                            <p class="lead">This is the link you'll share.</p>
                            <label class="lbl" for="start-handle">
                                Your address
                            </label>
                            <div class="addr">
                                tondo.page/
                                <input
                                    id="start-handle"
                                    autocomplete="off"
                                    autocapitalize="off"
                                    spellcheck={false}
                                    value={handle()}
                                    onInput={(e) => setHandle(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") next();
                                    }}
                                />
                            </div>
                            <p class={`note ${note().tone}`} role="status" id="start-note">
                                {note().text}
                            </p>
                        </Show>
                    </div>
                </div>
                <div class="step-foot">
                    <div>
                        <Show when={step() > 0}>
                            <button
                                type="button"
                                class="ghost-b"
                                onClick={() => setStep((was) => was - 1)}
                            >
                                Back
                            </button>
                        </Show>
                        <button
                            type="button"
                            class="go"
                            data-next
                            disabled={
                                (step() === 0 && !name().trim()) ||
                                (step() === 4 && (!free() || busy()))
                            }
                            onClick={next}
                        >
                            {footLabel()}
                        </button>
                    </div>
                </div>
            </div>
            <div class="stage">
                <Phone>
                    <LivePage page={page()} />
                </Phone>
            </div>
            <button type="button" class="peek" onClick={() => setPeek((was) => !was)}>
                {peek() ? "Back" : "See my page"}
            </button>
        </div>
    );
}
