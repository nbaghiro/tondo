import { exampleHandles } from "./example-handles";

// Every top-level route has to be here, or a person could claim the address of a Tondo page.
const RESERVED = new Set([
    "about",
    "admin",
    "api",
    "app",
    "assets",
    "claim",
    "examples",
    "forgot",
    "gallery",
    "health",
    "help",
    "l",
    "login",
    "logout",
    "photos",
    "pricing",
    "signup",
    "support",
    "teams",
    "terms",
    "privacy",
    "reset",
    "verify",
    "www",
    ...exampleHandles,
]);

const HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

export function normaliseHandle(raw: string): string {
    return raw.trim().toLowerCase();
}

export function isValidHandle(handle: string): boolean {
    return HANDLE.test(handle);
}

export function isReservedHandle(handle: string): boolean {
    return RESERVED.has(handle);
}
