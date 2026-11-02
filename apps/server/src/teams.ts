import {
    changeRoleRequest,
    deleteTeamRequest,
    joinRequest,
    makeInviteRequest,
    newTeamPageRequest,
    newTeamRequest,
    routes,
    setTeamPageRequest,
    takeoverRequest,
    teamPersonRequest,
} from "@tondo/contract";
import type {
    ErrorResponse,
    InviteResponse,
    MadeInviteResponse,
    NewPageResponse,
    TeamResponse,
} from "@tondo/contract";
import type { PageStore, TeamStore, TeamView } from "@tondo/db";
import { isCovered, starterPage, TEAM_PAGES, teamLookOf, withTeamLook } from "@tondo/page";
import type { Page } from "@tondo/page";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import type { Invites } from "./invites";
import { limitsOf } from "./limits";
import { copyPhotosInto, folderFor, ownPhotos } from "./photos";
import { summaryOut } from "./summaries";
import type { Storage } from "./storage";
import { clientIp, createLimiter } from "./traffic";
import type { Scale } from "./traffic";

const ENDED = "This invitation has ended. Ask the team's owner for a new link.";
const NOT_OWNER = "Only the team's owner can do this.";
const NEEDS_PRO = "Inviting people to a team needs the owner to be on Pro.";

export interface TeamDeps {
    teams: TeamStore;
    pages: PageStore;
    storage: Storage | null;
    currentPerson: CurrentPerson;
    invites: Invites;
    scale: Scale;
    /** Forgets what's cached for this person's pages and, if they own a team, everyone's on it. */
    dropAround: (userId: string) => Promise<void>;
    dropHandles: (handles: readonly string[]) => void;
    appUrl: (c: Context) => string;
}

// Who can do what is decided here from the team the signed-in person is on, so nobody names a team, and
// someone on no team gets the same answer as a team that doesn't exist.
export function mountTeams(app: Hono, deps: TeamDeps): void {
    const { teams, pages, storage, currentPerson, invites, scale } = deps;
    const { dropAround, dropHandles, appUrl } = deps;
    const fail = (
        c: Context,
        status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 415 | 429 | 503,
        error: string,
        code?: string,
    ) => c.json<ErrorResponse>({ error, ...(code ? { code } : {}) }, status);
    const allowChange = createLimiter(scale(30), 60_000);
    const small = bodyLimit({
        maxSize: 8192,
        onError: (c) => fail(c, 413, "That's too long."),
    });
    const noTeam = (c: Context) => fail(c, 404, "You're not on a team.");
    const body = (c: Context) => c.req.json<unknown>().catch(() => null);

    /** The person making a change, or the refusal to send. */
    const changer = async (c: Context) => {
        if (!c.req.header("content-type")?.startsWith("application/json")) {
            return fail(c, 415, "Send this as JSON.");
        }
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowChange(person.id))
            return fail(c, 429, "Too many tries. Wait a little and try again.");
        return person;
    };
    const ownerView = async (c: Context, userId: string) => {
        const view = await teams.find(userId);
        if (!view) return noTeam(c);
        if (view.role !== "owner") return fail(c, 403, NOT_OWNER);
        return view;
    };
    const isView = (value: TeamView | Response): value is TeamView => !(value instanceof Response);

    const toResponse = (view: TeamView): TeamResponse => ({
        id: view.id,
        name: view.name,
        handle: view.handle,
        lookPageId: view.lookPageId,
        lookLive: view.lookLive,
        role: view.role,
        covered: isCovered(view.owner, limitsOf),
        most: limitsOf(view.owner).people,
        pagesMost: TEAM_PAGES,
        ownerSuspended: view.ownerSuspended,
        myPageId: view.myPageId,
        people: view.people.map((person) => ({
            ...person,
            // A member can't open a teammate's page, so they've no use for its id.
            pageId: view.role === "member" && !person.you ? null : person.pageId,
        })),
        pages: view.pages.map(summaryOut),
    });

    const inviteIfOpen = async (token: string) => {
        const invite = invites.read(token);
        if (!invite) return null;
        const team = await teams.invite(invite.team, invite.page);
        if (!team || team.ownerSuspended || invite.madeAt < team.invitesFrom.getTime()) return null;
        return { invite, team };
    };

    app.get(routes.team, async (c) => {
        c.header("Cache-Control", "no-store");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const view = await teams.find(person.id);
        return view ? c.json<TeamResponse>(toResponse(view)) : noTeam(c);
    });

    app.post(routes.team, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const parsed = newTeamRequest.safeParse(await body(c));
        if (!parsed.success) {
            return fail(
                c,
                400,
                "Give your team a name, and an address of 1 to 30 lowercase letters, numbers or hyphens.",
            );
        }
        const { name, handle, join } = parsed.data;
        const joining = join ? await pages.findDraft(person.id, join) : null;
        if (join && !joining) return fail(c, 404, "We couldn't find that page.");
        const blank = starterPage(name);
        const page: Page = joining ? withTeamLook(blank, teamLookOf(joining.page)) : blank;
        const made = await teams.create(person.id, { handle, page, join: join ?? null });
        if (made === "on-team") return fail(c, 409, "You're already on a team. Leave it first.");
        if (made === "taken") return fail(c, 409, "That address is taken. Try another one.");
        if (made === "missing") return fail(c, 409, "Choose your first address first.");
        await dropAround(person.id);
        return c.json<{ id: string }>(made, 201);
    });

    app.delete(routes.team, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await ownerView(c, person.id);
        if (!isView(view)) return view;
        const parsed = deleteTeamRequest.safeParse(await body(c));
        if (parsed.data?.handle !== view.handle) {
            return fail(c, 400, "Type the team's address to confirm.");
        }
        // Photos go first, because this can be tried again. If they can't go, nothing has been lost.
        if (storage) {
            try {
                const lists = await Promise.all(
                    view.pages.map((page) => storage.list(folderFor(page.id))),
                );
                await Promise.all(lists.flat().map((file) => storage.remove(file)));
            } catch (error) {
                process.stderr.write(`Couldn't remove a team's photos: ${String(error)}\n`);
                return fail(c, 503, "We couldn't remove the team's photos. Please try again.");
            }
        }
        const around = await pages.handlesAround(person.id);
        dropHandles([...around, ...(await teams.deleteTeam(view.id))]);
        return c.body(null, 204);
    });

    app.post(routes.teamInvites, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await ownerView(c, person.id);
        if (!isView(view)) return view;
        const parsed = makeInviteRequest.safeParse(await body(c));
        if (!parsed.success) return fail(c, 400, "That didn't work. Please try again.");
        if (view.ownerSuspended) return fail(c, 403, "This team's pages were taken down.");
        if (!isCovered(view.owner, limitsOf)) return fail(c, 403, NEEDS_PRO, "plan_limit");
        const page = parsed.data.page ?? null;
        if (page && (page === view.lookPageId || !view.pages.some((own) => own.id === page))) {
            return fail(c, 404, "We couldn't find that page.");
        }
        const { token, until } = invites.make({ kind: "join", team: view.id, page });
        return c.json<MadeInviteResponse>(
            {
                url: `${appUrl(c)}/join?invite=${token}`,
                until: new Date(until).toISOString(),
            },
            201,
        );
    });

    app.delete(routes.teamInvites, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await ownerView(c, person.id);
        if (!isView(view)) return view;
        await teams.endInvites(view.id);
        return c.body(null, 204);
    });

    app.post(routes.teamPages, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await teams.find(person.id);
        if (!view) return noTeam(c);
        if (view.role === "member") return fail(c, 403, "Only the owner and editors can do this.");
        const parsed = newTeamPageRequest.safeParse(await body(c));
        if (!parsed.success) {
            return fail(
                c,
                400,
                "Give the page a name, and an address of 1 to 30 lowercase letters, numbers or hyphens.",
            );
        }
        const { name, handle, from } = parsed.data;
        const source = from ? await pages.findDraft(person.id, from) : null;
        if (from && !source) return fail(c, 404, "We couldn't find that page.");
        const id = crypto.randomUUID();
        const look = await pages.findOwnLive(person.id, view.lookPageId);
        const blank = withTeamLook(starterPage(name), look ? teamLookOf(look) : null);
        let draft: Page = blank;
        if (source) {
            const seed = 1 + Math.floor(Math.random() * 100_000);
            const named: Page = {
                ...source.page,
                seed,
                header: { ...source.page.header, name },
            };
            // The new page may go to someone else, so it gets its own copies of the photos.
            draft = storage ? await copyPhotosInto(storage, named, id) : named;
        }
        const added = await teams.addPage(view.id, { id, handle, draft });
        if (added === "full") {
            return fail(
                c,
                409,
                `A team can have ${String(TEAM_PAGES)} pages of its own.`,
                "team_pages",
            );
        }
        if (added === "taken") return fail(c, 409, "That address is taken. Try another one.");
        dropHandles([handle]);
        return c.json<NewPageResponse>({ id }, 201);
    });

    app.put(routes.teamPage, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await teams.find(person.id);
        if (!view) return noTeam(c);
        const parsed = setTeamPageRequest.safeParse(await body(c));
        if (!parsed.success) return fail(c, 400, "Choose a page.");
        if (!(await teams.setPage(view.id, person.id, parsed.data.page))) {
            return fail(c, 404, "We couldn't find that page.");
        }
        await dropAround(view.ownerId);
        await dropAround(person.id);
        return c.body(null, 204);
    });

    app.post(routes.teamLeave, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await teams.find(person.id);
        if (!view) return noTeam(c);
        const left = await teams.leave(person.id);
        if (left === "owner") {
            return fail(c, 409, "Hand the team to someone else, or delete it.", "owner");
        }
        if (left === "missing") return noTeam(c);
        await dropAround(view.ownerId);
        await dropAround(person.id);
        return c.body(null, 204);
    });

    const personRoute = routes.teamPerson(":handle").replace("%3A", ":");
    app.patch(personRoute, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await ownerView(c, person.id);
        if (!isView(view)) return view;
        const parsed = changeRoleRequest.safeParse(await body(c));
        if (!parsed.success) return fail(c, 400, "Choose Editor or Member.");
        const done = await teams.setRole(
            view.id,
            c.req.param("handle") ?? "",
            parsed.data.role === "editor",
        );
        if (done === "owner") return fail(c, 409, "The owner's role can't be changed here.");
        if (done === "missing") return fail(c, 404, "That person isn't on this team.");
        return c.body(null, 204);
    });

    app.delete(personRoute, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await ownerView(c, person.id);
        if (!isView(view)) return view;
        const done = await teams.remove(view.id, c.req.param("handle") ?? "");
        if (done === "owner") {
            return fail(c, 409, "Hand the team to someone else, or delete it.", "owner");
        }
        if (done === "missing") return fail(c, 404, "That person isn't on this team.");
        await dropAround(view.ownerId);
        await dropAround(done.userId);
        return c.body(null, 204);
    });

    app.post(routes.teamHandover, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const view = await ownerView(c, person.id);
        if (!isView(view)) return view;
        if (view.ownerSuspended) return fail(c, 403, "This team's pages were taken down.");
        const parsed = teamPersonRequest.safeParse(await body(c));
        const named = view.people.find(
            (other) => other.handle === parsed.data?.handle && other.role !== "owner",
        );
        if (!named?.pageId) return fail(c, 404, "That person isn't on this team.");
        const { token, until } = invites.make({
            kind: "takeover",
            team: view.id,
            page: named.pageId,
        });
        return c.json<MadeInviteResponse>(
            {
                url: `${appUrl(c)}/join?invite=${token}`,
                until: new Date(until).toISOString(),
            },
            201,
        );
    });

    app.post(routes.teamTakeover, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const parsed = takeoverRequest.safeParse(await body(c));
        const open = parsed.success ? await inviteIfOpen(parsed.data.invite) : null;
        if (open?.invite.kind !== "takeover") return fail(c, 410, ENDED);
        const held = await pages.findDraft(person.id, open.invite.page);
        if (held?.side !== "joined") {
            return fail(c, 403, "This link is for someone else on the team.");
        }
        if (held.suspended) return fail(c, 403, "Your pages were taken down.");
        if (!isCovered(held.standing.account, limitsOf)) {
            return fail(c, 403, "You'll need Pro to take over this team.", "plan_limit");
        }
        const before = open.team.ownerId;
        if (!(await teams.takeOver(open.team.id, person.id, open.invite.page))) {
            return fail(c, 410, ENDED);
        }
        await dropAround(person.id);
        await dropAround(before);
        return c.body(null, 204);
    });

    app.post(routes.teamJoin, small, async (c) => {
        const person = await changer(c);
        if (person instanceof Response) return person;
        const parsed = joinRequest.safeParse(await body(c));
        if (!parsed.success) return fail(c, 400, "Choose a page.");
        const open = await inviteIfOpen(parsed.data.invite);
        if (open?.invite.kind !== "join") return fail(c, 410, ENDED);
        const { invite, team } = open;
        if (!isCovered(team.owner, limitsOf)) {
            return fail(c, 403, "This team's plan has ended. Ask the owner.", "plan_limit");
        }
        const made = parsed.data.page === "made";
        if (made && !invite.page) return fail(c, 400, "Choose a page.");
        const joined = await teams.join(
            team.id,
            person.id,
            made && invite.page ? { made: invite.page } : { own: parsed.data.page },
            limitsOf(team.owner).people,
        );
        if (joined === "ended") return fail(c, 410, ENDED);
        if (joined === "on-team") {
            return fail(c, 409, "You're already on a team. Leave it first to join this one.");
        }
        if (joined === "full") {
            return fail(c, 409, "This team is full. Ask the owner to make room.", "team_full");
        }
        if (joined === "taken") {
            return fail(c, 409, "That page has already been claimed. Choose another.");
        }
        if (joined === "missing") return fail(c, 404, "We couldn't find that page.");
        if (made && invite.page && storage) {
            await ownPhotos(storage, pages, invite.page).catch((error: unknown) => {
                process.stderr.write(`Couldn't copy a page's photos: ${String(error)}\n`);
            });
        }
        await dropAround(team.ownerId);
        await dropAround(person.id);
        return c.json({ handle: joined.handle }, 201);
    });

    // Anyone with a link can read this, so it says only what the join screen shows.
    const allowInvite = createLimiter(scale(60), 60_000);
    app.get(routes.invite(":token").replace("%3A", ":"), async (c) => {
        if (!allowInvite(clientIp(c))) {
            return fail(c, 429, "Too many tries. Wait a little and try again.");
        }
        const open = await inviteIfOpen(c.req.param("token") ?? "");
        if (!open) return fail(c, 410, ENDED);
        const { invite, team } = open;
        c.header("Cache-Control", "no-store");
        return c.json<InviteResponse>({
            kind: invite.kind,
            name: team.name,
            handle: team.handle,
            until: new Date(invite.until).toISOString(),
            look: team.look ? teamLookOf(team.look) : null,
            made: team.made,
            full: team.peopleCount >= limitsOf(team.owner).people,
            covered: isCovered(team.owner, limitsOf),
        });
    });
}
