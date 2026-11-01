// A local stand-in for Neon Auth's HTTP API, for Playwright only. The apps can't tell it apart from
// Neon because it's just a different NEON_AUTH_BASE_URL, so nothing in them needs a test mode.
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { PORTS } from "../scripts/ports";
import { TEST_CODE } from "./test-code";

const COOKIE = "__Secure-neon-auth.session_token";

interface Person {
    id: string;
    email: string;
    name: string;
    password: string;
    emailVerified: boolean;
}

const people = new Map<string, Person>();
const sessions = new Map<string, Person>();

function send(res: ServerResponse, status: number, body: unknown, cookie?: string): void {
    res.writeHead(status, {
        "content-type": "application/json",
        ...(cookie ? { "set-cookie": cookie } : {}),
    });
    res.end(JSON.stringify(body));
}

const publicUser = ({ id, email, name, emailVerified }: Person) => ({
    id,
    email,
    name,
    emailVerified,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
});

function signIn(person: Person): { cookie: string; token: string } {
    const token = randomUUID();
    sessions.set(token, person);
    return {
        token,
        cookie: `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
    };
}

const tokenIn = (header: string | undefined) => /session_token=([^;]+)/.exec(header ?? "")?.[1];

// A stand-in for object storage on the same port. It speaks just enough of S3 for uploads.
const files = new Map<string, Buffer>();
function standInStorage(method: string, url: string, bytes: Buffer, res: ServerResponse): void {
    const { pathname, searchParams } = new URL(url, "http://stand-in");
    const key = pathname.split("/").slice(3).join("/");
    if (method === "PUT") {
        files.set(key, bytes);
        res.writeHead(200).end();
    } else if (method === "DELETE") {
        files.delete(key);
        res.writeHead(204).end();
    } else if (!key) {
        const prefix = searchParams.get("prefix") ?? "";
        const keys = [...files.keys()].filter((name) => name.startsWith(prefix));
        res.writeHead(200).end(keys.map((name) => `<Key>${name}</Key>`).join(""));
    } else {
        const found = files.get(key);
        if (found) res.writeHead(200).end(found);
        else res.writeHead(404).end();
    }
}

const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
    });
    req.on("end", () => {
        const bytes = Buffer.concat(chunks);
        const raw = bytes.toString();
        if (req.url?.startsWith("/s3/")) {
            standInStorage(req.method ?? "GET", req.url, bytes, res);
            return;
        }
        const path = new URL(req.url ?? "/", "http://stand-in").pathname.replace("/auth/", "");
        const body = (raw ? JSON.parse(raw) : {}) as Record<string, string>;
        const email = body["email"] ?? "";
        const person = people.get(email);

        switch (path) {
            case "sign-up/email": {
                if (person) {
                    send(res, 422, { code: "USER_ALREADY_EXISTS", message: "Already exists." });
                    return;
                }
                const created: Person = {
                    id: randomUUID(),
                    email,
                    name: body["name"] ?? "",
                    password: body["password"] ?? "",
                    emailVerified: false,
                };
                people.set(email, created);
                send(res, 200, { token: null, user: publicUser(created) });
                return;
            }
            case "sign-in/email": {
                if (person?.password !== body["password"]) {
                    send(res, 401, { code: "INVALID_EMAIL_OR_PASSWORD", message: "No match." });
                } else if (!person?.emailVerified) {
                    send(res, 403, { code: "EMAIL_NOT_VERIFIED", message: "Not verified." });
                } else {
                    const { token, cookie } = signIn(person);
                    send(res, 200, { token, user: publicUser(person) }, cookie);
                }
                return;
            }
            case "email-otp/send-verification-otp":
            case "email-otp/request-password-reset":
                send(res, 200, { success: true });
                return;
            case "email-otp/verify-email": {
                if (!person || body["otp"] !== TEST_CODE) {
                    send(res, 400, { code: "INVALID_OTP", message: "Wrong code." });
                    return;
                }
                person.emailVerified = true;
                const { token, cookie } = signIn(person);
                send(res, 200, { token, user: publicUser(person) }, cookie);
                return;
            }
            case "get-session": {
                const token = tokenIn(req.headers.cookie);
                const found = token ? sessions.get(token) : undefined;
                send(
                    res,
                    200,
                    found && token
                        ? {
                              session: {
                                  id: token,
                                  token,
                                  userId: found.id,
                                  expiresAt: "2099-01-01T00:00:00.000Z",
                                  createdAt: "2026-01-01T00:00:00.000Z",
                                  updatedAt: "2026-01-01T00:00:00.000Z",
                              },
                              user: publicUser(found),
                          }
                        : null,
                );
                return;
            }
            case "change-password": {
                const token = tokenIn(req.headers.cookie);
                const found = token ? sessions.get(token) : undefined;
                if (!found || found.password !== body["currentPassword"]) {
                    send(res, 400, { code: "INVALID_PASSWORD", message: "Wrong password." });
                    return;
                }
                found.password = body["newPassword"] ?? "";
                send(res, 200, { token: null, user: publicUser(found) });
                return;
            }
            case "delete-user": {
                const token = tokenIn(req.headers.cookie);
                const found = token ? sessions.get(token) : undefined;
                if (found) people.delete(found.email);
                if (token) sessions.delete(token);
                send(res, 200, { success: true }, `${COOKIE}=; Path=/; Max-Age=0`);
                return;
            }
            case "sign-out": {
                const token = tokenIn(req.headers.cookie);
                if (token) sessions.delete(token);
                send(res, 200, { success: true }, `${COOKIE}=; Path=/; Max-Age=0`);
                return;
            }
            default:
                send(res, 404, { message: `Not in the stand-in: ${path}` });
        }
    });
});

server.listen(PORTS.testNeon, "127.0.0.1");
