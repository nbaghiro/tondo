import type { UsageStore } from "@tondo/db";
import type { AssistantDeps } from "./assistant";
import { CREDITS } from "./assistant";
import { createGemini, generateImage, MODELS } from "./assistant-model";
import { standIn, standInDownload, standInImage, standInReach } from "./assistant-stand-in";
import { isInMessage, readPage, READ_FAILED } from "./fetch-page";
import { createPhotoSearch, downloadPhoto } from "./image-search";
import { readSite } from "./site-facts";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/** Decides what Help me runs on. With no key and no stand-in it stays off, and its button stays hidden. */
export function assistantFromEnv(
    env: NodeJS.ProcessEnv,
    usage: UsageStore,
): Omit<AssistantDeps, "storage"> | null {
    const key = env["GOOGLE_API_KEY"];
    const dailyUsd = Number(env["ASSISTANT_DAILY_USD"] ?? 20);
    if (env["TONDO_FAKE_AI"] === "1") {
        // Tests must never spend money, so a real key beside this flag is a mistake worth stopping for.
        if (key) throw new Error("TONDO_FAKE_AI is set beside a real Gemini key. Remove one.");
        return {
            model: standIn,
            usage,
            reach: standInReach,
            makeImage: standInImage,
            download: standInDownload,
            dailyUsd,
        };
    }
    if (!key) return null;
    const modelId = env["ASSISTANT_MODEL"] ?? DEFAULT_MODEL;
    if (!MODELS[modelId]) throw new Error(`ASSISTANT_MODEL ${modelId} has no price listed.`);
    const model = createGemini(key, modelId);
    return {
        model,
        usage,
        reach: {
            imageCredits: CREDITS.image,
            findPhotos: createPhotoSearch(
                env["PEXELS_API_KEY"]?.trim() ? env["PEXELS_API_KEY"] : undefined,
            ),
            readWebsite: async (url, said, signal) => {
                if (!isInMessage(url, said)) {
                    return { ok: false, error: "Only read an address the person gave you." };
                }
                const read = await readPage(url, signal);
                if (!read.ok) return read;
                return readSite(model, read.text, signal, read.html).catch(() => ({
                    ok: false,
                    error: READ_FAILED,
                }));
            },
        },
        makeImage: (prompt, signal) => generateImage(key, prompt, signal),
        download: downloadPhoto,
        dailyUsd,
    };
}
