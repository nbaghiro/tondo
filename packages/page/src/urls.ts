const SAFE_URL = /^(?:https?:\/\/[^\s/]|mailto:[^\s])\S*$/i;

// Pages hold links written by anyone, so a javascript: address must never reach a visitor. This allows
// only known schemes and no whitespace or control characters, which browsers strip before parsing.
export function isSafeUrl(value: string): boolean {
    return SAFE_URL.test(value);
}
