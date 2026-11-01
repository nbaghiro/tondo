import { demoPhotos, readLink } from "@tondo/page";
import type {
    BlockValues,
    DateTimeField,
    Field,
    ListField,
    Photo,
    SourceOption,
} from "@tondo/page";
import { createEffect, createSignal, For, Match, onMount, Show, Switch } from "solid-js";
import { loadPhotos, uploadPhoto } from "../lib/api";
import { Icon } from "./Icon";

/** Sets a value on whatever owns these fields. False means it wasn't allowed. */
export type SetValue = (key: string, value: unknown) => boolean;

export interface FieldProps {
    field: Field;
    values: () => BlockValues;
    set: SetValue;
    /** What a new block started with, which a recognised link may replace. */
    defaults?: Readonly<Record<string, unknown>> | undefined;
    /** Where photos are served from. */
    assets: string;
}

// One list for every picker on the screen, so a new upload appears in all of them.
const [myPhotos, setMyPhotos] = createSignal<string[]>([]);
let photosLoaded = false;

const asText = (value: unknown) => (typeof value === "string" ? value : "");
const asList = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function Label(props: { text: string; extra?: string; near?: boolean }) {
    return (
        <div class="fd-l">
            <span>{props.text}</span>
            <Show when={props.extra}>
                <small classList={{ "fd-c": true, near: props.near }}>{props.extra}</small>
            </Show>
        </div>
    );
}

function TextInput(props: FieldProps & { long: boolean }) {
    const field = () => props.field as Extract<Field, { kind: "text" | "longText" }>;
    const value = () => asText(props.values()[props.field.key]);
    const left = () => field().max - value().length;
    // Limits only appear when someone gets near them.
    const near = () => value().length >= field().max * 0.75;
    const onInput = (next: string) => {
        props.set(props.field.key, next);
    };
    return (
        <div class="fd">
            <Label
                text={props.field.label}
                extra={near() ? `${String(left())} left` : ""}
                near={left() <= field().max * 0.05}
            />
            <Show
                when={props.long}
                fallback={
                    <input
                        class="in"
                        aria-label={props.field.label}
                        maxLength={field().max}
                        placeholder={field().placeholder}
                        value={value()}
                        onInput={(e) => {
                            onInput(e.currentTarget.value);
                        }}
                    />
                }
            >
                <textarea
                    class="in"
                    aria-label={props.field.label}
                    rows="3"
                    maxLength={field().max}
                    value={value()}
                    onInput={(e) => {
                        onInput(e.currentTarget.value);
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${String(e.currentTarget.scrollHeight + 2)}px`;
                    }}
                />
            </Show>
            <Show when={props.field.hint}>
                <p class="fd-h">{props.field.hint}</p>
            </Show>
        </div>
    );
}

function LinkInput(props: FieldProps) {
    const field = () => props.field as Extract<Field, { kind: "link" }>;
    const saved = () => asText(props.values()[props.field.key]);
    const shown = (url: string) => url.replace(/^(mailto:|tel:)/, "");
    // What's typed stays here until it's a usable address, so half a link is never saved.
    const [typed, setTyped] = createSignal(shown(saved()));
    let input: HTMLInputElement | undefined;
    createEffect(() => {
        const current = saved();
        if (document.activeElement !== input) setTyped(shown(current));
    });
    const reading = () => readLink(typed());
    const commit = (raw: string) => {
        setTyped(raw);
        const next = readLink(raw);
        if (next.state === "empty") props.set(props.field.key, "");
        if (next.state !== "ok") return;
        props.set(props.field.key, next.url);
        const { fills, sets } = field();
        if (fills && next.title) {
            const current = asText(props.values()[fills]);
            if (!current || current === props.defaults?.[fills]) props.set(fills, next.title);
        }
        if (sets) props.set(sets, next.icon);
    };
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <input
                class="in"
                ref={(el) => {
                    input = el;
                }}
                aria-label={props.field.label}
                placeholder="Paste a link, email or phone number"
                inputMode="url"
                autocomplete="off"
                spellcheck={false}
                value={typed()}
                onInput={(e) => {
                    commit(e.currentTarget.value);
                }}
            />
            <Switch>
                <Match when={reading().state === "bad"}>
                    <p class="lk-m bad" role="status">
                        {(reading() as { message: string }).message}
                    </p>
                </Match>
                <Match when={reading().state === "ok"}>
                    <p class="lk-m ok" role="status">
                        <Icon name="check" />
                        {(reading() as { label: string }).label}
                    </p>
                </Match>
            </Switch>
        </div>
    );
}

function PhotoGrid(props: {
    assets: string;
    current?: string | undefined;
    onPick: (file: string) => void;
}) {
    const [uploading, setUploading] = createSignal(false);
    const [error, setError] = createSignal("");
    const tile = (file: string, label: string) => (
        <button
            type="button"
            aria-label={label}
            classList={{ on: props.current === file }}
            style={{ "background-image": `url(${props.assets}${file})` }}
            onClick={() => {
                props.onPick(file);
            }}
        />
    );
    const onFile = (file: File | undefined) => {
        if (!file) return;
        setUploading(true);
        setError("");
        uploadPhoto(file)
            .then((result) => {
                setUploading(false);
                if ("error" in result) {
                    setError(result.error);
                    return;
                }
                setMyPhotos((was) => [result.file, ...was.filter((f) => f !== result.file)]);
                props.onPick(result.file);
            })
            .catch(() => {
                setUploading(false);
                setError("That photo didn't upload. Please try again.");
            });
    };
    onMount(() => {
        if (photosLoaded) return;
        photosLoaded = true;
        loadPhotos()
            .then((files) => setMyPhotos(files))
            .catch(() => {
                photosLoaded = false;
            });
    });
    return (
        <div class="picker">
            <label class="mini upload" classList={{ busy: uploading() }}>
                {uploading() ? "Uploading" : "Upload a photo"}
                <input
                    class="sr"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading()}
                    onChange={(e) => {
                        onFile(e.currentTarget.files?.[0]);
                        e.currentTarget.value = "";
                    }}
                />
            </label>
            <Show when={error()}>
                <small class="fd-e" role="alert">
                    {error()}
                </small>
            </Show>
            <Show when={myPhotos().length}>
                <h4 class="picker-h">Your photos</h4>
                <div class="pick pick-mine">
                    <For each={myPhotos()}>{(file) => tile(file, "Use one of your photos")}</For>
                </div>
            </Show>
            <h4 class="picker-h">Library</h4>
            <div class="pick">
                <For each={demoPhotos}>
                    {(file) => tile(file, `Use photo ${file.replace(".jpg", "")}`)}
                </For>
            </div>
        </div>
    );
}

/** The photo with a dot on the part that matters. The frame crops around it. */
function CropPoint(props: {
    assets: string;
    photo: Photo;
    onMove: (x: number, y: number) => void;
}) {
    const x = () => props.photo.x ?? 50;
    const y = () => props.photo.y ?? 50;
    const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
    const fromPointer = (e: PointerEvent, el: HTMLElement) => {
        const box = el.getBoundingClientRect();
        props.onMove(
            clamp(((e.clientX - box.left) / box.width) * 100),
            clamp(((e.clientY - box.top) / box.height) * 100),
        );
    };
    return (
        <div
            class="ph-img"
            tabindex="0"
            role="slider"
            aria-label="Crop point. Drag, or use the arrow keys"
            aria-valuetext={`${String(x())}% across, ${String(y())}% down`}
            aria-valuenow={x()}
            style={{ "background-image": `url(${props.assets}${props.photo.file})` }}
            onPointerDown={(e) => {
                const el = e.currentTarget;
                el.setPointerCapture(e.pointerId);
                fromPointer(e, el);
                const move = (m: PointerEvent) => {
                    fromPointer(m, el);
                };
                el.addEventListener("pointermove", move);
                el.addEventListener(
                    "pointerup",
                    () => {
                        el.removeEventListener("pointermove", move);
                    },
                    { once: true },
                );
            }}
            onKeyDown={(e) => {
                const step: Record<string, readonly [number, number]> = {
                    ArrowLeft: [-5, 0],
                    ArrowRight: [5, 0],
                    ArrowUp: [0, -5],
                    ArrowDown: [0, 5],
                };
                const delta = step[e.key];
                if (!delta) return;
                e.preventDefault();
                props.onMove(clamp(x() + delta[0]), clamp(y() + delta[1]));
            }}
        >
            <i class="ph-dot" style={{ left: `${String(x())}%`, top: `${String(y())}%` }} />
        </div>
    );
}

const movedTo = (photo: Photo, x: number, y: number): Photo => {
    const { x: _x, y: _y, ...rest } = photo;
    return { ...rest, ...(x === 50 ? {} : { x }), ...(y === 50 ? {} : { y }) };
};

function PhotoInput(props: FieldProps) {
    const [open, setOpen] = createSignal(false);
    const photo = () => props.values()[props.field.key] as Photo | undefined;
    const pick = (file: string) => {
        props.set(props.field.key, { file });
        setOpen(false);
    };
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <Show
                when={photo()}
                fallback={
                    <button type="button" class="ph-empty" onClick={() => setOpen((is) => !is)}>
                        <Icon name="plus" />
                        Add a photo
                    </button>
                }
            >
                {(current) => (
                    <div class="ph">
                        <CropPoint
                            assets={props.assets}
                            photo={current()}
                            onMove={(x, y) => {
                                props.set(props.field.key, movedTo(current(), x, y));
                            }}
                        />
                        <div class="ph-side">
                            <small>Drag the dot to the part that matters.</small>
                            <button type="button" class="mini" onClick={() => setOpen((is) => !is)}>
                                Replace
                            </button>
                            <button
                                type="button"
                                class="mini quiet"
                                onClick={() => {
                                    props.set(props.field.key, undefined);
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </Show>
            <Show when={open()}>
                <PhotoGrid assets={props.assets} current={photo()?.file} onPick={pick} />
            </Show>
        </div>
    );
}

/** Reordering by dragging, with a mouse or a finger. Keyboards use the arrow keys on the handle. */
function startReorder(
    e: PointerEvent,
    root: HTMLElement,
    selector: string,
    from: number,
    onDone: (to: number) => void,
) {
    const items = [...root.querySelectorAll<HTMLElement>(selector)];
    const moving = items[from];
    if (!moving) return;
    let to = from;
    let moved = false;
    const onMove = (m: PointerEvent) => {
        if (!moved && Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) < 5) return;
        moved = true;
        moving.classList.add("is-drag");
        moving.style.transform = `translate(${String(m.clientX - e.clientX)}px,${String(m.clientY - e.clientY)}px)`;
        let best = Infinity;
        items.forEach((item, i) => {
            const box = item.getBoundingClientRect();
            const distance = Math.hypot(
                m.clientX - (box.left + box.width / 2),
                m.clientY - (box.top + box.height / 2),
            );
            if (item !== moving && distance < best) {
                best = distance;
                to = i;
            }
        });
        items.forEach((item, i) => item.classList.toggle("is-target", i === to && to !== from));
    };
    const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        moving.style.transform = "";
        moving.classList.remove("is-drag");
        for (const item of items) item.classList.remove("is-target");
        if (moved && to !== from) onDone(to);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
}

const moveItem = <T,>(list: readonly T[], from: number, to: number): T[] => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    if (item !== undefined) next.splice(to, 0, item);
    return next;
};

type ListPhoto = Photo & { id: string; caption?: string };

function PhotoListInput(props: FieldProps) {
    const field = () => props.field as Extract<Field, { kind: "photoList" }>;
    const photos = () => asList<ListPhoto>(props.values()[props.field.key]);
    const [adding, setAdding] = createSignal(false);
    const [openId, setOpenId] = createSignal<string | null>(null);
    const save = (next: ListPhoto[]) => props.set(props.field.key, next);
    const update = (id: string, change: (photo: ListPhoto) => ListPhoto) =>
        save(photos().map((photo) => (photo.id === id ? change(photo) : photo)));
    const opened = () => photos().find((photo) => photo.id === openId());
    let grid: HTMLDivElement | undefined;
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <div
                class="phs"
                ref={(el) => {
                    grid = el;
                }}
            >
                <For each={photos()}>
                    {(photo, index) => (
                        <button
                            type="button"
                            class="phs-i"
                            classList={{ on: openId() === photo.id }}
                            aria-label={`Photo ${String(index() + 1)}. Open to edit, or drag to reorder`}
                            style={{ "background-image": `url(${props.assets}${photo.file})` }}
                            onClick={() => setOpenId((id) => (id === photo.id ? null : photo.id))}
                            onPointerDown={(e) => {
                                if (grid) {
                                    startReorder(e, grid, ".phs-i", index(), (to) => {
                                        save(moveItem(photos(), index(), to));
                                    });
                                }
                            }}
                        />
                    )}
                </For>
                <Show when={photos().length < field().max}>
                    <button
                        type="button"
                        class="phs-add"
                        aria-label="Add photos"
                        onClick={() => setAdding((is) => !is)}
                    >
                        <Icon name="plus" />
                    </button>
                </Show>
            </div>
            <Show when={!photos().length && !adding()}>
                <p class="fd-h">Add a few photos. Six works well in most layouts.</p>
            </Show>
            <Show when={adding()}>
                <PhotoGrid
                    assets={props.assets}
                    onPick={(file) => {
                        save([...photos(), { id: crypto.randomUUID(), file }]);
                    }}
                />
            </Show>
            <Show when={opened()} keyed>
                {(photo) => (
                    <div class="phs-open">
                        <div class="ph">
                            <CropPoint
                                assets={props.assets}
                                photo={photo}
                                onMove={(x, y) => {
                                    update(photo.id, (p) => movedTo(p, x, y) as ListPhoto);
                                }}
                            />
                            <div class="ph-side">
                                <small>Drag the dot to the part that matters.</small>
                                <button
                                    type="button"
                                    class="mini quiet"
                                    onClick={() => {
                                        save(photos().filter((p) => p.id !== photo.id));
                                        setOpenId(null);
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        <input
                            class="in"
                            aria-label="Caption"
                            placeholder="Caption, shown in the carousel"
                            maxLength={60}
                            value={photo.caption ?? ""}
                            onChange={(e) => {
                                const caption = e.currentTarget.value;
                                update(photo.id, ({ caption: _old, ...rest }) =>
                                    caption ? { ...rest, caption } : rest,
                                );
                            }}
                        />
                    </div>
                )}
            </Show>
        </div>
    );
}

export function Toggle(props: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    hint?: string | undefined;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div class="fd">
            <label class="sw-row">
                <span>{props.label}</span>
                <input
                    type="checkbox"
                    class="sw"
                    role="switch"
                    checked={props.checked}
                    disabled={props.disabled}
                    onChange={(e) => {
                        props.onChange(e.currentTarget.checked);
                    }}
                />
            </label>
            <Show when={props.hint}>
                <p class="fd-h">{props.hint}</p>
            </Show>
        </div>
    );
}

function ChoiceInput(props: FieldProps) {
    const field = () => props.field as Extract<Field, { kind: "choice" }>;
    const value = () => asText(props.values()[props.field.key]);
    const short = () =>
        field().options.length <= 3 && field().options.every(([, label]) => label.length < 12);
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <Show
                when={short()}
                fallback={
                    <select
                        class="in"
                        aria-label={props.field.label}
                        onChange={(e) => {
                            props.set(props.field.key, e.currentTarget.value);
                        }}
                    >
                        <For each={field().options}>
                            {([option, label]) => (
                                <option value={option} selected={value() === option}>
                                    {label}
                                </option>
                            )}
                        </For>
                    </select>
                }
            >
                <div class="seg" role="radiogroup" aria-label={props.field.label}>
                    <For each={field().options}>
                        {([option, label]) => (
                            <button
                                type="button"
                                role="radio"
                                aria-checked={value() === option}
                                classList={{ on: value() === option }}
                                onClick={() => {
                                    props.set(props.field.key, option);
                                }}
                            >
                                {label}
                            </button>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}

// Saved as an exact instant, and shown in the person's own time.
const toLocalInput = (iso: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function DateTimeInput(props: FieldProps) {
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <input
                class="in"
                type="datetime-local"
                aria-label={props.field.label}
                value={
                    (props.field as DateTimeField).local
                        ? asText(props.values()[props.field.key])
                        : toLocalInput(asText(props.values()[props.field.key]))
                }
                onChange={(e) => {
                    const local = e.currentTarget.value;
                    if ((props.field as DateTimeField).local) {
                        props.set(props.field.key, local || undefined);
                        return;
                    }
                    props.set(props.field.key, local ? new Date(local).toISOString() : undefined);
                }}
            />
        </div>
    );
}

function ListInput(props: FieldProps) {
    const field = () => props.field as ListField;
    const items = () =>
        asList<Record<string, unknown> & { id: string }>(props.values()[props.field.key]);
    const [openId, setOpenId] = createSignal<string | null>(null);
    const save = (next: unknown[]) => props.set(props.field.key, next);
    let box: HTMLDivElement | undefined;
    const titleOf = (item: Record<string, unknown>) => {
        const raw = asText(item[field().title]);
        const titleField = field().fields.find((f) => f.key === field().title);
        if (titleField?.kind === "choice") {
            return titleField.options.find(([value]) => value === raw)?.[1] ?? raw;
        }
        return raw || "Untitled";
    };
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <Show when={props.field.hint}>
                <p class="fd-h">{props.field.hint}</p>
            </Show>
            <div
                class="ls"
                ref={(el) => {
                    box = el;
                }}
            >
                <Show when={!items().length}>
                    <div class="ls-empty">
                        Nothing here yet. It won't show on your page until you add something.
                    </div>
                </Show>
                <For each={items()}>
                    {(item, index) => (
                        <div class="ls-i" classList={{ open: openId() === item.id }}>
                            <div class="ls-h">
                                <span
                                    class="ls-g"
                                    tabindex="0"
                                    role="button"
                                    aria-label={`Move ${titleOf(item)}. Drag, or use the up and down keys`}
                                    onPointerDown={(e) => {
                                        if (box) {
                                            startReorder(e, box, ".ls-i", index(), (to) => {
                                                save(moveItem(items(), index(), to));
                                            });
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        const to =
                                            e.key === "ArrowUp"
                                                ? index() - 1
                                                : e.key === "ArrowDown"
                                                  ? index() + 1
                                                  : -1;
                                        if (to < 0 || to >= items().length) return;
                                        e.preventDefault();
                                        const handle = e.currentTarget;
                                        save(moveItem(items(), index(), to));
                                        requestAnimationFrame(() => {
                                            handle.focus();
                                        });
                                    }}
                                >
                                    <Icon name="grip" />
                                </span>
                                <button
                                    type="button"
                                    class="ls-t"
                                    aria-expanded={openId() === item.id}
                                    onClick={() => {
                                        setOpenId((id) => (id === item.id ? null : item.id));
                                    }}
                                >
                                    <span class="ls-n">{titleOf(item)}</span>
                                    <Icon name={openId() === item.id ? "up" : "down"} />
                                </button>
                            </div>
                            <Show when={openId() === item.id}>
                                <div class="ls-b">
                                    <For
                                        each={field().fields.filter(
                                            (inner) =>
                                                !inner.when ||
                                                inner.when({ ...props.values(), ...item }),
                                        )}
                                    >
                                        {(inner) => (
                                            <FieldView
                                                field={inner}
                                                assets={props.assets}
                                                values={() =>
                                                    items().find((it) => it.id === item.id) ?? item
                                                }
                                                set={(key, value) =>
                                                    save(
                                                        items().map((it) =>
                                                            it.id === item.id
                                                                ? { ...it, [key]: value }
                                                                : it,
                                                        ),
                                                    )
                                                }
                                            />
                                        )}
                                    </For>
                                    <button
                                        type="button"
                                        class="mini quiet"
                                        onClick={() => {
                                            save(items().filter((it) => it.id !== item.id));
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </Show>
                        </div>
                    )}
                </For>
                <button
                    type="button"
                    class="ls-add"
                    disabled={items().length >= field().max}
                    onClick={() => {
                        const id = crypto.randomUUID();
                        save([...items(), { id, ...field().make() }]);
                        setOpenId(id);
                    }}
                >
                    <Icon name="plus" />
                    {items().length >= field().max
                        ? `That's the most this holds (${String(field().max)})`
                        : field().add}
                </button>
            </div>
        </div>
    );
}

export type ConnectionState = "none" | "connected" | "broken";

export function SourceInput(
    props: FieldProps & { connection?: ConnectionState; onConnect?: () => void },
) {
    const field = () => props.field as Extract<Field, { kind: "source" }>;
    const available = (): readonly SourceOption[] => field().options.filter((o) => !o.held);
    const value = () => asText(props.values()[props.field.key]) || "manual";
    const label = () => field().options.find((o) => o.value === value())?.label ?? "";
    const state = () => props.connection ?? "none";
    return (
        <div class="fd">
            <div class="srcs" role="radiogroup" aria-label={props.field.label}>
                <For each={available()}>
                    {(option) => (
                        <button
                            type="button"
                            role="radio"
                            class="src"
                            aria-checked={value() === option.value}
                            classList={{ on: value() === option.value }}
                            onClick={() => {
                                props.set(props.field.key, option.value);
                            }}
                        >
                            {option.label}
                        </button>
                    )}
                </For>
            </div>
            <Show when={value() !== "manual"}>
                <div class={`conn ${state()}`}>
                    <div>
                        <b>
                            {state() === "connected"
                                ? `${label()} connected`
                                : state() === "broken"
                                  ? `${label()} stopped connecting`
                                  : `Connect ${label()}`}
                        </b>
                        <small>
                            {state() === "connected"
                                ? "Your latest posts appear here by themselves."
                                : state() === "broken"
                                  ? "Your page keeps showing the last items. Reconnect to get new ones."
                                  : "We only read your own posts, and save a copy so your page stays fast."}
                        </small>
                    </div>
                    <Show when={state() !== "connected"}>
                        <button
                            type="button"
                            class="mini solid"
                            onClick={() => props.onConnect?.()}
                        >
                            {state() === "broken" ? "Reconnect" : "Connect"}
                        </button>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

function FileInput(props: FieldProps) {
    const file = () =>
        props.values()[props.field.key] as { name: string; size: number } | undefined;
    let input: HTMLInputElement | undefined;
    return (
        <div class="fd">
            <Label text={props.field.label} />
            <input
                type="file"
                hidden
                ref={(el) => {
                    input = el;
                }}
                onChange={(e) => {
                    const chosen = e.currentTarget.files?.[0];
                    if (chosen) {
                        props.set(props.field.key, { name: chosen.name, size: chosen.size });
                    }
                }}
            />
            <Show
                when={file()}
                fallback={
                    <button type="button" class="ph-empty" onClick={() => input?.click()}>
                        <Icon name="plus" />
                        Choose a file
                    </button>
                }
            >
                {(current) => (
                    <div class="file">
                        <span>
                            <b>{current().name}</b>
                            <small>{`${(current().size / 1_000_000).toFixed(1)} MB`}</small>
                        </span>
                        <button
                            type="button"
                            class="mini quiet"
                            onClick={() => {
                                props.set(props.field.key, undefined);
                            }}
                        >
                            Remove
                        </button>
                    </div>
                )}
            </Show>
        </div>
    );
}

export function FieldView(props: FieldProps) {
    return (
        <Switch>
            <Match when={props.field.kind === "text"}>
                <TextInput {...props} long={false} />
            </Match>
            <Match when={props.field.kind === "longText"}>
                <TextInput {...props} long={true} />
            </Match>
            <Match when={props.field.kind === "link"}>
                <LinkInput {...props} />
            </Match>
            <Match when={props.field.kind === "photo"}>
                <PhotoInput {...props} />
            </Match>
            <Match when={props.field.kind === "photoList"}>
                <PhotoListInput {...props} />
            </Match>
            <Match when={props.field.kind === "toggle"}>
                <Toggle
                    label={props.field.label}
                    checked={Boolean(props.values()[props.field.key])}
                    hint={props.field.hint}
                    onChange={(checked) => {
                        props.set(props.field.key, checked);
                    }}
                />
            </Match>
            <Match when={props.field.kind === "choice"}>
                <ChoiceInput {...props} />
            </Match>
            <Match when={props.field.kind === "dateTime"}>
                <DateTimeInput {...props} />
            </Match>
            <Match when={props.field.kind === "list"}>
                <ListInput {...props} />
            </Match>
            <Match when={props.field.kind === "file"}>
                <FileInput {...props} />
            </Match>
        </Switch>
    );
}
