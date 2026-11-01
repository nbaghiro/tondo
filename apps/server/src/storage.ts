import { AwsClient } from "aws4fetch";

/** Where uploads live. This speaks S3, so RustFS locally and Cloudflare R2 in production both work. */
export interface Storage {
    put: (key: string, bytes: Uint8Array, type: string) => Promise<void>;
    get: (key: string) => Promise<Uint8Array | null>;
    list: (prefix: string) => Promise<string[]>;
}

export interface StorageConfig {
    endpoint: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    region: string;
}

// The local values come from docker-compose.yml. Production has to set its own.
export function storageConfig(env: NodeJS.ProcessEnv, production: boolean): StorageConfig | null {
    const endpoint = env["S3_ENDPOINT"] ?? (production ? undefined : "http://127.0.0.1:8105");
    const accessKey = env["S3_ACCESS_KEY"] ?? (production ? undefined : "tondo");
    const secretKey = env["S3_SECRET_KEY"] ?? (production ? undefined : "tondo-local");
    if (!endpoint || !accessKey || !secretKey) return null;
    return {
        endpoint: endpoint.replace(/\/$/, ""),
        bucket: env["S3_BUCKET"] ?? "tondo-photos",
        accessKey,
        secretKey,
        region: env["S3_REGION"] ?? "auto",
    };
}

export function createS3Storage(
    config: StorageConfig,
): Storage & { ensureBucket: () => Promise<void> } {
    const client = new AwsClient({
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        service: "s3",
        region: config.region,
    });
    const base = `${config.endpoint}/${config.bucket}`;
    return {
        // Local development only. A production bucket is made in its provider's console.
        ensureBucket: async () => {
            await client.fetch(base, { method: "PUT" });
        },
        put: async (key, bytes, type) => {
            const res = await client.fetch(`${base}/${key}`, {
                method: "PUT",
                headers: { "content-type": type },
                body: bytes,
            });
            if (!res.ok) throw new Error(`Storage refused an upload: ${String(res.status)}`);
        },
        get: async (key) => {
            const res = await client.fetch(`${base}/${key}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`Storage refused a read: ${String(res.status)}`);
            return new Uint8Array(await res.arrayBuffer());
        },
        list: async (prefix) => {
            const params = new URLSearchParams({ "list-type": "2", prefix });
            const res = await client.fetch(`${base}?${params.toString()}`);
            if (!res.ok) throw new Error(`Storage refused a list: ${String(res.status)}`);
            const xml = await res.text();
            return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].flatMap((match) =>
                match[1] ? [match[1]] : [],
            );
        },
    };
}

/** Keeps files in memory, for tests. */
export function createMemoryStorage(): Storage {
    const files = new Map<string, Uint8Array>();
    return {
        put: (key, bytes) => {
            files.set(key, bytes);
            return Promise.resolve();
        },
        get: (key) => Promise.resolve(files.get(key) ?? null),
        list: (prefix) =>
            Promise.resolve([...files.keys()].filter((key) => key.startsWith(prefix))),
    };
}
