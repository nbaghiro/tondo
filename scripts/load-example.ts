// Copies an example page into a local account's draft, to open it in the builder. Local Docker only:
// pnpm examples:load <example> <handle>
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pageSchema } from "@tondo/page";
import postgres from "postgres";
import { PORTS } from "./ports";

const LOCAL_DATABASE = `postgres://tondo:tondo@127.0.0.1:${String(PORTS.postgres)}/tondo`;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Why this can't run here, or null if it can. */
export function refusal(env: Readonly<Record<string, string | undefined>>): string | null {
    if (env["NODE_ENV"] === "production") return "This only runs in development.";
    const url = env["DATABASE_URL"] ?? LOCAL_DATABASE;
    if (!URL.canParse(url) || !LOCAL_HOSTS.has(new URL(url).hostname)) {
        return "This only runs against the local database.";
    }
    return null;
}

const fail = (message: string): never => {
    process.stderr.write(`${message}\n`);
    process.exit(1);
};

async function main(example: string, handle: string): Promise<void> {
    const raw: unknown = JSON.parse(
        readFileSync(`apps/marketing/src/data/pages/${example}.json`, "utf8"),
    );
    const page = pageSchema.parse(raw);
    const sql = postgres(process.env["DATABASE_URL"] ?? LOCAL_DATABASE, { max: 1 });
    try {
        const saved = await sql`
            update pages set draft = ${sql.json(JSON.parse(JSON.stringify(page)) as never)}, updated_at = now()
            where handle = ${handle}
            returning id`;
        if (!saved.length) fail(`No local account has the address ${handle}.`);
    } finally {
        await sql.end();
    }
    process.stdout.write(
        `Loaded ${example} into the draft of ${handle}. Its live page is as it was.\n`,
    );
}

if (resolve(process.argv[1] ?? "") === import.meta.filename) {
    const [example, handle] = process.argv.slice(2);
    const refused = refusal(process.env);
    if (refused) fail(refused);
    if (!example || !handle || !/^[a-z0-9-]+$/.test(example)) {
        fail("Use: pnpm examples:load <example> <handle>, such as lowtidesurf maya.");
    } else {
        await main(example, handle);
    }
}
