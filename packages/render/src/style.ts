import type { Page, PageStyle } from "@tondo/page";
import { paint } from "./art";
import type { Look } from "./define-look";
import { looks } from "./looks";

// "Make it yours" turns a few designed choices into overrides on a look's CSS. It all happens while
// the page is drawn, so a published page still needs no script.

type Rgb = readonly [number, number, number];
export type Hsl = readonly [number, number, number];

const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
        .map((x) =>
            Math.round(clamp(x, 0, 255))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
const full = (hex: string) =>
    (hex.length === 4 ? `#${hex.slice(1).replace(/./g, "$&$&")}` : hex.slice(0, 7)).toLowerCase();
const toRgb = (hex: string): Rgb => {
    const n = parseInt(full(hex).slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
};

export function toHsl(hex: string): Hsl {
    const [r, g, b] = toRgb(hex).map((x) => x / 255) as [number, number, number];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const delta = max - min;
    if (!delta) return [0, 0, light];
    const sat = delta / (1 - Math.abs(2 * light - 1));
    const hue =
        max === r
            ? ((g - b) / delta + 6) % 6
            : max === g
              ? (b - r) / delta + 2
              : (r - g) / delta + 4;
    return [hue * 60, sat, light];
}

function hsl(hue: number, satIn: number, lightIn: number): string {
    const h = ((hue % 360) + 360) % 360;
    const s = clamp(satIn);
    const l = clamp(lightIn);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const parts: Rgb =
        h < 60
            ? [c, x, 0]
            : h < 120
              ? [x, c, 0]
              : h < 180
                ? [0, c, x]
                : h < 240
                  ? [0, x, c]
                  : h < 300
                    ? [x, 0, c]
                    : [c, 0, x];
    return toHex((parts[0] + m) * 255, (parts[1] + m) * 255, (parts[2] + m) * 255);
}

const linear = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
    const [r, g, b] = toRgb(hex);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
export const contrast = (a: string, b: string): number => {
    const x = luminance(a);
    const y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Moves a colour's lightness away from its background until it reaches the ratio. */
export function readable(fg: string, bg: string, ratio: number): string {
    if (contrast(fg, bg) >= ratio) return fg;
    const [h, s, l] = toHsl(fg);
    const darker = luminance(bg) > 0.18;
    for (let i = 1; i <= 50; i++) {
        const tried = hsl(h, s, clamp(l + (darker ? -i : i) * 0.02));
        if (contrast(tried, bg) >= ratio) return tried;
    }
    return darker ? "#000000" : "#ffffff";
}

export interface Theme {
    brand: string;
    /** The brand colour had to shift so buttons stay readable. */
    changed: boolean;
    dark: boolean;
    vars: Record<string, string>;
}

export function makeTheme(brandIn: string, kind: { dark?: boolean; plain?: boolean } = {}): Theme {
    const brand = full(brandIn);
    const dark = kind.dark ?? false;
    const [h, s0] = toHsl(brand);
    const s = Math.min(s0, 0.9);
    const bg = dark
        ? hsl(h, Math.min(s * 0.5, 0.34), 0.085)
        : kind.plain
          ? "#fbfbfc"
          : hsl(h, Math.min(s * 0.55, 0.42), 0.965);
    const fg = dark ? hsl(h, Math.min(s, 0.25), 0.95) : hsl(h, Math.min(s, 0.5), 0.13);
    const card = dark ? hsl(h, Math.min(s * 0.5, 0.3), 0.14) : "#ffffff";
    let btn = readable(brand, bg, 3);
    const btnfg =
        contrast("#ffffff", btn) >= contrast(fg, btn) ? "#ffffff" : dark ? hsl(h, 0.4, 0.08) : fg;
    if (contrast(btnfg, btn) < 4.5) btn = readable(btn, btnfg, 4.5);
    const muted = dark ? hsl(h, Math.min(s, 0.18), 0.72) : hsl(h, Math.min(s, 0.2), 0.36);
    return {
        brand,
        changed: contrast(brand, btn) > 1.15,
        dark,
        vars: {
            "--bg": bg,
            "--fg": fg,
            "--mut": readable(muted, bg, 4.5),
            "--card": card,
            "--cardfg": fg,
            "--line": dark ? hsl(h, Math.min(s, 0.2), 0.26) : hsl(h, Math.min(s * 0.5, 0.3), 0.87),
            "--btn": btn,
            "--btnfg": btnfg,
            "--acc": readable(btn, bg, 4.5),
            "--ribfg":
                contrast(btnfg, readable(btn, bg, 4.5)) >= 4.5
                    ? btnfg
                    : readable(btnfg, readable(btn, bg, 4.5), 4.5),
            "--pl": card,
            "--plfg": fg,
            "--sel": btn,
        },
    };
}

/** The painting's colours for a theme. */
export function paintFor(theme: Theme): string[] {
    const [h, s, l] = toHsl(theme.vars["--btn"] ?? theme.brand);
    const sat = Math.max(s, 0.42);
    const light = clamp(l, 0.42, 0.62);
    return [
        hsl(h, sat, light),
        hsl(h + 32, sat, light + 0.1),
        hsl(h - 26, sat * 0.9, light - 0.06),
        hsl(h + 62, sat * 0.8, light + 0.18),
    ];
}

export function parseColour(value: string | undefined): string | null {
    if (!value) return null;
    const text = value.trim();
    if (/^#[0-9a-f]{3,8}$/i.test(text)) return full(text);
    const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(text);
    return rgb ? toHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])) : null;
}

const cache = new Map<string, Record<string, string>>();

/** A look's own variables, read from its first rule. */
export function lookVars(key: string, look: Look): Record<string, string> {
    const known = cache.get(key);
    if (known) return known;
    const rule = new RegExp(`\\.${key}\\{([^}]*)\\}`).exec(look.css)?.[1] ?? "";
    const vars: Record<string, string> = {};
    for (const entry of rule.split(";")) {
        const at = entry.indexOf(":");
        if (at > 0) vars[entry.slice(0, at).trim()] = entry.slice(at + 1).trim();
    }
    cache.set(key, vars);
    return vars;
}

export interface Palettes {
    colours: string[];
    base: string;
}

/** The colours a look suggests: picked from its art and buttons, and not too alike. */
export function lookColours(key: Page["look"]): Palettes {
    const look = looks[key];
    const vars = lookVars(key, look);
    const seen: number[] = [];
    const colours: string[] = [];
    const sources = [vars["--btn"], vars["--acc"], ...look.palette]
        .map(parseColour)
        .filter((c): c is string => c !== null);
    for (const colour of sources) {
        const [h, s, l] = toHsl(colour);
        if (s < 0.22 || l > 0.86 || l < 0.08) continue;
        if (seen.some((x) => Math.min(Math.abs(x - h), 360 - Math.abs(x - h)) < 34)) continue;
        seen.push(h);
        colours.push(colour);
        if (colours.length === 3) break;
    }
    return { colours, base: colours[0] ?? parseColour(vars["--btn"]) ?? "#22263f" };
}

export function themeOf(page: Pick<Page, "look" | "style">): Theme | null {
    const colour = page.style?.colour;
    if (!colour) return null;
    if (colour.mode === "plain") return makeTheme(colour.brand, { plain: true });
    if (colour.mode === "dark") return makeTheme(colour.brand, { dark: true });
    const vars = lookVars(page.look, looks[page.look]);
    const lookBg = parseColour(vars["--bg"]) ?? "#ffffff";
    return makeTheme(colour.brand, { dark: colour.mode === "preset" && luminance(lookBg) < 0.18 });
}

/** A look's own hard-coded colours follow the new palette, keeping their relationships. */
function recolourer(key: Page["look"], theme: Theme) {
    const vars = lookVars(key, looks[key]);
    const tokens: Record<string, string> = {};
    for (const [name, value] of Object.entries(vars)) {
        const c = parseColour(value);
        if (c && /^--(bg|fg|mut|card|cardfg|line|btn|btnfg|acc)$/.test(name) && !tokens[c]) {
            tokens[c] = name;
        }
    }
    const oldBg = parseColour(vars["--bg"]) ?? "#ffffff";
    const oldFg = parseColour(vars["--fg"]) ?? "#111111";
    const oldBtn = parseColour(vars["--btn"]) ?? oldFg;
    const oldAcc = parseColour(vars["--acc"]) ?? oldBtn;
    const reference = toHsl(oldAcc)[1] > toHsl(oldBtn)[1] ? oldAcc : oldBtn;
    const [hueOld, satOld] = toHsl(reference);
    const [hueNew, satNew] = toHsl(theme.vars["--btn"] ?? theme.brand);
    const newBg = theme.vars["--bg"] ?? "#ffffff";
    const flip = luminance(oldBg) < 0.18 !== luminance(newBg) < 0.18;
    const lightBg = luminance(oldBg);
    const lightFg = luminance(oldFg);
    const rgbBg = toRgb(newBg);
    const rgbFg = toRgb(theme.vars["--fg"] ?? "#111111");
    return (raw: string): string => {
        const c = full(raw);
        const token = tokens[c];
        if (token) return `var(${token})`;
        const [h, s, l] = toHsl(c);
        if (s < 0.14) {
            const t = clamp(
                Math.abs(luminance(c) - lightBg) / Math.max(0.01, Math.abs(lightFg - lightBg)),
            );
            return toHex(
                rgbBg[0] + (rgbFg[0] - rgbBg[0]) * t,
                rgbBg[1] + (rgbFg[1] - rgbBg[1]) * t,
                rgbBg[2] + (rgbFg[2] - rgbBg[2]) * t,
            );
        }
        const off = ((h - hueOld + 540) % 360) - 180;
        return hsl(
            hueNew + off * 0.22,
            s * clamp(satNew / Math.max(satOld, 0.2), 0.3, 1.1),
            flip ? 1 - l : l,
        );
    };
}

function recolourText(text: string, change: (hex: string) => string): string {
    return text
        .replace(
            /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g,
            (_m, r, g, b, a?: string) => {
                const c = change(toHex(Number(r), Number(g), Number(b)));
                const percent = (Number(a ?? 1) * 100).toFixed(0);
                if (c.startsWith("var")) return `color-mix(in srgb,${c} ${percent}%,transparent)`;
                return a === undefined ? c : `color-mix(in srgb,${c} ${percent}%,transparent)`;
            },
        )
        .replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (m) => change(m));
}

/** Recolours a look's inline colours, in a signature header, leaving paintings alone. */
export function recolourHtml(html: string, page: Pick<Page, "look" | "style">): string {
    const theme = themeOf(page);
    if (!theme) return html;
    const change = recolourer(page.look, theme);
    // Only colours in the look's own markup. Words and links stay as written, and their quotes are
    // escaped, so nothing a person typed can look like one of these attributes.
    const own = /(?<=\s)(style|fill|stroke|stop-color|flood-color|color)="([^"]*)"/g;
    return html
        .split(/(<svg class="tondo"[\s\S]*?<\/svg>)/)
        .map((part, i) =>
            i % 2
                ? part
                : part.replace(
                      own,
                      (_, name: string, value: string) =>
                          `${name}="${recolourText(value, change)}"`,
                  ),
        )
        .join("");
}

const resolve = (value: string, theme: Theme) =>
    value.startsWith("var(") ? (theme.vars[value.slice(4, -1)] ?? null) : parseColour(value);

const SOLID = /(?:^|;)\s*background(?:-color)?:\s*(#[0-9a-f]{3,8}|var\(--[a-z]+\)|rgba?\([^)]*\))/i;
const TEXT = /(?:^|;)\s*color:\s*(#[0-9a-f]{3,8}|var\(--[a-z]+\)|rgba?\([^)]*\))(\s*!important)?/i;

// The last check. Published pages send no script, so anything a look's own rules would leave
// unreadable is corrected here, one rule at a time.
function guardRules(css: string, theme: Theme): string {
    const pageBg = theme.vars["--bg"] ?? "#ffffff";
    const ink = theme.vars["--fg"] ?? "#111111";
    return css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector: string, body: string) => {
        if (/^\s*(from|to|\d)/.test(selector) || selector.includes("@")) return rule;
        // A tagline takes its header's corrected colour, whatever background that header has.
        if (/\.p-tag\s*$/.test(selector) && !SOLID.test(body)) {
            return `${selector}{${body.replace(/(^|;)\s*color:[^;]*/g, "$1")}}`;
        }
        const backing = SOLID.exec(body)?.[1];
        const textColour = TEXT.exec(body)?.[1];
        const back = backing ? resolve(backing, theme) : null;
        if (textColour) {
            const fg = resolve(textColour, theme);
            if (!fg) return rule;
            const against = back ?? pageBg;
            if (contrast(fg, against) >= 4.5) return rule;
            return `${selector}{${body};color:${readable(fg, against, 4.5)}!important}`;
        }
        // A background the rule sets, with text it leaves to whatever's inherited.
        if (back && !/gradient|url\(/.test(body) && contrast(ink, back) < 4.5) {
            const light = contrast("#ffffff", back) >= contrast("#000000", back);
            return `${selector}{${body};color:${light ? "#ffffff" : "#000000"}}`;
        }
        return rule;
    });
}

/** The look's CSS, recoloured and corrected if the page has its own colour. */
export function lookCss(page: Pick<Page, "look" | "style">): string {
    const css = looks[page.look].css;
    const theme = themeOf(page);
    // A tagline's muted colour was only chosen for the look's own header background.
    return theme
        ? `${guardRules(recolourText(css, recolourer(page.look, theme)), theme)}.p-tag{color:inherit;opacity:1}`
        : css;
}

export interface FontPair {
    id: NonNullable<PageStyle["font"]>;
    label: string;
    disp: string;
    body: string;
    weight: number;
    query: string;
}

export const fontChoices: readonly FontPair[] = [
    {
        id: "editorial",
        label: "Warm and classic",
        disp: "Fraunces,serif",
        body: "Mulish,sans-serif",
        weight: 500,
        query: "family=Fraunces:opsz,SOFT,wght@9..144,100,500&family=Mulish:wght@400;600;700",
    },
    {
        id: "elegant",
        label: "Elegant",
        disp: '"Playfair Display",serif',
        body: '"DM Sans",sans-serif',
        weight: 600,
        query: "family=Playfair+Display:wght@600&family=DM+Sans:wght@400;500;700",
    },
    {
        id: "quiet",
        label: "Quiet",
        disp: '"Cormorant Garamond",serif',
        body: "Karla,sans-serif",
        weight: 500,
        query: "family=Cormorant+Garamond:wght@500&family=Karla:wght@400;500;700",
    },
    {
        id: "modern",
        label: "Modern",
        disp: '"Space Grotesk",sans-serif',
        body: "Inter,sans-serif",
        weight: 600,
        query: "family=Space+Grotesk:wght@600&family=Inter:wght@400;500;700",
    },
    {
        id: "clean",
        label: "Clean",
        disp: "Sora,sans-serif",
        body: '"Hanken Grotesk",sans-serif',
        weight: 600,
        query: "family=Sora:wght@600&family=Hanken+Grotesk:wght@400;500;700",
    },
    {
        id: "bold",
        label: "Bold",
        disp: '"Archivo Black",sans-serif',
        body: "Archivo,sans-serif",
        weight: 400,
        query: "family=Archivo+Black&family=Archivo:wght@400;500;700",
    },
    {
        id: "friendly",
        label: "Friendly",
        disp: "Fredoka,sans-serif",
        body: '"Nunito Sans",sans-serif',
        weight: 600,
        query: "family=Fredoka:wght@600&family=Nunito+Sans:wght@400;600;700",
    },
    {
        id: "handmade",
        label: "Handmade",
        disp: "Caprasimo,serif",
        body: '"Rethink Sans",sans-serif',
        weight: 400,
        query: "family=Caprasimo&family=Rethink+Sans:wght@400;500;700",
    },
];

const SHAPES = {
    square: ["3px", "4px"],
    soft: ["12px", "14px"],
    round: ["999px", "24px"],
} as const;

/** Looks whose character depends on their own colours. A new colour changes them the most. */
export const strongColourLooks: ReadonlySet<Page["look"]> = new Set([
    "conf",
    "tide",
    "postal",
    "bake",
    "shelf",
    "bloom",
    "comet",
    "estate",
    "ledger",
    "signal",
    "surf",
]);

/** The rules that apply a page's choices on top of its look. */
export function styleCss(page: Pick<Page, "look" | "style">, assetBase: string): string {
    const style = page.style;
    if (!style) return "";
    const sel = `html.look.${page.look}`;
    const look = looks[page.look];
    const theme = themeOf(page);
    let vars = "";
    let extra = "";
    if (theme) {
        const change = recolourer(page.look, theme);
        for (const [name, value] of Object.entries(lookVars(page.look, look))) {
            if (!theme.vars[name] && /#|rgb/.test(value)) {
                vars += `${name}:${recolourText(value, change)};`;
            }
        }
        for (const [name, value] of Object.entries(theme.vars)) vars += `${name}:${value};`;
        if (theme.dark) extra += `${sel} .tondo ellipse{mix-blend-mode:screen!important}`;
        else if (look.screen) extra += `${sel} .tondo ellipse{mix-blend-mode:multiply!important}`;
    }
    const pair = fontChoices.find((choice) => choice.id === style.font);
    if (pair) {
        vars += `--disp:${pair.disp};--body:${pair.body};--dw:${String(pair.weight)};`;
        extra += `${sel} h1,${sel} h2,${sel} .b-head{font-family:${pair.disp}!important;font-style:normal!important;text-transform:none!important;letter-spacing:-.01em!important}`;
    }
    if (style.shape) {
        const [button, corner] = SHAPES[style.shape];
        vars += `--rb:${button};--r:${corner};`;
        extra += `${sel} .b-btn,${sel} .b-chip{border-radius:${button}!important}`;
    }
    const buttons = `${sel} .b-btn,${sel} .b-chip,${sel} .b-sm`;
    if (style.fill === "outline") {
        extra += `${buttons}{background:transparent!important;color:var(--fg)!important;border:1.5px solid var(--btn)!important;box-shadow:none!important}`;
    }
    if (style.fill === "soft") {
        extra += `${buttons}{background:color-mix(in srgb,var(--btn) 15%,var(--bg))!important;color:var(--fg)!important;border:0!important;box-shadow:none!important}`;
    }
    if (style.bg) {
        extra += `${sel} .p-paint{display:none}${sel} .page{background:transparent!important}${sel} .page::before{display:none}`;
    }
    if (style.bg === "gradient") {
        extra += `${sel}{background:linear-gradient(180deg,color-mix(in srgb,var(--btn) 26%,var(--bg)),var(--bg) 62%) fixed!important}${sel} body{background:transparent}`;
    }
    if (style.bg === "photo" && style.bgPhoto) {
        // A photo's name is limited by the page schema, so it's safe inside this rule.
        extra += `${sel}{background:linear-gradient(color-mix(in srgb,var(--bg) 78%,transparent),color-mix(in srgb,var(--bg) 92%,transparent)),url("${assetBase}${style.bgPhoto.file}") center/cover fixed!important}${sel} body{background:transparent}`;
    }
    return (vars ? `${sel}{${vars}}` : "") + extra;
}

export const wordmarkCss = `.wm{display:inline-block;line-height:1.08;color:var(--fg);max-width:100%}.wm-bubble{font-family:"Bagel Fat One",sans-serif;font-weight:400;color:var(--bg);-webkit-text-stroke:.16em var(--fg);paint-order:stroke fill;letter-spacing:.015em;padding:.08em .1em}.wm-poster{font-family:Anton,sans-serif;font-weight:400;letter-spacing:.01em;padding:.15em 0;white-space:nowrap}.wm-script{font-family:Pacifico,cursive;font-weight:400;transform:rotate(-5deg);padding:.15em .1em}.wm-paint{font-family:Fraunces,serif;font-weight:900;font-variation-settings:"SOFT" 100,"opsz" 144;background-size:280px;background-position:center;-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.02em;padding:.05em 0;filter:saturate(1.6) contrast(1.2)}.wm-seal{font-family:"Bagel Fat One",sans-serif;font-weight:400;color:var(--btnfg);background:var(--btn);padding:.8em 1em;border-radius:50%;outline:2px solid var(--btn);outline-offset:4px;white-space:nowrap}`;

export const WORDMARK_FONTS =
    "family=Anton&family=Bagel+Fat+One&family=Pacifico&family=Fraunces:opsz,SOFT,wght@9..144,100,900";

/** A painted stand-in for a photo, in this page's colours. */
const blend = (from: string, to: string, share: number): string => {
    const channel = (hex: string, at: number) => Number.parseInt(hex.slice(at, at + 2), 16);
    const mixed = [1, 3, 5].map((at) =>
        Math.round(channel(from, at) * (1 - share) + channel(to, at) * share),
    );
    return toHex(mixed[0] ?? 0, mixed[1] ?? 0, mixed[2] ?? 0);
};

/** The quiet tile for a missing photo, and the painting a painted wordmark is filled with. */
export function photoStandIns(page: Page): {
    placeholder: (n: number) => string;
    wordmarkArt: () => string;
} {
    const look = looks[page.look];
    const theme = themeOf(page);
    const vars = theme?.vars ?? lookVars(page.look, look);
    const ground = parseColour(vars["--bg"]) ?? (look.screen ? "#17151f" : "#fbfaf7");
    const ink = parseColour(vars["--fg"]) ?? (look.screen ? "#ffffff" : "#111111");
    const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><rect width="300" height="300" fill="${blend(ground, ink, 0.1)}"/><g transform="translate(126 126)" fill="none" stroke="${blend(ground, ink, 0.42)}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="44" height="36" rx="6"/><circle cx="15" cy="18" r="4"/><path d="m3 36 12-11 9 8 8-7 13 11"/></g></svg>`;
    const uri = `data:image/svg+xml,${encodeURIComponent(tile)}`;
    let art = "";
    return {
        placeholder: () => uri,
        wordmarkArt: () => {
            if (art) return art;
            const palette = theme ? paintFor(theme) : (page.paint ?? look.palette);
            const painting = paint(
                palette.length > 1 ? palette : [palette[0] ?? "#888888", "#b9bfd8"],
                (page.seed ?? look.seed) + 7,
                { screen: theme ? theme.dark : look.screen },
            );
            const inner = painting.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><rect width="300" height="300" fill="${theme?.vars["--bg"] ?? (look.screen ? "#17151f" : "#fbfaf7")}"/><svg x="-110" y="-110" width="520" height="520" viewBox="0 0 400 400">${inner}</svg></svg>`;
            art = `data:image/svg+xml,${encodeURIComponent(svg)}`;
            return art;
        },
    };
}
