// Gives the tests their own database, so they never touch development data.
import { execSync } from "node:child_process";
import postgres from "postgres";
import { PORTS } from "../scripts/ports";

const credentials = `tondo:tondo@127.0.0.1:${String(PORTS.postgres)}`;
export const TEST_DATABASE = `postgres://${credentials}/tondo_test`;

export default async function setup(): Promise<void> {
    const admin = postgres(`postgres://${credentials}/postgres`, { max: 1, onnotice: () => null });
    await admin`drop database if exists tondo_test with (force)`;
    await admin`create database tondo_test`;
    await admin.end();
    execSync("pnpm db:migrate && pnpm db:seed", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: TEST_DATABASE },
    });
}
