// The painting generator: the same palette and seed always give the same picture.

const rng = (start: number) => {
    let s = start;
    return () => {
        s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) | 0;
        return ((s ^ (s >>> 13)) >>> 0) / 4294967296;
    };
};

const filter = (id: string, seed: number, scale = 26, mottle = 0.75) =>
    `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="4" seed="${seed}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="s"/><feTurbulence type="fractalNoise" baseFrequency=".009" numOctaves="3" seed="${seed + 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${mottle} 0 0 0 .42" result="m"/><feComposite in="s" in2="m" operator="in"/><feGaussianBlur stdDeviation="1.4" result="p"/><feMorphology in="s" operator="erode" radius="3"/><feGaussianBlur stdDeviation="7" result="i"/><feComposite in="s" in2="i" operator="out" result="e"/><feMerge><feMergeNode in="p"/><feMergeNode in="e"/></feMerge></filter>`;

export interface PaintOptions {
    /** Lightens instead of darkens where paint overlaps, for dark looks. */
    screen?: boolean | undefined;
    /** Draws one brush ring of this width instead of a painting. */
    ring?: number | undefined;
}

export function paint(
    palette: readonly string[],
    seed: number,
    options: PaintOptions = {},
): string {
    const random = rng(seed * 7919 + 11);
    const id = `paint-${seed}`;
    if (options.ring) {
        return `<svg class="tondo" viewBox="0 0 400 400" aria-hidden="true"><defs>${filter(id, seed, 12, 0.6)}</defs><g filter="url(#${id})"><circle cx="200" cy="200" r="165" fill="none" stroke="${palette[0] ?? "#000000"}" stroke-width="${options.ring}" stroke-dasharray="930 110" stroke-linecap="round" transform="rotate(${seed * 47} 200 200)"/></g></svg>`;
    }
    const shift = seed % palette.length;
    const colours = palette.map((_, i) => palette[(i + shift) % palette.length] ?? "#000000");
    const blend = options.screen ? "screen" : "multiply";
    let shapes = `<circle cx="200" cy="200" r="168" fill="${colours.at(-1) ?? "#000000"}" opacity=".5"/>`;
    for (let i = 0, count = 3 + (seed % 5); i < count; i++) {
        const angle = random() * 6.28;
        const distance = 30 + random() * 105;
        const x = Math.trunc(200 + Math.cos(angle) * distance);
        const y = Math.trunc(200 + Math.sin(angle) * distance);
        const rx = Math.trunc(35 + random() * 85);
        const ry = Math.trunc(25 + random() * 70);
        const opacity = (0.62 + random() * 0.33).toFixed(2);
        const rotate = Math.trunc(random() * 180);
        shapes += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${colours[i % colours.length] ?? "#000000"}" opacity="${opacity}" style="mix-blend-mode:${blend}" transform="rotate(${rotate} ${x} ${y})"/>`;
    }
    return `<svg class="tondo" viewBox="0 0 400 400" aria-hidden="true"><defs>${filter(id, seed)}</defs><g filter="url(#${id})" style="isolation:isolate">${shapes}</g></svg>`;
}
