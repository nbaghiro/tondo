import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import postgres from "postgres";
import { createInvites } from "../apps/server/src/invites";
import { signUpToEditor, signUpToStart } from "./helpers";
import { TEST_CODE } from "./test-code";
import { TEST_DATABASE } from "./setup-database";

const TEAM = "/api/v1/me/team";
const PAGES = "/api/v1/me/pages";
const SECRET = "a-test-secret-that-is-long-enough-to-use";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) > 900;
let made = 0;
const unique = (word: string) =>
    `${word}-${Date.now().toString(36)}${String(made++)}${String(process.pid)}`.slice(0, 30);

interface Person {
    context: BrowserContext;
    page: Page;
    api: APIRequestContext;
    handle: string;
    pageId: string;
}

const firstPageId = async (api: APIRequestContext) =>
    ((await (await api.get(PAGES)).json()) as { pages: { id: string }[] }).pages[0]?.id ?? "";

async function person(browser: Browser, plan = "pro"): Promise<Person> {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const handle = await signUpToEditor(page, [], { plan });
    return { context, page, api: page.request, handle, pageId: await firstPageId(page.request) };
}

interface Team {
    id: string;
    handle: string;
    lookPageId: string;
    people: { handle: string | null; role: string }[];
}

const teamOf = async (api: APIRequestContext) => (await (await api.get(TEAM)).json()) as Team;

/** Makes a team whose owner has brought their page, with its look published. */
async function makeTeam(owner: Person, { publish = true, join = true } = {}) {
    const handle = unique("team");
    const res = await owner.api.post(TEAM, {
        data: { name: "Aster and Bell", handle, ...(join ? { join: owner.pageId } : {}) },
    });
    expect(res.status()).toBe(201);
    const team = await teamOf(owner.api);
    if (publish) await publishPage(owner.api, team.lookPageId);
    return team;
}

/** Saves a button so the page can be published, then publishes it. */
async function publishPage(api: APIRequestContext, id: string, change: object = {}) {
    const url = `${PAGES}/${id}`;
    const draft = (await (await api.get(url)).json()) as { page: object; updatedAt: string };
    const saved = await api.put(url, {
        data: {
            updatedAt: draft.updatedAt,
            page: {
                ...draft.page,
                ...change,
                blocks: [
                    {
                        id: "b1",
                        type: "button",
                        variant: "filled",
                        text: "Tickets",
                        url: "https://tickets.example.com/",
                    },
                ],
            },
        },
    });
    const { updatedAt } = (await saved.json()) as { updatedAt: string };
    const res = await api.post(`${url}/publish`, { data: { updatedAt } });
    expect(res.status()).toBe(204);
}

const inviteLink = async (api: APIRequestContext, page?: string) => {
    const res = await api.post(`${TEAM}/invites`, { data: page ? { page } : {} });
    expect(res.status()).toBe(201);
    const { url } = (await res.json()) as { url: string };
    return new URL(url).searchParams.get("invite") ?? "";
};

const join = (who: Person, invite: string, page = who.pageId) =>
    who.api.post(`${TEAM}/join`, { data: { invite, page } });

async function joined(owner: Person, browser: Browser, plan = "pro") {
    const member = await person(browser, plan);
    const res = await join(member, await inviteLink(owner.api));
    expect(res.status()).toBe(201);
    return member;
}

const makeEditor = async (owner: Person, member: Person) => {
    const res = await owner.api.patch(`${TEAM}/people/${member.handle}`, {
        data: { role: "editor" },
    });
    expect(res.status()).toBe(204);
};

test.describe("teams", () => {
    test.beforeEach(({ page }) => {
        test.skip(!isDesktop(page), "The API doesn't depend on the screen");
        test.setTimeout(120_000);
    });

    test("who can reach which page, by role", async ({ browser }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const editor = await joined(owner, browser);
        await makeEditor(owner, editor);
        const member = await joined(owner, browser);
        const former = await joined(owner, browser);
        expect((await former.api.post(`${TEAM}/leave`, { data: {} })).status()).toBe(204);
        const stranger = await person(browser);
        const memberOther = await member.api.post(PAGES, {
            data: { name: "Band", handle: unique("band") },
        });
        const { id: personal } = (await memberOther.json()) as { id: string };

        const reads = (id: string) => [
            `${PAGES}/${id}`,
            `${PAGES}/${id}/check`,
            `${PAGES}/${id}/stats`,
            `/api/v1/me/photos?page=${id}`,
        ];
        const table: [string, Person, string, number][] = [
            ["owner on the look page", owner, team.lookPageId, 200],
            ["owner on a member's page", owner, member.pageId, 200],
            ["owner on a member's other page", owner, personal, 404],
            ["editor on the look page", editor, team.lookPageId, 200],
            ["editor on a member's page", editor, member.pageId, 200],
            ["editor on the owner's page", editor, owner.pageId, 200],
            ["editor on a member's other page", editor, personal, 404],
            ["member on their own page", member, member.pageId, 200],
            ["member on the look page", member, team.lookPageId, 404],
            ["member on an editor's page", member, editor.pageId, 404],
            ["former member on the look page", former, team.lookPageId, 404],
            ["former member on a member's page", former, member.pageId, 404],
            ["stranger on the look page", stranger, team.lookPageId, 404],
            ["stranger on a member's page", stranger, member.pageId, 404],
        ];
        for (const [name, who, id, status] of table) {
            for (const url of reads(id)) {
                expect((await who.api.get(url)).status(), `${name}: ${url}`).toBe(status);
            }
        }

        const writes: [string, Person, string, number][] = [
            ["member saves the look page", member, team.lookPageId, 404],
            ["stranger saves a member's page", stranger, member.pageId, 404],
            ["former member saves the look page", former, team.lookPageId, 404],
        ];
        const valid = (
            (await (await stranger.api.get(`${PAGES}/${stranger.pageId}`)).json()) as {
                page: object;
            }
        ).page;
        for (const [name, who, id, status] of writes) {
            const url = `${PAGES}/${id}`;
            const res = await who.api.put(url, {
                data: { page: valid, updatedAt: "2026-01-01 00:00:00+00" },
            });
            expect(res.status(), name).toBe(status);
            const publish = await who.api.post(`${url}/publish`, {
                data: { updatedAt: "2026-01-01 00:00:00+00" },
            });
            expect(publish.status(), `${name}: publish`).toBe(status);
            const down = await who.api.post(`${url}/unpublish`, { data: {} });
            expect(down.status(), `${name}: take down`).toBe(status);
            const gone = await who.api.delete(url, { data: {} });
            expect(gone.status(), `${name}: delete`).toBe(status);
            const moved = await who.api.patch(`${url}/handle`, { data: { handle: unique("x") } });
            expect(moved.status(), `${name}: address`).toBe(status);
        }

        // Reaching a page isn't owning it.
        const address = (who: Person, id: string) =>
            who.api.patch(`${PAGES}/${id}/handle`, { data: { handle: unique("x") } });
        expect((await address(owner, member.pageId)).status()).toBe(403);
        expect((await address(editor, member.pageId)).status()).toBe(403);
        expect((await address(editor, team.lookPageId)).status()).toBe(403);
        expect((await owner.api.delete(`${PAGES}/${member.pageId}`, { data: {} })).status()).toBe(
            403,
        );
        expect((await editor.api.delete(`${PAGES}/${member.pageId}`, { data: {} })).status()).toBe(
            403,
        );
        expect((await owner.api.delete(`${PAGES}/${team.lookPageId}`, { data: {} })).status()).toBe(
            409,
        );
        expect((await member.api.delete(`${PAGES}/${member.pageId}`, { data: {} })).status()).toBe(
            409,
        );

        // The team's routes.
        const routes: [string, string, string, object, Record<string, number>][] = [
            ["see the team", "GET", TEAM, {}, { o: 200, e: 200, m: 200, s: 404 }],
            ["end links", "DELETE", `${TEAM}/invites`, {}, { e: 403, m: 403, s: 404 }],
            ["make a link", "POST", `${TEAM}/invites`, {}, { e: 403, m: 403, s: 404 }],
            ["delete", "DELETE", TEAM, { handle: team.handle }, { e: 403, m: 403, s: 404 }],
            [
                "change a role",
                "PATCH",
                `${TEAM}/people/${member.handle}`,
                { role: "member" },
                { e: 403, m: 403, s: 404 },
            ],
            [
                "remove someone",
                "DELETE",
                `${TEAM}/people/${member.handle}`,
                {},
                { e: 403, m: 403, s: 404 },
            ],
            [
                "hand over",
                "POST",
                `${TEAM}/handover`,
                { handle: member.handle },
                { e: 403, m: 403, s: 404 },
            ],
            ["leave", "POST", `${TEAM}/leave`, {}, { o: 409, s: 404 }],
            [
                "add a team page",
                "POST",
                `${TEAM}/pages`,
                { name: "Squad", handle: unique("squad") },
                { m: 403, s: 404 },
            ],
            [
                "make a team",
                "POST",
                TEAM,
                { name: "Two", handle: unique("two") },
                {
                    o: 409,
                    e: 409,
                    m: 409,
                },
            ],
        ];
        const by: Record<string, Person> = { o: owner, e: editor, m: member, s: stranger };
        for (const [name, method, url, data, expected] of routes) {
            for (const [key, status] of Object.entries(expected)) {
                const who = by[key];
                if (!who) continue;
                const res = await who.api.fetch(url, {
                    method,
                    ...(method === "GET" ? {} : { data }),
                });
                expect(res.status(), `${key} tries to ${name}`).toBe(status);
            }
        }
        for (const who of [owner, editor, member, former, stranger]) await who.context.close();
    });

    test("two owners inviting at once leaves a person on one team", async ({ browser }) => {
        const [first, second, wanted] = await Promise.all([
            person(browser),
            person(browser),
            person(browser),
        ]);
        await makeTeam(first);
        await makeTeam(second);
        const [a, b] = await Promise.all([inviteLink(first.api), inviteLink(second.api)]);
        const results = await Promise.all([join(wanted, a), join(wanted, b)]);
        expect(results.map((res) => res.status()).sort()).toEqual([201, 409]);
        const sql = postgres(TEST_DATABASE, { max: 1 });
        const rows = await sql`select team_id from pages where id = ${wanted.pageId}`;
        await sql.end();
        expect(rows[0]?.["team_id"]).toBeTruthy();
    });

    test("the last page a team has room for goes to one person, and adding pages makes room", async ({
        browser,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const invite = await inviteLink(owner.api);
        // The look page and the owner's page use 2 of a pack's 5.
        for (let i = 0; i < 2; i++) {
            const member = await person(browser);
            expect((await join(member, invite)).status()).toBe(201);
            await member.context.close();
        }
        const [last, next] = await Promise.all([person(browser), person(browser)]);
        const results = await Promise.all([join(last, invite), join(next, invite)]);
        expect(results.map((res) => res.status()).sort()).toEqual([201, 409]);
        const refused = results.find((res) => res.status() === 409);
        expect(((await refused?.json()) as { code: string }).code).toBe("team_full");
        const sql = postgres(TEST_DATABASE, { max: 1 });
        await sql`update users set packs = 2 where id = (select owner_id from teams where id = ${team.id})`;
        await sql.end();
        const waiting = results[0].status() === 201 ? next : last;
        expect((await join(waiting, invite)).status()).toBe(201);
        expect((await teamOf(owner.api)).people).toHaveLength(5);
    });

    test("the owner can't leave or delete their account until the team is settled", async ({
        browser,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const member = await joined(owner, browser);
        expect((await owner.api.post(`${TEAM}/leave`, { data: {} })).status()).toBe(409);
        const email = `${owner.handle}@example.com`;
        const refused = await owner.api.delete("/api/v1/me", { data: { email } });
        expect(refused.status()).toBe(409);
        // Nothing went, including photos, which an account deletion removes first.
        expect((await owner.api.get(`${PAGES}/${owner.pageId}`)).status()).toBe(200);

        // Handing over: the link is for the person it names.
        const over = await owner.api.post(`${TEAM}/handover`, { data: { handle: member.handle } });
        expect(over.status()).toBe(201);
        const invite =
            new URL(((await over.json()) as { url: string }).url).searchParams.get("invite") ?? "";
        const stranger = await person(browser);
        expect((await stranger.api.post(`${TEAM}/takeover`, { data: { invite } })).status()).toBe(
            403,
        );
        expect((await member.api.post(`${TEAM}/takeover`, { data: { invite } })).status()).toBe(
            204,
        );
        expect((await teamOf(member.api)).people[0]?.handle).toBe(member.handle);
        expect((await teamOf(owner.api)).id).toBe(team.id);
        // The old link has gone, and the former owner can now go.
        expect((await member.api.post(`${TEAM}/takeover`, { data: { invite } })).status()).toBe(
            410,
        );
        expect((await owner.api.post(`${TEAM}/leave`, { data: {} })).status()).toBe(204);
    });

    test("a removed person keeps their page, and their old link stops working", async ({
        browser,
    }) => {
        const owner = await person(browser);
        await makeTeam(owner);
        const member = await person(browser);
        const invite = await inviteLink(owner.api);
        expect((await join(member, invite)).status()).toBe(201);
        await publishPage(member.api, member.pageId);
        expect(
            (await owner.api.delete(`${TEAM}/people/${member.handle}`, { data: {} })).status(),
        ).toBe(204);
        expect((await member.api.get(TEAM)).status()).toBe(404);
        expect((await owner.api.get(`${PAGES}/${member.pageId}`)).status()).toBe(404);
        const mine = await member.api.get(`${PAGES}/${member.pageId}`);
        expect(((await mine.json()) as { published: boolean }).published).toBe(true);
        expect((await member.page.request.get(`/${member.handle}`)).status()).toBe(200);
        expect((await join(member, invite)).status()).toBe(410);
        expect(
            (await owner.api.delete(`${TEAM}/people/${owner.handle}`, { data: {} })).status(),
        ).toBe(409);
    });

    test("a deleted account leaves the team with one fewer, and an editor's role doesn't return", async ({
        browser,
    }) => {
        const owner = await person(browser);
        await makeTeam(owner);
        const member = await joined(owner, browser);
        const email = `${member.handle}@example.com`;
        expect((await member.api.delete("/api/v1/me", { data: { email } })).status()).toBe(200);
        expect((await teamOf(owner.api)).people).toHaveLength(1);

        const again = await joined(owner, browser);
        await makeEditor(owner, again);
        expect((await again.api.post(`${TEAM}/leave`, { data: {} })).status()).toBe(204);
        expect((await join(again, await inviteLink(owner.api))).status()).toBe(201);
        expect((await teamOf(again.api)).people.find((p) => p.handle === again.handle)?.role).toBe(
            "member",
        );
    });

    test("expired, altered and ended links all read the same", async ({ browser, request }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const member = await person(browser);
        const past = createInvites(SECRET, () => Date.now() - 8 * 86_400_000).make({
            kind: "join",
            team: team.id,
            page: null,
        });
        const live = await inviteLink(owner.api);
        for (const token of [past.token, `${live}x`, "nonsense"]) {
            expect((await request.get(`/api/v1/invites/${token}`)).status()).toBe(410);
            expect((await join(member, token)).status()).toBe(410);
        }
        expect((await request.get(`/api/v1/invites/${live}`)).status()).toBe(200);
        expect((await owner.api.delete(`${TEAM}/invites`, { data: {} })).status()).toBe(204);
        expect((await request.get(`/api/v1/invites/${live}`)).status()).toBe(410);
        expect((await join(member, live)).status()).toBe(410);
        expect((await member.api.get(`${PAGES}/${member.pageId}`)).status()).toBe(200);
    });

    test("a page made for someone goes to one person, and a look page goes to nobody", async ({
        browser,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const handle = unique("rae");
        const copy = await owner.api.post(`${TEAM}/pages`, {
            data: { name: "Rae Bell", handle, from: team.lookPageId },
        });
        expect(copy.status()).toBe(201);
        const { id } = (await copy.json()) as { id: string };
        const invite = await inviteLink(owner.api, id);
        const look = await owner.api.post(`${TEAM}/invites`, { data: { page: team.lookPageId } });
        expect(look.status()).toBe(404);
        const [a, b] = await Promise.all([person(browser), person(browser)]);
        const results = await Promise.all([join(a, invite, "made"), join(b, invite, "made")]);
        expect(results.map((res) => res.status()).sort()).toEqual([201, 409]);
        const list = (await (await owner.api.get(TEAM)).json()) as { pages: { id: string }[] };
        expect(list.pages.map((page) => page.id)).toEqual([team.lookPageId]);
        const winner = results[0].status() === 201 ? a : b;
        expect(
            (
                (await (await winner.api.get(PAGES)).json()) as {
                    pages: { handle: string; side: string }[];
                }
            ).pages.find((page) => page.handle === handle)?.side,
        ).toBe("joined");
    });

    test("a team's pages stop at its room, even when added at once", async ({ browser }) => {
        const owner = await person(browser);
        await makeTeam(owner);
        const results = await Promise.all(
            Array.from({ length: 6 }, (_, i) =>
                owner.api.post(`${TEAM}/pages`, {
                    data: { name: `Page ${String(i)}`, handle: unique(`p${String(i)}`) },
                }),
            ),
        );
        expect(results.filter((res) => res.status() === 201)).toHaveLength(3);
        const full = results.find((res) => res.status() === 409);
        expect(((await full?.json()) as { code: string }).code).toBe("team_full");
    });

    test("deleting a team keeps members' pages, frees its address, and beats a join", async ({
        browser,
        request,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const member = await joined(owner, browser);
        await publishPage(member.api, member.pageId);
        const late = await person(browser);
        const invite = await inviteLink(owner.api);

        expect((await owner.api.delete(TEAM, { data: { handle: "wrong" } })).status()).toBe(400);
        const [gone, joining] = await Promise.all([
            owner.api.delete(TEAM, { data: { handle: team.handle } }),
            join(late, invite),
        ]);
        expect(gone.status()).toBe(204);
        expect([201, 410]).toContain(joining.status());

        for (const who of [member, owner, late]) {
            expect((await who.api.get(`${PAGES}/${who.pageId}`)).status()).toBe(200);
            expect((await who.api.get(TEAM)).status()).toBe(404);
        }
        expect((await request.get(`/${member.handle}`)).status()).toBe(200);
        expect((await request.get(`/${team.handle}`)).status()).toBe(404);
        const again = await owner.api.get(`/api/v1/handles/${team.handle}`);
        expect(((await again.json()) as { available: boolean }).available).toBe(true);
    });

    test("an owner taken down takes the team's pages down, and keeps the address held", async ({
        browser,
        request,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        expect((await request.get(`/${team.handle}`)).status()).toBe(200);
        const sql = postgres(TEST_DATABASE, { max: 1 });
        await sql`update users set suspended_at = now() where id = (select owner_id from teams where id = ${team.id})`;
        await sql.end();
        await expect
            .poll(async () => (await request.get(`/${team.handle}`)).status(), {
                timeout: 20_000,
            })
            .toBe(404);
        expect((await owner.api.post(`${TEAM}/invites`, { data: {} })).status()).toBe(403);
        expect((await owner.api.delete(TEAM, { data: { handle: team.handle } })).status()).toBe(
            204,
        );
        const held = await owner.api.get(`/api/v1/handles/${team.handle}`);
        expect(((await held.json()) as { available: boolean }).available).toBe(false);
    });

    test("the look reaches every page at once, and stays out of everyone's documents", async ({
        browser,
        request,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const member = await joined(owner, browser);
        await publishPage(member.api, member.pageId, { look: "bake", seed: 7 });
        const other = await member.api.post(PAGES, {
            data: { name: "Band", handle: unique("band") },
        });
        const { id: otherId } = (await other.json()) as { id: string };
        await publishPage(member.api, otherId, { look: "bake" });
        const before = (await (await member.api.get(`${PAGES}/${member.pageId}`)).json()) as {
            updatedAt: string;
            page: { look: string };
        };
        const lookOf = async (handle: string) =>
            /<html lang="en" class="look ([a-z-]+)"/.exec(
                await (await request.get(`/${handle}`)).text(),
            )?.[1];

        await publishPage(owner.api, team.lookPageId, { look: "signal" });
        expect(await lookOf(member.handle)).toBe("signal");
        expect(await lookOf(team.handle)).toBe("signal");
        const live = await (await request.get(`/${member.handle}`)).text();
        expect(live).not.toContain("<script");
        expect(live).toContain("Tickets");
        const otherHandle = (
            (await (await member.api.get(`${PAGES}/${otherId}`)).json()) as {
                handle: string;
            }
        ).handle;
        expect(await lookOf(otherHandle)).toBe("bake");

        const after = (await (await member.api.get(`${PAGES}/${member.pageId}`)).json()) as {
            updatedAt: string;
            page: { look: string };
            team: { locked: boolean; look: { look: string } };
        };
        expect(after.updatedAt).toBe(before.updatedAt);
        expect(after.page.look).toBe("bake");
        expect(after.team.locked).toBe(true);
        expect(after.team.look.look).toBe("signal");

        expect((await member.api.post(`${TEAM}/leave`, { data: {} })).status()).toBe(204);
        expect(await lookOf(member.handle)).toBe("bake");
    });

    test("an editor edits any page and can't change the look or the plan", async ({ browser }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const editor = await joined(owner, browser);
        await makeEditor(owner, editor);
        const member = await joined(owner, browser);

        await publishPage(editor.api, member.pageId);
        const url = `${PAGES}/${team.lookPageId}`;
        const draft = (await (await editor.api.get(url)).json()) as {
            page: { header: object };
            updatedAt: string;
        };
        const words = await editor.api.put(url, {
            data: {
                updatedAt: draft.updatedAt,
                page: { ...draft.page, header: { ...draft.page.header, bio: "From an editor" } },
            },
        });
        expect(words.status()).toBe(200);
        const fresh = (await words.json()) as { updatedAt: string };
        const look = await editor.api.put(url, {
            data: { updatedAt: fresh.updatedAt, page: { ...draft.page, look: "signal" } },
        });
        expect(look.status()).toBe(403);
        expect((await editor.api.post(`${url}/unpublish`, { data: {} })).status()).toBe(403);
        expect((await editor.api.post("/api/v1/me/billing/portal", { data: {} })).status()).toBe(
            404,
        );
    });

    test("a member's locked page in the builder shows the team's look", async ({ browser }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        await publishPage(owner.api, team.lookPageId, { look: "signal" });
        const member = await joined(owner, browser);
        await member.page.goto(`/app/edit?page=${member.pageId}&panel=look`);
        await expect(member.page.locator("[data-team-look]")).toContainText("Aster and Bell");
        await expect(member.page.locator(".tab-seg")).toHaveCount(0);
        const html = member.page.frameLocator("iframe.canvas").locator("html");
        await expect(html).toHaveClass(/signal/);
    });

    test("Help me spends the owner's credits for a member with no plan of their own", async ({
        browser,
    }) => {
        const owner = await person(browser);
        await makeTeam(owner);
        const free = await person(browser, "free");
        expect((await join(free, await inviteLink(owner.api))).status()).toBe(201);
        const paying = await joined(owner, browser, "starter");
        const status = async (who: Person) =>
            (await (await who.api.get("/api/v1/me/assistant")).json()) as {
                credits: number;
                once: boolean;
            };
        expect(await status(free)).toMatchObject({ credits: 300, once: false });
        expect(await status(paying)).toMatchObject({ credits: 100 });
        const lone = await person(browser, "free");
        expect(await status(lone)).toMatchObject({ credits: 15, once: true });
    });

    test("the rule for what stays online when the owner's plan ends", async ({
        browser,
        request,
    }) => {
        const owner = await person(browser);
        const team = await makeTeam(owner);
        const onFree = await person(browser, "free");
        const onStarter = await person(browser, "starter");
        const onPro = await person(browser);
        const invite = await inviteLink(owner.api);
        for (const who of [onFree, onStarter, onPro]) {
            expect((await join(who, invite)).status()).toBe(201);
            await publishPage(who.api, who.pageId);
        }
        const visit = async (handle: string) => (await request.get(`/${handle}`)).status();
        for (const handle of [team.handle, onFree.handle, onStarter.handle, onPro.handle]) {
            expect(await visit(handle)).toBe(200);
        }
        const sql = postgres(TEST_DATABASE, { max: 1 });
        const ended = new Date(Date.now() - 86_400_000);
        await sql`update users set ends_at = ${ended} where id = (select owner_id from teams where id = ${team.id})`;
        await sql.end();
        await expect.poll(() => visit(team.handle), { timeout: 20_000 }).toBe(404);
        await expect.poll(() => visit(onFree.handle), { timeout: 20_000 }).toBe(404);
        expect(await visit(onStarter.handle)).toBe(200);
        expect(await visit(onPro.handle)).toBe(200);
        expect((await owner.api.post(`${TEAM}/invites`, { data: {} })).status()).toBe(403);
        const stranger = await person(browser);
        expect((await join(stranger, invite)).status()).toBe(403);
    });
});

// By screen, on both sizes.
test("the owner makes a team and an invitation on the team screen", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await page.goto("/app/team");
    const teamHandle = unique("studio");
    await page.locator('[data-make-team] input[name="name"]').fill("Fern Studio");
    await page.locator('[data-make-team] input[name="handle"]').fill(teamHandle);
    await page.locator('[data-make-team] select[name="join"]').selectOption({ index: 1 });
    await page.locator("[data-make-team] button[type=submit]").click();
    await expect(page.locator(".ph p")).toContainText("Fern Studio, 1 person");
    await expect(page.locator(`[data-person="${handle}"]`)).toContainText("Owner");
    await expect(page.locator(`[data-team-page="${teamHandle}"]`)).toContainText(
        "holds the team's look",
    );

    await page.locator("[data-new-team-page]").click();
    await page.locator('[data-team-page-form] input[name="name"]').fill("Rae Bell");
    const rae = unique("rae");
    await page.locator('[data-team-page-form] input[name="handle"]').fill(rae);
    await page.locator("[data-add-team-page]").click();
    await expect(page.locator(`[data-team-page="${rae}"]`)).toBeVisible();

    await page.locator("[data-invite]").click();
    await page.locator("[data-make-invite]").click();
    await expect(page.locator('input[name="invite-link"]')).toHaveValue(/\/join\?invite=/);

    await page.goto("/app/");
    await page.locator("[data-page-switcher]:visible").click();
    await expect(page.locator("[data-team-pages]")).toHaveText("Fern Studio");
    await expect(page.locator(`[data-page-item="${teamHandle}"]:visible`)).toBeVisible();
    await expect(page.locator(".psw-new")).toContainText("0 of 5");
});

test("someone new signs up through a link, to the page made for them", async ({
    page,
    browser,
}) => {
    const owner = await person(browser);
    const team = await makeTeam(owner);
    const rae = unique("rae");
    const copy = await owner.api.post(`${TEAM}/pages`, {
        data: { name: "Rae Bell", handle: rae, from: team.lookPageId },
    });
    const { id } = (await copy.json()) as { id: string };
    const invite = await inviteLink(owner.api, id);

    await page.goto(`/app/join?invite=${invite}`);
    await page.waitForURL(/\/signup\?invite=/);
    await expect(page.locator("[data-lead]")).toContainText("Join Aster and Bell");
    const email = `${unique("new")}@example.com`;
    await page.locator("input[name=email]").fill(email);
    await page.locator("input[name=password]").fill("long enough pass");
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/verify/);
    await page.locator("input[name=code]").fill(TEST_CODE);
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/app\/join/);
    await expect(page.locator("[data-join]")).toContainText("made for you");
    await page.locator("[data-join-yes]").click();
    await page.waitForURL(/\/app\/team/);
    await expect(page.locator(`[data-person="${rae}"]`)).toContainText("Member");
    await expect(page.locator("[data-invite]")).toHaveCount(0);
});

test("someone new with no page made makes one first, and someone with pages chooses", async ({
    page,
    browser,
}) => {
    const owner = await person(browser);
    await makeTeam(owner);
    const invite = await inviteLink(owner.api);

    const handle = await signUpToStart(page);
    await page.goto(`/app/join?invite=${invite}`);
    await page.locator("[data-make-first]").click();
    await page.waitForURL(/\/app\/start/);
    await page.locator("#start-name").fill("Ana Ruiz");
    for (let step = 0; step < 4; step++) await page.locator("[data-next]").click();
    await page.locator("#start-handle").fill(handle);
    await expect(page.locator("#start-note")).toHaveClass(/ok/);
    await page.locator("[data-next]").click();
    await page.waitForURL(/\/app\/join/);
    await expect(page.locator(".join-pages")).toContainText(handle);
    await page.locator("[data-join-yes]").click();
    await page.waitForURL(/\/app\/team/);
    await expect(page.locator(`[data-person="${handle}"]`)).toBeVisible();

    await page.goto(`/app/join?invite=${invite}`);
    await expect(page.locator("[data-on-team]")).toContainText("already on");
    await page.goto("/app/join?invite=nonsense");
    await expect(page.locator("[data-invite-ended]")).toContainText("has ended");
});
