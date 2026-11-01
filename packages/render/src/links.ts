// Links on a live page go through /l/, which counts the click. The destination is looked up in the
// live page itself by this short id, so that address can never send anyone anywhere else.
export function linkId(url: string): string {
    let a = 0xdeadbeef;
    let b = 0x41c6ce57;
    for (let i = 0; i < url.length; i++) {
        const code = url.charCodeAt(i);
        a = Math.imul(a ^ code, 2654435761);
        b = Math.imul(b ^ code, 1597334677);
    }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
}

export const LINK = /href="(https?:\/\/[^"]*)"/g;

export const unescapeHtml = (value: string) =>
    value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");

export function trackLinks(html: string, handle: string): string {
    return html.replace(
        LINK,
        (_, url: string) => `href="/l/${handle}/${linkId(unescapeHtml(url))}"`,
    );
}
