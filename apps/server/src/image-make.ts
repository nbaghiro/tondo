// A last check on an image request, on top of the model's and the provider's own filters. It catches
// a named person or brand, which rarely belongs in a generated image, and lets through the person's
// own name for their own logo.

const NAMED = /\b\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+)+/gu;
const LIKENESS = /\b(?:celebrity|famous|looks like|in the style of|logo of|nike|adobe|disney)\b/i;

export function imageRefusal(prompt: string, ownName: string): string | null {
    if (LIKENESS.test(prompt)) {
        return "I can't make images of real people or other brands. Describe what you'd like without naming them.";
    }
    const own = ownName.toLowerCase();
    const named = (prompt.match(NAMED) ?? []).filter((name) => !own.includes(name.toLowerCase()));
    return named.length
        ? `I can't make images that name ${named[0] ?? "someone"}. Describe what you'd like without naming a person or brand.`
        : null;
}
