import { toHsl } from "@tondo/render";

const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;

/** The main colour in a photo, skipping near-black, near-white and grey. Null if there isn't one. */
export async function brandFromPhoto(url: string): Promise<string | null> {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, 48, 48);
    const data = context.getImageData(0, 0, 48, 48).data;
    const bins = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
        const [h, s, l] = toHsl(toHex(r, g, b));
        if (l < 0.14 || l > 0.9 || s < 0.18) continue;
        const bin = bins[Math.floor(h / 15) % 24];
        if (!bin) continue;
        const weight = s * (1 - Math.abs(l - 0.5));
        bin.w += weight;
        bin.r += r * weight;
        bin.g += g * weight;
        bin.b += b * weight;
    }
    const top = bins.reduce((best, bin) => (bin.w > best.w ? bin : best));
    return top.w ? toHex(top.r / top.w, top.g / top.w, top.b / top.w) : null;
}
