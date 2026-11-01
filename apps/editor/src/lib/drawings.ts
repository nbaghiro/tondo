// Small drawings for the panels. These are fixed strings from this file, so inserting them is safe.

const icon = (body: string) =>
    `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const SECTION_ICONS: Record<string, string> = {
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    star: '<path d="m12 4 2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.6-.8z"/>',
    wave: '<path d="M3 9c3-3 6-3 9 0s6 3 9 0M3 15c3-3 6-3 9 0s6 3 9 0"/>',
    photo: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4 3.5 2.5 3-2.5 4.5 4"/>',
    hand: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    bag: '<path d="M5.5 8.5h13l1 12h-15zM9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    tag: '<path d="M4 12V5h7l9 9-7 7z"/><circle cx="8.5" cy="9" r="1.2"/>',
    cal: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
    quote: '<path d="M4 19.5 5.3 15A8 8 0 1 1 9 18.3z"/>',
    ask: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>',
    send: '<path d="M4 12 20 5l-5 15-3-6z"/>',
    people: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.5M17.5 14.5a5.500 5.500 0 0 1 3 4.5"/>',
    line: '<path d="M6 4v16"/><circle cx="6" cy="7" r="1.5"/><circle cx="6" cy="16" r="1.5"/><path d="M11 7h8M11 16h6"/>',
    doc: '<path d="M7 3.5h7l4 4v13H7zM14 3.5v4h4"/>',
    down: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
    tabs: '<rect x="3.5" y="8" width="17" height="11.5" rx="2"/><path d="M3.5 8V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 10.5 6v2"/>',
    gap: '<path d="M4 12h16M8 7l4-3 4 3M8 17l4 3 4-3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    spark: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
    brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5 1 1-5z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    check: '<path d="m6 12.5 4 4 8-9" stroke-width="2.4"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down2: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5 15V6a1.5 1.5 0 0 1 1.5-1.5H15"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.500 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    undo: '<path d="M8 7 4 11l4 4M4 11h10a5 5 0 0 1 0 10h-2"/>',
    redo: '<path d="m16 7 4 4-4 4M20 11H10a5 5 0 0 0 0 10h2"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
};

export const iconHtml = (name: string): string =>
    icon(SECTION_ICONS[name] ?? SECTION_ICONS["link"] ?? "");

export const GRIP =
    '<svg viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2.5" cy="2.5" r="1.4"/><circle cx="7.5" cy="2.5" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13.5" r="1.4"/><circle cx="7.5" cy="13.5" r="1.4"/></svg>';

const r = (x: number, y: number, w: number, h: number, o = 1, rr = 2) =>
    `<rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(h)}" rx="${String(rr)}" opacity="${String(o)}"/>`;
const wire = (body: string) =>
    `<svg viewBox="0 0 64 48" aria-hidden="true"><g fill="#b4b8cc">${body}</g></svg>`;
const open = (body: string) =>
    `<svg viewBox="0 0 64 48" aria-hidden="true"><g fill="none" stroke="#b4b8cc" stroke-width="1.5">${body}</g></svg>`;
const dots = (x: number, y: number) => `<circle cx="${String(x)}" cy="${String(y)}" r="5"/>`;

const WIRES: Record<string, string> = {
    rows: wire(r(12, 8, 40, 8, 1, 4) + r(12, 20, 40, 8, 1, 4) + r(12, 32, 40, 8, 1, 4)),
    outline: open(r(12, 8, 40, 8, 1, 4) + r(12, 20, 40, 8, 1, 4) + r(12, 32, 40, 8, 1, 4)),
    cards: wire(
        r(10, 8, 10, 10) +
            r(23, 10, 30, 3) +
            r(23, 15, 20, 2, 0.6) +
            r(10, 26, 10, 10) +
            r(23, 28, 30, 3) +
            r(23, 33, 20, 2, 0.6),
    ),
    icons: wire(
        dots(15, 13) +
            r(23, 10, 30, 3) +
            r(23, 15, 20, 2, 0.6) +
            dots(15, 31) +
            r(23, 28, 30, 3) +
            r(23, 33, 20, 2, 0.6),
    ),
    top: wire(r(12, 6, 40, 22) + r(12, 31, 28, 3) + r(12, 36, 20, 2, 0.6)),
    over: wire(
        `${r(12, 6, 40, 36, 0.55)}<rect x="17" y="30" width="26" height="3" rx="1" fill="#fff"/><rect x="17" y="35" width="18" height="2" rx="1" fill="#fff"/>`,
    ),
    side: wire(r(8, 12, 22, 24) + r(33, 16, 23, 3) + r(33, 22, 18, 2, 0.6) + r(33, 28, 14, 5)),
    wave: `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M2 26c10-9 20-9 30 0s20 9 30 0" fill="none" stroke="#b4b8cc" stroke-width="9"/></svg>`,
    ribbon: wire(`<rect x="0" y="19" width="64" height="10" transform="rotate(-4 32 24)"/>`),
    still: wire(r(6, 19, 52, 10)),
    grid: wire(
        [0, 1, 2].flatMap((i) => [0, 1].map((j) => r(10 + i * 15, 10 + j * 15, 13, 13))).join(""),
    ),
    grid2: wire(r(10, 10, 20, 28) + r(34, 10, 20, 28)),
    mosaic: wire(
        r(10, 8, 28, 20) +
            r(40, 8, 14, 9) +
            r(40, 19, 14, 9) +
            r(10, 30, 14, 10) +
            r(26, 30, 28, 10),
    ),
    swipe: wire(r(6, 10, 34, 28) + r(44, 10, 20, 28, 0.55)),
    text: wire(r(10, 14, 44, 3) + r(10, 21, 44, 3) + r(10, 28, 30, 3)),
    card: wire(r(8, 8, 48, 32, 0.3, 5) + r(15, 16, 34, 3) + r(15, 23, 22, 3) + r(15, 30, 14, 3)),
    menu: `<svg viewBox="0 0 64 48" aria-hidden="true"><g fill="#b4b8cc">${r(10, 12, 18, 3) + r(46, 12, 8, 3) + r(10, 23, 22, 3) + r(46, 23, 8, 3) + r(10, 34, 14, 3) + r(46, 34, 8, 3)}</g><g stroke="#b4b8cc" stroke-dasharray="1 2"><path d="M30 14h14M34 25h10M26 36h18"/></g></svg>`,
    tiers: wire(r(6, 10, 16, 30, 0.55) + r(24, 6, 16, 36) + r(42, 10, 16, 30, 0.55)),
    cal: wire(
        r(12, 8, 40, 6) +
            [0, 1, 2, 3]
                .flatMap((i) => [0, 1, 2].map((j) => r(13 + i * 10, 17 + j * 8, 7, 5, 0.7)))
                .join(""),
    ),
    count: wire(
        `<text x="32" y="32" text-anchor="middle" font-size="22" font-family="Mulish" font-weight="800">21</text>`,
    ),
    music: wire(
        r(8, 10, 18, 18) +
            r(30, 12, 24, 3) +
            r(30, 18, 16, 2, 0.6) +
            r(8, 33, 48, 2, 0.6) +
            r(8, 38, 48, 2, 0.6),
    ),
    quote: wire(r(14, 14, 36, 4) + r(14, 22, 30, 4) + r(22, 32, 20, 2, 0.6)),
    stats: wire(
        `<circle cx="14" cy="22" r="8"/><circle cx="32" cy="22" r="8"/><circle cx="50" cy="22" r="8"/>${r(9, 34, 10, 2, 0.6)}${r(27, 34, 10, 2, 0.6)}${r(45, 34, 10, 2, 0.6)}`,
    ),
    logos: wire(r(6, 21, 15, 6, 0.8) + r(24, 21, 15, 6, 0.8) + r(42, 21, 15, 6, 0.8)),
    icons2: wire(
        `<circle cx="16" cy="24" r="6"/><circle cx="32" cy="24" r="6"/><circle cx="48" cy="24" r="6"/>`,
    ),
    map: wire(
        `${r(10, 6, 44, 22, 0.45)}<circle cx="32" cy="17" r="3"/>${r(10, 32, 28, 3)}${r(10, 38, 20, 2, 0.6)}`,
    ),
    line: wire(r(8, 20, 32, 8, 0.5, 4) + r(42, 20, 14, 8, 1, 4)),
    form: wire(r(12, 8, 40, 7, 0.5) + r(12, 18, 40, 7, 0.5) + r(12, 28, 40, 12, 0.5)),
};

export const wireHtml = (name: string): string => WIRES[name] ?? WIRES["rows"] ?? "";
