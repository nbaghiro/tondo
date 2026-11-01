import { isSafeUrl } from "./urls";

export const linkTypes = [
    "instagram",
    "tiktok",
    "youtube",
    "spotify",
    "apple",
    "globe",
    "mail",
    "phone",
    "chat",
    "pin",
] as const;

// What a pasted link says about itself, so nobody has to choose an action, a service or an icon.
const SERVICES: readonly (readonly [RegExp, string, string])[] = [
    [/(^|\.)instagram\.com/i, "Instagram", "instagram"],
    [/(^|\.)tiktok\.com/i, "TikTok", "tiktok"],
    [/(^|\.)(youtube\.com|youtu\.be)/i, "YouTube", "youtube"],
    [/(^|\.)vimeo\.com/i, "Vimeo", "play"],
    [/open\.spotify\.com/i, "Spotify", "spotify"],
    [/music\.apple\.com/i, "Apple Music", "apple"],
    [/(^|\.)soundcloud\.com/i, "SoundCloud", "play"],
    [/(^|\.)calendly\.com/i, "Calendly", "calendar"],
    [/(^|\.)cal\.com/i, "Cal.com", "calendar"],
    [/(^|\.)(etsy\.com|myshopify\.com)/i, "your shop", "bag"],
    [/(^|\.)substack\.com/i, "Substack", "mail"],
    [/(^|\.)(wa\.me|whatsapp\.com)/i, "WhatsApp", "chat"],
    [/(^|\.)t\.me/i, "Telegram", "chat"],
    [/(^|\.)maps\.(google|apple)\.com/i, "Maps", "pin"],
];

export type LinkReading =
    | { state: "empty" }
    | { state: "bad"; message: string }
    | {
          state: "ok";
          url: string;
          /** Where it goes, in words. */
          label: string;
          icon: string;
          /** A title to offer when the person hasn't written one. Empty if there's nothing useful. */
          title: string;
      };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{7,}$/;
const WEB = /^(?:https?:\/\/)?[^\s./]+(?:\.[^\s./]+)+(?:[/?#]\S*)?$/i;

export function readLink(raw: string): LinkReading {
    const value = raw.trim();
    if (!value) return { state: "empty" };
    if (/^(?:javascript|data|vbscript):/i.test(value)) {
        return { state: "bad", message: "This address can't be used, because it could run code." };
    }
    if (value.startsWith("mailto:") && isSafeUrl(value)) {
        return { state: "ok", url: value, label: "Sends an email", icon: "mail", title: "" };
    }
    if (value.startsWith("tel:") && isSafeUrl(value)) {
        return { state: "ok", url: value, label: "Calls this number", icon: "phone", title: "" };
    }
    if (EMAIL.test(value)) {
        return {
            state: "ok",
            url: `mailto:${value}`,
            label: "Sends an email",
            icon: "mail",
            title: "Email me",
        };
    }
    if (PHONE.test(value)) {
        return {
            state: "ok",
            url: `tel:${value.replace(/[^\d+]/g, "")}`,
            label: "Calls this number",
            icon: "phone",
            title: "Call me",
        };
    }
    if (!WEB.test(value)) {
        return {
            state: "bad",
            message: "That doesn't look like an address yet. Try shop.example.com.",
        };
    }
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    if (!isSafeUrl(url)) return { state: "bad", message: "This address can't be used." };
    const host = url.replace(/^https?:\/\/(?:www\.)?/i, "").split(/[/?#]/)[0] ?? "";
    const service = SERVICES.find(([pattern]) => pattern.test(host));
    if (!service) return { state: "ok", url, label: `Opens ${host}`, icon: "globe", title: "" };
    const [, name, icon] = service;
    return {
        state: "ok",
        url,
        label: `Recognised ${name}`,
        icon,
        title: name === "your shop" ? "Visit my shop" : `Find me on ${name}`,
    };
}
