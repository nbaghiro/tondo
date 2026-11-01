import type { PhotoChoice } from "@tondo/contract";
import sharp from "sharp";
import type { GetOne } from "./fetch-page";
import { getOne, MAX_IMAGE_BYTES, safeFetch } from "./fetch-page";

// Stock photos for Help me. Pexels when a key is set, and Openverse otherwise or when it finds
// nothing. Openverse is limited to CC0 and public domain marks, since other licences carry conditions
// that a person's page would have to meet. Nothing's stored until someone picks a photo, and search
// results reach the browser as small thumbnails we fetched, so a visitor's browser doesn't call out.

const COUNT = 6;
const THUMB = 240;

interface Found {
    url: string;
    thumb: string;
    alt: string;
    credit: string;
    creditUrl: string;
    provider: string;
    providerUrl: string;
    licence: string;
}

const json = async (
    fetchImpl: typeof fetch,
    url: URL,
    headers: Record<string, string>,
    signal: AbortSignal,
) => {
    const res = await fetchImpl(url, { headers, signal });
    return res.ok ? await res.json() : null;
};

interface PexelsAnswer {
    photos?: {
        url?: string;
        alt?: string;
        photographer?: string;
        photographer_url?: string;
        src?: { large?: string; tiny?: string; small?: string };
    }[];
}

export async function searchPexels(
    key: string,
    query: string,
    signal: AbortSignal,
    fetchImpl: typeof fetch = fetch,
): Promise<Found[]> {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(COUNT));
    const body = (await json(
        fetchImpl,
        url,
        { Authorization: key },
        signal,
    )) as PexelsAnswer | null;
    return (body?.photos ?? []).flatMap((photo) =>
        photo.src?.large && photo.src.small
            ? [
                  {
                      url: photo.src.large,
                      thumb: photo.src.small,
                      alt: photo.alt ?? query,
                      credit: photo.photographer ?? "Pexels",
                      creditUrl: photo.photographer_url ?? photo.url ?? "https://www.pexels.com",
                      provider: "Pexels",
                      providerUrl: "https://www.pexels.com",
                      licence: "",
                  },
              ]
            : [],
    );
}

interface OpenverseAnswer {
    results?: {
        url?: string;
        thumbnail?: string;
        title?: string;
        creator?: string;
        creator_url?: string;
        foreign_landing_url?: string;
        license?: string;
    }[];
}

export async function searchOpenverse(
    query: string,
    signal: AbortSignal,
    fetchImpl: typeof fetch = fetch,
): Promise<Found[]> {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", String(COUNT));
    url.searchParams.set("license", "cc0,pdm");
    const body = (await json(
        fetchImpl,
        url,
        { Accept: "application/json", "User-Agent": "Tondo/1.0 (+https://tondo.page)" },
        signal,
    )) as OpenverseAnswer | null;
    return (body?.results ?? []).flatMap((photo) =>
        photo.url && photo.thumbnail
            ? [
                  {
                      url: photo.url,
                      thumb: photo.thumbnail,
                      alt: photo.title ?? query,
                      credit: photo.creator ?? "Unknown",
                      creditUrl:
                          photo.creator_url ?? photo.foreign_landing_url ?? "https://openverse.org",
                      provider: "Openverse",
                      providerUrl: "https://openverse.org",
                      licence: photo.license?.toUpperCase() ?? "",
                  },
              ]
            : [],
    );
}

async function thumbnail(url: string, signal: AbortSignal, get: GetOne): Promise<string | null> {
    try {
        const found = await safeFetch(url, MAX_IMAGE_BYTES, signal, get);
        if (found.status !== 200) return null;
        const small = await sharp(found.bytes, { failOn: "error" })
            .resize({ width: THUMB, height: THUMB, fit: "cover" })
            .webp({ quality: 62 })
            .toBuffer();
        return `data:image/webp;base64,${small.toString("base64")}`;
    } catch {
        return null;
    }
}

export function createPhotoSearch(
    pexelsKey: string | undefined,
    get: GetOne = getOne,
    fetchImpl: typeof fetch = fetch,
) {
    return async (query: string, signal: AbortSignal): Promise<PhotoChoice[]> => {
        const limit = AbortSignal.any([signal, AbortSignal.timeout(20_000)]);
        const pexels = pexelsKey
            ? await searchPexels(pexelsKey, query, limit, fetchImpl).catch(() => [])
            : [];
        const found = pexels.length
            ? pexels
            : await searchOpenverse(query, limit, fetchImpl).catch(() => []);
        const shown = await Promise.all(
            found.map(async (photo) => {
                const thumb = await thumbnail(photo.thumb, limit, get);
                return thumb ? [{ ...photo, thumb }] : [];
            }),
        );
        return shown.flat();
    };
}

/** Downloads a picked photo, through the same checks as every other address. */
export async function downloadPhoto(
    url: string,
    signal: AbortSignal,
    get: GetOne = getOne,
): Promise<Uint8Array | null> {
    const found = await safeFetch(url, MAX_IMAGE_BYTES, signal, get);
    return found.status === 200 ? found.bytes : null;
}
