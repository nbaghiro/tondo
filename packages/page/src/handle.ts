import { exampleHandles } from "./example-handles";

// Every top-level route has to be here, or a person could claim the address of a Tondo page. The rest
// are words that could be used to pose as Tondo, such as tondo.page/security.
const RESERVED = new Set([
    "about",
    "abuse",
    "account",
    "accounts",
    "admin",
    "api",
    "app",
    "assets",
    "auth-strip",
    "billing",
    "blog",
    "careers",
    "claim",
    "contact",
    "dashboard",
    "developers",
    "docs",
    "download",
    "examples",
    "forgot",
    "gallery",
    "health",
    "help",
    "home",
    "l",
    "legal",
    "login",
    "logout",
    "mail",
    "news",
    "official",
    "payments",
    "photos",
    "plans",
    "pricing",
    "privacy",
    "report",
    "reset",
    "root",
    "security",
    "settings",
    "shots",
    "signin",
    "signup",
    "staff",
    "start",
    "status",
    "store",
    "support",
    "system",
    "teams",
    "terms",
    "tondo",
    "verify",
    "webmail",
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
