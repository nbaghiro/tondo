import { routes } from "@tondo/contract";
import type {
    ErrorResponse,
    InviteResponse,
    MadeInviteResponse,
    NewPageResponse,
    TeamResponse,
} from "@tondo/contract";

const OFFLINE = "That didn't work. Check your connection and try again.";

const send = async (method: string, path: string, body: object): Promise<Response | null> =>
    fetch(path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    }).catch(() => null);

const problemIn = async (res: Response | null): Promise<string> => {
    if (!res) return OFFLINE;
    const body = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
    return body.error ?? "That didn't work. Please try again.";
};

/** Sends a change, and returns what went wrong, or null if it worked. */
const change = async (method: string, path: string, body: object): Promise<string | null> => {
    const res = await send(method, path, body);
    return res?.ok ? null : problemIn(res);
};

/** Null means this person isn't on a team. */
export async function loadTeam(): Promise<TeamResponse | null> {
    const res = await fetch(routes.team);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await problemIn(res));
    return (await res.json()) as TeamResponse;
}

export const makeTeam = (body: { name: string; handle: string; join?: string }) =>
    change("POST", routes.team, body);
export const deleteTeam = (handle: string) => change("DELETE", routes.team, { handle });
export const leaveTeam = () => change("POST", routes.teamLeave, {});
export const endInvites = () => change("DELETE", routes.teamInvites, {});
export const setMyTeamPage = (page: string | null) => change("PUT", routes.teamPage, { page });
export const removePerson = (handle: string) => change("DELETE", routes.teamPerson(handle), {});
export const setRole = (handle: string, role: "editor" | "member") =>
    change("PATCH", routes.teamPerson(handle), { role });
export const joinTeam = (invite: string, page: string) =>
    change("POST", routes.teamJoin, { invite, page });
export const takeOverTeam = (invite: string) => change("POST", routes.teamTakeover, { invite });

const madeLink = async (res: Response | null): Promise<MadeInviteResponse | { error: string }> =>
    res?.ok ? ((await res.json()) as MadeInviteResponse) : { error: await problemIn(res) };

export const makeInvite = async (page: string | null) =>
    madeLink(await send("POST", routes.teamInvites, page ? { page } : {}));
export const makeHandover = async (handle: string) =>
    madeLink(await send("POST", routes.teamHandover, { handle }));

export async function addTeamPage(body: {
    name: string;
    handle: string;
    from?: string;
}): Promise<NewPageResponse | { error: string }> {
    const res = await send("POST", routes.teamPages, body);
    return res?.ok ? ((await res.json()) as NewPageResponse) : { error: await problemIn(res) };
}

/** Null means the link has ended. */
export async function loadInvite(token: string): Promise<InviteResponse | null> {
    const res = await fetch(routes.invite(token));
    if (res.status === 410) return null;
    if (!res.ok) throw new Error(await problemIn(res));
    return (await res.json()) as InviteResponse;
}
