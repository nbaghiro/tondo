import type { TeamPerson, TeamResponse } from "@tondo/contract";
import { isReservedHandle, isValidHandle, normaliseHandle, PACK_PAGES, PRICES } from "@tondo/page";
import { createResource, createSignal, For, onMount, Show, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { appPath, onPage, pageUrl } from "../lib/account";
import type { Account } from "../lib/account";
import { checkAddress } from "../lib/api";
import { longDate } from "../lib/plan-copy";
import {
    addTeamPage,
    deleteTeam,
    endInvites,
    leaveTeam,
    loadTeam,
    makeHandover,
    makeInvite,
    makeTeam,
    removePerson,
    setMyTeamPage,
    setRole,
} from "../lib/team-api";
import { PageTile } from "./PageSwitcher";
import { Card, createToast, PageHeader, SettingsSection } from "./Parts";

const ROLE_NAMES = { owner: "Owner", editor: "Editor", member: "Member" } as const;
const INVALID = "Use 1 to 30 lowercase letters, numbers or hyphens.";

const suggestAddress = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30)
        .replace(/-+$/, "");

const peopleLine = (count: number) => `${String(count)} ${count === 1 ? "person" : "people"}`;

/** A name and an address, with the address suggested from the name until someone types their own. */
function NameAndAddress(props: {
    nameLabel: string;
    name: string;
    handle: string;
    note: string;
    onName: (value: string) => void;
    onHandle: (value: string) => void;
}) {
    return (
        <>
            <label class="f">
                {props.nameLabel}
                <input
                    name="name"
                    maxLength={80}
                    value={props.name}
                    onInput={(e) => {
                        props.onName(e.currentTarget.value);
                    }}
                />
            </label>
            <label class="f">
                Address
                <span class="pre">
                    tondo.page/
                    <input
                        name="handle"
                        autocomplete="off"
                        autocapitalize="off"
                        spellcheck={false}
                        value={props.handle}
                        onInput={(e) => {
                            props.onHandle(e.currentTarget.value);
                        }}
                    />
                </span>
                <Show when={props.note}>
                    <small class="bad-note" role="alert">
                        {props.note}
                    </small>
                </Show>
            </label>
        </>
    );
}

function createAddressFields(start = "") {
    const [name, setName] = createSignal(start);
    const [handle, setHandle] = createSignal(suggestAddress(start));
    const [typed, setTyped] = createSignal(false);
    const [note, setNote] = createSignal("");
    return {
        name,
        handle,
        note,
        setNote,
        onName: (value: string) => {
            setName(value);
            if (!typed()) setHandle(suggestAddress(value));
        },
        onHandle: (value: string) => {
            setTyped(true);
            setHandle(value);
            setNote("");
        },
        /** The address, or null with the reason shown. */
        checked: async () => {
            const value = normaliseHandle(handle());
            if (!isValidHandle(value)) {
                setNote(INVALID);
                return null;
            }
            if (isReservedHandle(value)) {
                setNote("That address is taken. Try another one.");
                return null;
            }
            const check = await checkAddress(value);
            if (check && !check.available) {
                setNote(check.message);
                return null;
            }
            return value;
        },
    };
}

function NoTeam(props: { account: Account; onMade: () => void }) {
    const fields = createAddressFields();
    const own = () => props.account.pages.filter((page) => page.side === "own");
    const [join, setJoin] = createSignal("");
    const [problem, setProblem] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const submit = async (e: Event) => {
        e.preventDefault();
        setProblem("");
        setBusy(true);
        const handle = await fields.checked();
        const failed = handle
            ? await makeTeam({
                  name: fields.name().trim(),
                  handle,
                  ...(join() ? { join: join() } : {}),
              })
            : "";
        setBusy(false);
        if (failed) setProblem(failed);
        else if (handle) props.onMade();
    };
    return (
        <>
            <PageHeader
                title="Team"
                lead="A team gives each person their own page, in one look that you choose. Making one adds a page for the team at this address."
            />
            <Card title="Make a team">
                <form
                    class="team-form"
                    data-make-team
                    onSubmit={(e) => {
                        submit(e).catch(() => {
                            setBusy(false);
                        });
                    }}
                >
                    <NameAndAddress
                        nameLabel="Team name"
                        name={fields.name()}
                        handle={fields.handle()}
                        note={fields.note()}
                        onName={fields.onName}
                        onHandle={fields.onHandle}
                    />
                    <label class="f">
                        Bring one of your pages
                        <select
                            name="join"
                            value={join()}
                            onChange={(e) => setJoin(e.currentTarget.value)}
                        >
                            <option value="">Not now</option>
                            <For each={own()}>
                                {(page) => (
                                    <option value={page.id}>
                                        {page.name || page.handle} (tondo.page/{page.handle})
                                    </option>
                                )}
                            </For>
                        </select>
                        <small>
                            A page you bring takes the team's look once the team's page is
                            published. Your other pages stay as they are.
                        </small>
                    </label>
                    <Show when={problem()}>
                        <p class="bad-note" role="alert">
                            {problem()}
                        </p>
                    </Show>
                    <button class="b p" type="submit" disabled={busy() || !fields.name().trim()}>
                        {busy() ? "Making your team" : "Make team"}
                    </button>
                </form>
            </Card>
        </>
    );
}

function Dialog(props: { label: string; children: JSX.Element; onClose: () => void }) {
    const [dialog, setDialog] = createSignal<HTMLDialogElement>();
    onMount(() => {
        dialog()?.showModal();
    });
    return (
        <dialog
            class="page-limit team-dialog"
            aria-label={props.label}
            ref={setDialog}
            onClose={() => {
                props.onClose();
            }}
        >
            {props.children}
        </dialog>
    );
}

function LinkBox(props: { url: string; line: string }) {
    const toast = createToast();
    return (
        <div data-invite-link>
            <label class="f">
                Link
                <input readOnly name="invite-link" value={props.url} />
            </label>
            <p class="note">{props.line}</p>
            <button
                class="b p"
                type="button"
                onClick={() => {
                    navigator.clipboard
                        .writeText(props.url)
                        .then(() => {
                            toast.say("Link copied");
                        })
                        .catch(() => {
                            toast.say("Select the link above to copy it");
                        });
                }}
            >
                Copy link
            </button>
        </div>
    );
}

function InviteDialog(props: { team: TeamResponse; page: string | null; onClose: () => void }) {
    const waiting = () => props.team.pages.filter((page) => page.id !== props.team.lookPageId);
    const [page, setPage] = createSignal(untrack(() => props.page ?? ""));
    const [made, setMade] = createSignal<{ url: string; until: string } | null>(null);
    const [problem, setProblem] = createSignal("");
    const make = async () => {
        setProblem("");
        const result = await makeInvite(page() || null);
        if ("error" in result) setProblem(result.error);
        else setMade(result);
    };
    const line = (until: string) =>
        page()
            ? `Whoever opens this link first can claim the page, until ${longDate(until)}. We can't list who has a link, so send it only to that person.`
            : `Anyone with this link can join ${props.team.name} until ${longDate(until)}, and choose which of their pages joins. We can't list who has a link, and End all links stops every one of them.`;
    return (
        <Dialog label="Invite someone" onClose={props.onClose}>
            <h2>Invite someone</h2>
            <Show
                when={made()}
                fallback={
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            make().catch(() => undefined);
                        }}
                    >
                        <p>
                            They'll sign in or make an account, then their page joins the team. The
                            team is using {props.team.held} of its {props.team.room} pages.
                        </p>
                        <Show when={waiting().length}>
                            <label class="f">
                                A page made for them
                                <select
                                    name="made-page"
                                    value={page()}
                                    onChange={(e) => setPage(e.currentTarget.value)}
                                >
                                    <option value="">None, they'll bring their own</option>
                                    <For each={waiting()}>
                                        {(own) => (
                                            <option value={own.id}>
                                                {own.name || own.handle} (tondo.page/{own.handle})
                                            </option>
                                        )}
                                    </For>
                                </select>
                            </label>
                        </Show>
                        <Show when={problem()}>
                            <p class="bad-note" role="alert">
                                {problem()}
                            </p>
                        </Show>
                        <div class="acts">
                            <button class="b p" type="submit" data-make-invite>
                                Make a link
                            </button>
                            <button
                                class="b"
                                type="button"
                                onClick={() => {
                                    props.onClose();
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                }
            >
                {(link) => <LinkBox url={link().url} line={line(link().until)} />}
            </Show>
        </Dialog>
    );
}

function NewTeamPageDialog(props: {
    team: TeamResponse;
    from: string | null;
    onClose: () => void;
    onAdded: () => void;
}) {
    const fields = createAddressFields();
    const [from, setFrom] = createSignal(untrack(() => props.from ?? ""));
    const [problem, setProblem] = createSignal("");
    const sources = () => [
        ...props.team.pages.map((page) => ({ id: page.id, label: page.name || page.handle })),
        ...props.team.people.flatMap((person) =>
            person.pageId && person.handle
                ? [{ id: person.pageId, label: person.name || person.handle }]
                : [],
        ),
    ];
    const submit = async (e: Event) => {
        e.preventDefault();
        setProblem("");
        const handle = await fields.checked();
        if (!handle) return;
        const result = await addTeamPage({
            name: fields.name().trim(),
            handle,
            ...(from() ? { from: from() } : {}),
        });
        if ("error" in result) setProblem(result.error);
        else props.onAdded();
    };
    return (
        <Dialog label="New team page" onClose={props.onClose}>
            <h2>{props.from ? "Duplicate a page" : "New team page"}</h2>
            <form
                data-team-page-form
                onSubmit={(e) => {
                    submit(e).catch(() => undefined);
                }}
            >
                <p>
                    Start the next person's page here and invite them to it, or keep it as a page
                    for the team. The team is using {props.team.held} of its {props.team.room}{" "}
                    pages.
                </p>
                <NameAndAddress
                    nameLabel="Name on the page"
                    name={fields.name()}
                    handle={fields.handle()}
                    note={fields.note()}
                    onName={fields.onName}
                    onHandle={fields.onHandle}
                />
                <label class="f">
                    Start from
                    <select
                        name="from"
                        value={from()}
                        onChange={(e) => setFrom(e.currentTarget.value)}
                    >
                        <option value="">A blank page</option>
                        <For each={sources()}>
                            {(source) => (
                                <option value={source.id}>A copy of {source.label}</option>
                            )}
                        </For>
                    </select>
                </label>
                <Show when={problem()}>
                    <p class="bad-note" role="alert">
                        {problem()}
                    </p>
                </Show>
                <div class="acts">
                    <button
                        class="b p"
                        type="submit"
                        data-add-team-page
                        disabled={!fields.name().trim()}
                    >
                        Add page
                    </button>
                    <button
                        class="b"
                        type="button"
                        onClick={() => {
                            props.onClose();
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Dialog>
    );
}

function PersonRow(props: {
    person: TeamPerson;
    team: TeamResponse;
    you: string;
    onChanged: () => void;
    onHandover: (handle: string) => void;
    say: (text: string) => void;
}) {
    const [confirm, setConfirm] = createSignal(false);
    const isOwner = () => props.team.role === "owner";
    const canManage = () =>
        isOwner() && props.person.role !== "owner" ? props.person.handle : null;
    const name = () =>
        (props.person.name || (props.person.you ? props.you : props.person.handle)) ??
        "The team's owner";
    const act = async (work: Promise<string | null>) => {
        const problem = await work;
        if (problem) props.say(problem);
        else props.onChanged();
    };
    return (
        <li class="team-row" data-person={props.person.handle ?? "owner"}>
            <Show
                when={props.person.photo}
                fallback={<span class="team-face">{name().slice(0, 1).toUpperCase()}</span>}
            >
                {(photo) => <img class="team-face" src={`/photos/${photo()}`} alt="" />}
            </Show>
            <span class="team-who">
                <b>
                    {name()}
                    <Show when={props.person.you}>
                        <em> (you)</em>
                    </Show>
                </b>
                <small>
                    {props.person.handle
                        ? `tondo.page/${props.person.handle}`
                        : "No page on the team"}
                </small>
            </span>
            <span class="team-acts">
                <Show when={props.team.role !== "member" && props.person.pageId}>
                    {(id) => (
                        <a class="lnk" href={appPath(onPage("/edit", id()))}>
                            Edit
                        </a>
                    )}
                </Show>
                <Show
                    when={canManage()}
                    fallback={<span class="team-role">{ROLE_NAMES[props.person.role]}</span>}
                >
                    {(handle) => (
                        <>
                            <select
                                class="team-select"
                                aria-label={`Role for ${name()}`}
                                value={props.person.role}
                                onChange={(e) => {
                                    const role =
                                        e.currentTarget.value === "editor" ? "editor" : "member";
                                    act(setRole(handle(), role)).catch(() => undefined);
                                }}
                            >
                                <option value="editor">Editor</option>
                                <option value="member">Member</option>
                            </select>
                            <button
                                type="button"
                                class="lnk"
                                onClick={() => {
                                    props.onHandover(handle());
                                }}
                            >
                                Hand over
                            </button>
                            <Show
                                when={confirm()}
                                fallback={
                                    <button
                                        type="button"
                                        class="lnk bad-lnk"
                                        data-remove-person
                                        onClick={() => setConfirm(true)}
                                    >
                                        Remove
                                    </button>
                                }
                            >
                                <button
                                    type="button"
                                    class="b sm bad"
                                    data-remove-yes
                                    onClick={() => {
                                        act(removePerson(handle())).catch(() => undefined);
                                    }}
                                >
                                    Yes, remove
                                </button>
                            </Show>
                        </>
                    )}
                </Show>
            </span>
            <Show when={confirm()}>
                <p class="note team-confirm">
                    {name()} keeps their page and address, and the page goes back to its own look.
                    Any invitation links stop working.
                </p>
            </Show>
        </li>
    );
}

function HandoverDialog(props: { team: TeamResponse; handle: string; onClose: () => void }) {
    const [link, setLink] = createSignal<{ url: string; until: string } | null>(null);
    const [problem, setProblem] = createSignal("");
    onMount(() => {
        makeHandover(props.handle)
            .then((result) => {
                if ("error" in result) setProblem(result.error);
                else setLink(result);
            })
            .catch(() => undefined);
    });
    return (
        <Dialog label="Hand over the team" onClose={props.onClose}>
            <h2>Hand over {props.team.name}</h2>
            <p>
                Send this link to tondo.page/{props.handle}. Nothing changes until they accept, and
                then they own the team and its plan decides which pages stay online. You stay on the
                team as a member if you have a page on it.
            </p>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <Show when={link()}>
                {(made) => (
                    <LinkBox
                        url={made().url}
                        line={`This link works until ${longDate(made().until)}.`}
                    />
                )}
            </Show>
            <div class="acts">
                <button
                    class="b"
                    type="button"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Close
                </button>
            </div>
        </Dialog>
    );
}

function OnTeam(props: {
    team: TeamResponse;
    account: Account;
    onChanged: () => void;
    onGone: () => void;
}) {
    const toast = createToast();
    const [inviting, setInviting] = createSignal<{ page: string | null } | null>(null);
    const [adding, setAdding] = createSignal<{ from: string | null } | null>(null);
    const [handingOver, setHandingOver] = createSignal<string | null>(null);
    const [confirmLeave, setConfirmLeave] = createSignal(false);
    const [typed, setTyped] = createSignal("");
    const team = () => props.team;
    const isOwner = () => team().role === "owner";
    const canEdit = () => team().role !== "member";
    const own = () => props.account.pages.filter((page) => page.side === "own");
    const canInvite = () => isOwner() && team().covered && !team().ownerSuspended;
    const pageStatus = (page: TeamResponse["pages"][number]) =>
        !page.live ? "Not live yet" : page.offline ? "Offline" : "Live";
    const act = async (work: Promise<string | null>, done: string) => {
        const problem = await work;
        toast.say(problem ?? done);
        if (!problem) props.onChanged();
    };
    return (
        <>
            <PageHeader title="Team" lead={`${team().name}, ${peopleLine(team().people.length)}`}>
                <Show when={isOwner()}>
                    <button
                        class="b p"
                        data-invite
                        disabled={!canInvite()}
                        onClick={() => setInviting({ page: null })}
                    >
                        Invite someone
                    </button>
                </Show>
            </PageHeader>
            <div class="stack">
                <Show when={team().ownerSuspended}>
                    <p class="notice bad" role="alert">
                        The team's pages were taken down, so its look isn't showing and nobody can
                        be invited. Contact support if you think that's a mistake.
                    </p>
                </Show>
                <Show when={!team().covered}>
                    <p class="notice" role="status" data-team-plan>
                        {isOwner()
                            ? "Your plan doesn't cover a team, so the team's own pages are offline and the team's look isn't showing. Each person's page follows their own plan. Move to Pro in Account to put them online and invite people."
                            : "The owner's plan doesn't cover the team now, so the team's look isn't showing. Your page follows your own plan until they choose Pro."}
                    </p>
                </Show>
                <Show when={isOwner() && team().covered && team().held >= team().room}>
                    <p class="notice" role="status" data-team-full>
                        The team is using all {team().room} of its pages, so nobody else can join
                        until there's room. You can add {PACK_PAGES} more for ${PRICES.pro.month} a
                        month in Account.
                    </p>
                </Show>
                <Show when={team().covered && !team().lookLive}>
                    <p class="notice" role="status" data-team-unpublished>
                        {canEdit()
                            ? `Publish ${team().name}'s page to share its look with everyone.`
                            : "The team hasn't published its look yet, so your page shows its own for now."}
                    </p>
                </Show>
                <Card title="People" note={peopleLine(team().people.length)}>
                    <ul class="team-list">
                        <For each={team().people}>
                            {(person) => (
                                <PersonRow
                                    person={person}
                                    team={team()}
                                    you={props.account.name}
                                    onChanged={props.onChanged}
                                    onHandover={setHandingOver}
                                    say={(text) => {
                                        toast.say(text);
                                    }}
                                />
                            )}
                        </For>
                    </ul>
                </Card>
                <Show when={canEdit()}>
                    <Card
                        title="The team's pages"
                        note={`${String(team().held)} of ${String(team().room)} pages used`}
                        extra={
                            <button
                                class="b sm"
                                data-new-team-page
                                onClick={() => setAdding({ from: null })}
                            >
                                New team page
                            </button>
                        }
                    >
                        <ul class="team-list">
                            <For each={team().pages}>
                                {(page) => (
                                    <li class="team-row" data-team-page={page.handle}>
                                        <PageTile page={page} />
                                        <span class="team-who">
                                            <b>{page.name || page.handle}</b>
                                            <small>tondo.page/{page.handle}</small>
                                            <small>
                                                {pageStatus(page)}
                                                <Show when={page.id === team().lookPageId}>
                                                    , holds the team's look
                                                </Show>
                                            </small>
                                        </span>
                                        <span class="team-acts">
                                            <Show when={page.live && !page.offline}>
                                                <a
                                                    class="lnk"
                                                    href={pageUrl(page.handle)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open
                                                </a>
                                            </Show>
                                            <a class="lnk" href={appPath(onPage("/edit", page.id))}>
                                                Edit
                                            </a>
                                            <button
                                                type="button"
                                                class="lnk"
                                                data-duplicate={page.handle}
                                                onClick={() => setAdding({ from: page.id })}
                                            >
                                                Duplicate
                                            </button>
                                            <Show
                                                when={canInvite() && page.id !== team().lookPageId}
                                            >
                                                <button
                                                    type="button"
                                                    class="lnk"
                                                    data-invite-to={page.handle}
                                                    onClick={() => setInviting({ page: page.id })}
                                                >
                                                    Invite to this page
                                                </button>
                                            </Show>
                                        </span>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Card>
                </Show>
                <Card title="Who can change what">
                    <dl class="team-roles">
                        <dt>Owner</dt>
                        <dd>Manages the people on the team, the team's look and the plan.</dd>
                        <dt>Editor</dt>
                        <dd>
                            Can edit any page on the team, but can't change the plan or the look.
                        </dd>
                        <dt>Member</dt>
                        <dd>Edits their own page. The team's look stays as it is.</dd>
                    </dl>
                </Card>
            </div>
            <div class="team-settings">
                <Show when={isOwner() || own().length}>
                    <SettingsSection
                        title="Your page on the team"
                        lead="The one page of yours that takes the team's look. Your other pages stay separate."
                    >
                        <label class="f">
                            Page
                            <select
                                name="my-page"
                                value={team().myPageId ?? ""}
                                onChange={(e) => {
                                    act(
                                        setMyTeamPage(e.currentTarget.value || null),
                                        "Your page on the team has changed",
                                    ).catch(() => undefined);
                                }}
                            >
                                <Show
                                    when={isOwner()}
                                    fallback={
                                        <For
                                            each={props.account.pages.filter(
                                                (page) => page.side === "joined",
                                            )}
                                        >
                                            {(page) => (
                                                <option value={page.id}>
                                                    {page.name || page.handle}
                                                </option>
                                            )}
                                        </For>
                                    }
                                >
                                    <option value="">None</option>
                                    <For
                                        each={props.account.pages.filter(
                                            (page) => page.side === "joined",
                                        )}
                                    >
                                        {(page) => (
                                            <option value={page.id}>
                                                {page.name || page.handle}
                                            </option>
                                        )}
                                    </For>
                                </Show>
                                <For each={own()}>
                                    {(page) => (
                                        <option value={page.id}>{page.name || page.handle}</option>
                                    )}
                                </For>
                            </select>
                        </label>
                    </SettingsSection>
                </Show>
                <Show when={isOwner()}>
                    <SettingsSection
                        title="Invitation links"
                        lead="Links work for 7 days. We don't keep a list of them, so this ends all of them at once."
                    >
                        <button
                            class="b"
                            data-end-links
                            onClick={() => {
                                act(endInvites(), "Every link has stopped working").catch(
                                    () => undefined,
                                );
                            }}
                        >
                            End all links
                        </button>
                    </SettingsSection>
                    <SettingsSection
                        title="Delete team"
                        lead={`This removes ${team().name}'s own pages and addresses, and can't be undone. Everyone keeps their own page and address, and their own look comes back.`}
                    >
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                deleteTeam(typed())
                                    .then((problem) => {
                                        if (problem) toast.say(problem);
                                        else props.onGone();
                                    })
                                    .catch(() => undefined);
                            }}
                        >
                            <label class="f">
                                Type the team's address to confirm
                                <input
                                    name="confirm-team"
                                    autocomplete="off"
                                    autocapitalize="off"
                                    placeholder={team().handle}
                                    value={typed()}
                                    onInput={(e) => setTyped(e.currentTarget.value)}
                                />
                            </label>
                            <button
                                class="b bad"
                                type="submit"
                                data-delete-team
                                disabled={typed().trim() !== team().handle}
                            >
                                Delete team
                            </button>
                        </form>
                    </SettingsSection>
                </Show>
                <Show when={!isOwner()}>
                    <SettingsSection
                        title="Leave team"
                        lead="You keep your address and page, and your page goes back to its own look."
                    >
                        <Show
                            when={confirmLeave()}
                            fallback={
                                <button class="b" data-leave onClick={() => setConfirmLeave(true)}>
                                    Leave team
                                </button>
                            }
                        >
                            <button
                                class="b bad"
                                data-leave-yes
                                onClick={() => {
                                    leaveTeam()
                                        .then((problem) => {
                                            if (problem) toast.say(problem);
                                            else props.onGone();
                                        })
                                        .catch(() => undefined);
                                }}
                            >
                                Yes, leave {team().name}
                            </button>
                        </Show>
                    </SettingsSection>
                </Show>
            </div>
            <Show when={inviting()}>
                {(open) => (
                    <InviteDialog
                        team={team()}
                        page={open().page}
                        onClose={() => setInviting(null)}
                    />
                )}
            </Show>
            <Show when={adding()}>
                {(open) => (
                    <NewTeamPageDialog
                        team={team()}
                        from={open().from}
                        onClose={() => setAdding(null)}
                        onAdded={() => {
                            setAdding(null);
                            props.onChanged();
                        }}
                    />
                )}
            </Show>
            <Show when={handingOver()}>
                {(handle) => (
                    <HandoverDialog
                        team={team()}
                        handle={handle()}
                        onClose={() => setHandingOver(null)}
                    />
                )}
            </Show>
        </>
    );
}

export function TeamPage(props: { account: Account; onChanged: () => void }) {
    const [team, { refetch }] = createResource(loadTeam);
    const changed = () => {
        props.onChanged();
        Promise.resolve(refetch()).catch(() => undefined);
    };
    return (
        <Show
            when={!team.loading || team.latest !== undefined}
            fallback={<p class="emptyline">Loading your team</p>}
        >
            <Show
                when={!team.error}
                fallback={<p class="emptyline">{(team.error as Error).message}</p>}
            >
                <Show
                    when={team.latest}
                    fallback={<NoTeam account={props.account} onMade={changed} />}
                >
                    {(loaded) => (
                        <OnTeam
                            team={loaded()}
                            account={props.account}
                            onChanged={changed}
                            onGone={changed}
                        />
                    )}
                </Show>
            </Show>
        </Show>
    );
}
