import { isFreeLook, lookNames } from "@tondo/page";
import type { LookName, Page, PageStyle } from "@tondo/page";
import {
    fontChoices,
    headerArtChoices,
    lookColours,
    lookVars,
    looks,
    makeTheme,
    parseColour,
    strongColourLooks,
    themeOf,
} from "@tondo/render";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { brandFromPhoto } from "../lib/photo-colour";
import type { EditorState } from "../state/document";
import { needsPro } from "../state/plan";
import { FieldView } from "./Fields";
import { Glyph } from "./Panels";
import { ProLabel } from "./Parts";

const TILES = "/photos/looks/";
const FONT_ORIGIN = "https://fonts.googleapis.com/css2?";

type Kind = "light" | "dark" | "bright";

function kindOf(name: LookName): Kind {
    const bg = parseColour(lookVars(name, looks[name])["--bg"]) ?? "#ffffff";
    const n = parseInt(bg.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (light < 0.3) return "dark";
    const max = Math.max(r, g, b);
    return max && (max - Math.min(r, g, b)) / max > 0.28 ? "bright" : "light";
}

// Mixed so the grid reads as a range and not as a block of similar pages.
const ORDER: LookName[] = (() => {
    const by: Record<Kind, LookName[]> = { light: [], dark: [], bright: [] };
    for (const name of lookNames) by[kindOf(name)].push(name);
    const order: LookName[] = [];
    while (by.light.length || by.dark.length || by.bright.length) {
        for (let i = 0; i < 2; i++) {
            const next = by.light.shift();
            if (next) order.push(next);
        }
        const dark = by.dark.shift();
        if (dark) order.push(dark);
        const bright = by.bright.shift();
        if (bright) order.push(bright);
    }
    return order;
})();

const FILTERS = [
    ["all", "All"],
    ["light", "Light"],
    ["dark", "Dark"],
    ["bright", "Colourful"],
] as const;

/** Each tile shows a look's real colours, fonts, button shape and art. */
export function LookTiles(props: { page: () => Page; onPick: (look: LookName) => void }) {
    const [filter, setFilter] = createSignal<"all" | Kind>("all");
    const fonts = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const name = (entry.target as HTMLElement).dataset["look"] as LookName;
            fonts.unobserve(entry.target);
            const id = `tile-font-${name}`;
            if (document.getElementById(id)) continue;
            const link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href = `${FONT_ORIGIN}${looks[name].fonts}&display=swap`;
            document.head.append(link);
        }
    });
    onCleanup(() => {
        fonts.disconnect();
    });
    const kept = () => {
        const colour = props.page().style?.colour;
        return colour && (colour.mode === "brand" || colour.mode === "photo") ? colour.brand : null;
    };
    // On Free, free looks come first, keeping the mix within each group.
    const inOrder = () =>
        needsPro("design")
            ? [...ORDER.filter(isFreeLook), ...ORDER.filter((name) => !isFreeLook(name))]
            : ORDER;
    const isPro = (name: LookName) => needsPro("design") && !isFreeLook(name);
    const varsFor = (name: LookName) => {
        const brand = kept();
        return { ...lookVars(name, looks[name]), ...(brand ? makeTheme(brand).vars : {}) };
    };
    return (
        <>
            <div class="filters" role="group" aria-label="Filter looks">
                <For each={FILTERS}>
                    {([id, label]) => (
                        <button
                            type="button"
                            class="chip"
                            aria-pressed={filter() === id}
                            onClick={() => setFilter(id)}
                        >
                            {label}
                        </button>
                    )}
                </For>
            </div>
            <div class="tiles">
                <For
                    each={inOrder().filter(
                        (name) => filter() === "all" || kindOf(name) === filter(),
                    )}
                >
                    {(name) => (
                        <button
                            type="button"
                            class="tile"
                            data-look={name}
                            aria-label={`${looks[name].label} look${isPro(name) ? ", part of Pro" : ""}`}
                            aria-pressed={props.page().look === name}
                            ref={(el) => {
                                fonts.observe(el);
                            }}
                            style={{
                                ...varsFor(name),
                                "background-image": kept() ? "none" : `url(${TILES}${name}.jpg)`,
                            }}
                            onClick={() => {
                                props.onPick(name);
                            }}
                        >
                            <div class="tile-in">
                                <i />
                                <strong>Aa</strong>
                                <span>Button</span>
                                <span>Button</span>
                            </div>
                            <u>
                                {looks[name].label}
                                <Show when={isPro(name)}>
                                    <small class="pro-label" aria-hidden="true">
                                        Pro
                                    </small>
                                </Show>
                            </u>
                        </button>
                    )}
                </For>
            </div>
        </>
    );
}

function Group(props: {
    id: string;
    open: string;
    onOpen: (id: string) => void;
    label: string;
    value: string;
    children: unknown;
}) {
    const isOpen = () => props.open === props.id;
    return (
        <section class="mg" classList={{ on: isOpen() }}>
            <button
                type="button"
                class="mg-h"
                data-mine={props.id}
                aria-expanded={isOpen()}
                onClick={() => {
                    props.onOpen(isOpen() ? "" : props.id);
                }}
            >
                <b>{props.label}</b>
                <small>{props.value}</small>
                <Glyph name={isOpen() ? "up" : "down2"} />
            </button>
            <Show when={isOpen()}>
                <div class="mg-b">{props.children as never}</div>
            </Show>
        </section>
    );
}

const swatchStyle = (bg: string | undefined, btn: string | undefined) => ({
    "--a": bg ?? "#fff",
    "--b": btn ?? "#000",
});

const PAINTS = [
    ["Rose", ["#c8385f", "#e8876a", "#a42a55", "#f2b56b"]],
    ["Sea", ["#2b5fb8", "#6c8fd6", "#8f7fd6", "#b9c6f2"]],
    ["Garden", ["#4d9a7a", "#8fcfae", "#1f5c4a", "#d3c76a"]],
    ["Sunset", ["#e0672f", "#f4a03c", "#c8441f", "#f7cf7a"]],
    ["Violet", ["#7a45b8", "#b69cf0", "#e7a9d8", "#4e2a86"]],
] as const;

/** The art at the top of the page. It's the same data here and in the header's panel. */
export function TopArt(props: { editor: EditorState }) {
    const page = () => props.editor.page();
    const style = (): PageStyle => page().style ?? {};
    const look = () => page().look;
    const choices = () => headerArtChoices(page());
    const set = (patch: Partial<PageStyle>) => {
        props.editor.setStyle(patch);
    };
    const options = () =>
        [
            ...(choices().none ? ([["solid", "None"]] as const) : []),
            ["gradient", "Soft fade"],
            ["photo", "A photo"],
        ] as const;
    const samePaint = (palette: readonly string[]) => page().paint?.join() === palette.join();
    return (
        <>
            <div class="bgs">
                <button
                    type="button"
                    class="bg-t"
                    aria-pressed={!style().bg}
                    onClick={() => {
                        set({ bg: undefined });
                    }}
                >
                    <i style={{ "background-image": `url(${TILES}${look()}.jpg)` }} />
                    Look's art
                </button>
                <For each={options()}>
                    {([id, label]) => (
                        <button
                            type="button"
                            class="bg-t"
                            data-bg={id}
                            aria-pressed={style().bg === id}
                            onClick={() => {
                                set({ bg: id });
                            }}
                        >
                            <i class={`bg-${id}`} />
                            {label}
                        </button>
                    )}
                </For>
            </div>
            <Show when={!style().bg && choices().paint}>
                <button
                    type="button"
                    class="own-b wide"
                    data-repaint
                    onClick={() => {
                        props.editor.repaint();
                    }}
                >
                    <Glyph name="brush" />
                    Paint it again
                </button>
                <Show when={!style().colour}>
                    <div class="paints" role="group" aria-label="Paint colours">
                        <button
                            type="button"
                            class="paint-o"
                            aria-pressed={!page().paint}
                            onClick={() => {
                                props.editor.setPaint(undefined);
                            }}
                        >
                            The look's
                        </button>
                        <For each={PAINTS}>
                            {([name, palette]) => (
                                <button
                                    type="button"
                                    class="paint-s"
                                    aria-label={`${name} paint`}
                                    title={`${name} paint`}
                                    aria-pressed={samePaint(palette)}
                                    style={{
                                        background: `conic-gradient(${palette.join(",")})`,
                                    }}
                                    onClick={() => {
                                        props.editor.setPaint([...palette]);
                                    }}
                                />
                            )}
                        </For>
                    </div>
                </Show>
            </Show>
            <Show when={style().bg === "photo"}>
                <FieldView
                    assets="/photos/"
                    field={{
                        kind: "photo",
                        key: "bgPhoto",
                        label: "Your background photo",
                        optional: true,
                    }}
                    values={() => style()}
                    set={(_key, value) => {
                        set({ bgPhoto: value as PageStyle["bgPhoto"] });
                        return true;
                    }}
                />
            </Show>
        </>
    );
}

export function MakeItYours(props: { editor: EditorState }) {
    const [open, setOpen] = createSignal("colour");
    const [photoNote, setPhotoNote] = createSignal("");
    const page = () => props.editor.page();
    const style = (): PageStyle => page().style ?? {};
    const look = () => page().look;
    const colours = () => lookColours(look());
    const colour = () => style().colour;
    const set = (patch: Partial<PageStyle>, group?: string) => {
        props.editor.setStyle(patch, group);
    };
    const adjusted = () => {
        const mode = colour()?.mode;
        return mode === "brand" || mode === "photo" ? themeOf(page())?.changed : false;
    };
    const isDarkLook = () => {
        const bg = parseColour(lookVars(look(), looks[look()])["--bg"]) ?? "#ffffff";
        const n = parseInt(bg.slice(1), 16);
        return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 < 0.3;
    };
    const fromPhoto = async () => {
        const file = page().header.photo?.file;
        setPhotoNote("");
        if (!file || file.startsWith("paint-")) {
            setPhotoNote("Add a photo at the top of your page first.");
            return;
        }
        const brand = await brandFromPhoto(`/photos/${file}`).catch(() => null);
        if (brand) set({ colour: { mode: "photo", brand } });
        else setPhotoNote("We couldn't find a clear colour in that photo. Try picking your own.");
    };
    const colourLabel = () => {
        const mode = colour()?.mode;
        if (mode === "brand") return "My colour";
        if (mode === "photo") return "From my photo";
        if (mode === "plain") return "Plain white";
        if (mode === "dark") return "Dark";
        return mode ? "From this look" : "The look's own";
    };
    const fontLabel = () =>
        fontChoices.find((choice) => choice.id === style().font)?.label ?? "The look's own";
    const buttonLabel = () => {
        const parts = [style().shape, style().fill].filter(Boolean) as string[];
        return parts.length
            ? parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(", ")
            : "The look's own";
    };
    const bgLabel = () =>
        ({ solid: "None", gradient: "Soft fade", photo: "A photo" })[style().bg ?? "solid"] &&
        style().bg
            ? { solid: "None", gradient: "Soft fade", photo: "A photo" }[style().bg ?? "solid"]
            : "Look's art";
    const changed = () => Object.keys(style()).length > 0;
    return (
        <>
            <p class="where">
                Start from {looks[look()].label}, then change only what you want. Everything here
                goes together.
            </p>
            <Group id="colour" open={open()} onOpen={setOpen} label="Colours" value={colourLabel()}>
                <div class="sws">
                    <button
                        type="button"
                        class="col-sw col-sw-o"
                        aria-label="The look's own colours"
                        title="The look's own colours"
                        aria-pressed={!colour()}
                        style={{ "background-image": `url(${TILES}${look()}.jpg)` }}
                        onClick={() => {
                            set({ colour: undefined });
                        }}
                    >
                        <i />
                    </button>
                    <For each={colours().colours}>
                        {(brand) => {
                            const theme = () => makeTheme(brand, { dark: isDarkLook() });
                            return (
                                <button
                                    type="button"
                                    class="col-sw"
                                    aria-label="A colour from this look"
                                    title="A colour from this look"
                                    aria-pressed={
                                        colour()?.mode === "preset" && colour()?.brand === brand
                                    }
                                    style={swatchStyle(theme().vars["--bg"], theme().vars["--btn"])}
                                    onClick={() => {
                                        set({ colour: { mode: "preset", brand } });
                                    }}
                                >
                                    <i />
                                </button>
                            );
                        }}
                    </For>
                    <button
                        type="button"
                        class="col-sw"
                        aria-label="Plain white"
                        title="Plain white"
                        aria-pressed={colour()?.mode === "plain"}
                        style={swatchStyle(
                            "#fbfbfc",
                            makeTheme(colours().base, { plain: true }).vars["--btn"],
                        )}
                        onClick={() => {
                            set({ colour: { mode: "plain", brand: colours().base } });
                        }}
                    >
                        <i />
                    </button>
                    <button
                        type="button"
                        class="col-sw"
                        aria-label="Dark"
                        title="Dark"
                        aria-pressed={colour()?.mode === "dark"}
                        style={swatchStyle(
                            makeTheme(colours().base, { dark: true }).vars["--bg"],
                            makeTheme(colours().base, { dark: true }).vars["--btn"],
                        )}
                        onClick={() => {
                            set({ colour: { mode: "dark", brand: colours().base } });
                        }}
                    >
                        <i />
                    </button>
                </div>
                <div class="own">
                    <label
                        class="own-b"
                        aria-pressed={colour()?.mode === "brand"}
                        style={{ "--c": colour()?.mode === "brand" ? colour()?.brand : "#a42a55" }}
                    >
                        <i />
                        My colour
                        <ProLabel for="design" />
                        <input
                            id="mycol"
                            type="color"
                            aria-label="Pick your colour"
                            value={colour()?.brand ?? "#a42a55"}
                            onInput={(e) => {
                                set(
                                    { colour: { mode: "brand", brand: e.currentTarget.value } },
                                    "style:colour",
                                );
                            }}
                        />
                    </label>
                    <button
                        type="button"
                        class="own-b"
                        data-from-photo
                        aria-pressed={colour()?.mode === "photo"}
                        onClick={() => {
                            fromPhoto().catch(() => {
                                setPhotoNote("We couldn't read that photo.");
                            });
                        }}
                    >
                        From my photo
                        <ProLabel for="design" />
                    </button>
                </div>
                <p class="fine">
                    {photoNote() ||
                        (adjusted()
                            ? "We adjusted your colour a little so buttons and text stay easy to read."
                            : "")}
                </p>
                <Show when={strongColourLooks.has(look())}>
                    <p class="fine" data-strong-note>
                        This look has strong colours of its own, so a new colour changes its
                        character more than most.
                    </p>
                </Show>
            </Group>
            <Group id="font" open={open()} onOpen={setOpen} label="Fonts" value={fontLabel()}>
                <div class="fonts">
                    <button
                        type="button"
                        class="ft"
                        aria-pressed={!style().font}
                        onClick={() => {
                            set({ font: undefined });
                        }}
                    >
                        <strong
                            style={{
                                "font-family":
                                    lookVars(look(), looks[look()])["--disp"] ?? "inherit",
                            }}
                        >
                            Aa
                        </strong>
                        <small>The look's own</small>
                    </button>
                    <For each={fontChoices}>
                        {(choice) => (
                            <button
                                type="button"
                                class="ft"
                                data-font={choice.id}
                                aria-pressed={style().font === choice.id}
                                ref={() => {
                                    const id = `pair-${choice.id}`;
                                    if (document.getElementById(id)) return;
                                    const link = document.createElement("link");
                                    link.id = id;
                                    link.rel = "stylesheet";
                                    link.href = `${FONT_ORIGIN}${choice.query}&display=swap`;
                                    document.head.append(link);
                                }}
                                onClick={() => {
                                    set({ font: choice.id });
                                }}
                            >
                                <strong
                                    style={{
                                        "font-family": choice.disp,
                                        "font-weight": choice.weight,
                                    }}
                                >
                                    Aa
                                </strong>
                                <small>
                                    {choice.label}
                                    <ProLabel for="design" />
                                </small>
                            </button>
                        )}
                    </For>
                </div>
            </Group>
            <Group id="btn" open={open()} onOpen={setOpen} label="Buttons" value={buttonLabel()}>
                <div class="shs">
                    <For each={["square", "soft", "round"] as const}>
                        {(shape) => (
                            <button
                                type="button"
                                class="sh"
                                data-shape={shape}
                                aria-pressed={style().shape === shape}
                                onClick={() => {
                                    set({ shape: style().shape === shape ? undefined : shape });
                                }}
                            >
                                <i
                                    style={{
                                        "border-radius":
                                            shape === "round"
                                                ? "20px"
                                                : shape === "soft"
                                                  ? "12px"
                                                  : "3px",
                                    }}
                                />
                                {shape.charAt(0).toUpperCase() + shape.slice(1)}
                            </button>
                        )}
                    </For>
                </div>
                <div class="shs">
                    <button
                        type="button"
                        class="sh"
                        aria-pressed={!style().fill}
                        onClick={() => {
                            set({ fill: undefined });
                        }}
                    >
                        <i class="f-filled" />
                        Filled
                    </button>
                    <For each={["outline", "soft"] as const}>
                        {(fill) => (
                            <button
                                type="button"
                                class="sh"
                                data-fill={fill}
                                aria-pressed={style().fill === fill}
                                onClick={() => {
                                    set({ fill });
                                }}
                            >
                                <i class={`f-${fill}`} />
                                {fill.charAt(0).toUpperCase() + fill.slice(1)}
                            </button>
                        )}
                    </For>
                </div>
            </Group>
            <Group id="bg" open={open()} onOpen={setOpen} label="Background" value={bgLabel()}>
                <TopArt editor={props.editor} />
            </Group>
            <Show when={changed()}>
                <button
                    type="button"
                    class="reset"
                    onClick={() => {
                        props.editor.resetStyle();
                    }}
                >
                    Back to {looks[look()].label}'s original
                </button>
            </Show>
        </>
    );
}
