import type { PageSummary } from "@tondo/contract";
import { isReservedHandle, isValidHandle, normaliseHandle } from "@tondo/page";
import { createEffect, createResource, createSignal, Show, untrack } from "solid-js";
import { appPath, onPage } from "../lib/account";
import { changeAddress, checkAddress, loadDraft, saveDraft, unpublish } from "../lib/api";
import { createToast, PageHeader, SettingsSection } from "./Parts";

export function SettingsPage(props: { page: PageSummary; onAddress: (handle: string) => void }) {
    const [draft, { refetch }] = createResource(() => props.page.id, loadDraft);
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [timeZone, setTimeZone] = createSignal("");
    const [handle, setHandle] = createSignal(untrack(() => props.page.handle));
    const [current, setCurrent] = createSignal(untrack(() => props.page.handle));
    const [addressNote, setAddressNote] = createSignal("");
    const [confirmDown, setConfirmDown] = createSignal(false);
    // A conflict brings in the latest page, and what someone typed has to stay in the boxes.
    let keepTyped = false;
    const toast = createToast();
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone;

    createEffect(() => {
        const loaded = draft();
        if (!loaded || keepTyped) {
            keepTyped = false;
            return;
        }
        setTitle(loaded.page.title ?? "");
        setDescription(loaded.page.description ?? "");
        setTimeZone(loaded.page.timeZone ?? "");
    });

    const saveDetails = async (e: Event) => {
        e.preventDefault();
        const loaded = draft();
        if (!loaded) return;
        const { title: _title, description: _description, ...rest } = loaded.page;
        const page = {
            ...rest,
            ...(title().trim() ? { title: title().trim() } : {}),
            ...(description().trim() ? { description: description().trim() } : {}),
            ...(timeZone() ? { timeZone: timeZone() } : {}),
        };
        const result = await saveDraft(props.page.id, page, loaded.updatedAt, null);
        if (result.state === "saved") {
            toast.say("Saved");
            await refetch();
        } else if (result.state === "conflict") {
            keepTyped = true;
            await refetch();
            toast.say(
                "Your page changed somewhere else. We kept what you typed, so press Save again.",
            );
        } else {
            toast.say(result.message ?? "That didn't save. Check your connection and try again.");
        }
    };

    const saveAddress = async (e: Event) => {
        e.preventDefault();
        const next = normaliseHandle(handle());
        if (next === current()) return;
        if (!isValidHandle(next)) {
            setAddressNote("Use 1 to 30 lowercase letters, numbers or hyphens.");
            return;
        }
        if (isReservedHandle(next)) {
            setAddressNote("That address is taken. Try another one.");
            return;
        }
        const check = await checkAddress(next);
        if (check && !check.available) {
            setAddressNote(check.message);
            return;
        }
        const problem = await changeAddress(props.page.id, next);
        if (problem) {
            setAddressNote(problem);
            return;
        }
        setCurrent(next);
        props.onAddress(next);
        setAddressNote("");
        toast.say(`Your address is now tondo.page/${next}`);
    };

    const takeDown = async () => {
        const problem = await unpublish(props.page.id);
        toast.say(problem ?? "Your page isn't live any more");
        await refetch();
    };

    return (
        <>
            <PageHeader
                title="Page settings"
                lead="Your address, and how your page appears elsewhere."
            />
            <Show when={draft()} fallback={<p class="emptyline">Loading your settings</p>}>
                {(loaded) => (
                    <div>
                        <SettingsSection
                            title="Address"
                            lead="The link you share, and the one people visit."
                        >
                            <form
                                onSubmit={(e) => {
                                    saveAddress(e).catch(() => undefined);
                                }}
                            >
                                <label class="f">
                                    Your address
                                    <span class="pre">
                                        tondo.page/
                                        <input
                                            name="address"
                                            value={handle()}
                                            autocomplete="off"
                                            autocapitalize="off"
                                            spellcheck={false}
                                            onInput={(e) => {
                                                setHandle(e.currentTarget.value);
                                                setAddressNote("");
                                            }}
                                        />
                                    </span>
                                </label>
                                <p class="note">
                                    Changing this breaks any links you've already shared, and
                                    someone else could claim your old address.
                                </p>
                                <Show when={addressNote()}>
                                    <p class="bad-note" role="alert">
                                        {addressNote()}
                                    </p>
                                </Show>
                                <button
                                    class="b"
                                    type="submit"
                                    disabled={normaliseHandle(handle()) === current()}
                                >
                                    Change address
                                </button>
                            </form>
                        </SettingsSection>
                        <SettingsSection
                            title="Sharing and search"
                            lead="What shows in browser tabs, and when your link is shared in a chat."
                        >
                            <form
                                onSubmit={(e) => {
                                    saveDetails(e).catch(() => undefined);
                                }}
                            >
                                <label class="f">
                                    Page title
                                    <input
                                        name="title"
                                        maxLength={70}
                                        placeholder={loaded().page.header.name}
                                        value={title()}
                                        onInput={(e) => setTitle(e.currentTarget.value)}
                                    />
                                </label>
                                <label class="f">
                                    Description
                                    <textarea
                                        name="description"
                                        maxLength={160}
                                        rows={3}
                                        value={description()}
                                        onInput={(e) => setDescription(e.currentTarget.value)}
                                    />
                                    <small>These go live the next time you publish.</small>
                                </label>
                                <label class="f">
                                    Time zone
                                    <input readOnly value={timeZone() || "Not set"} />
                                    <small>Countdowns and events use this clock.</small>
                                </label>
                                <Show when={timeZone() !== here}>
                                    <p>
                                        <button
                                            type="button"
                                            class="lnk"
                                            onClick={() => setTimeZone(here)}
                                        >
                                            Use this device's time zone ({here})
                                        </button>
                                    </p>
                                </Show>
                                <button class="b save-details" type="submit">
                                    Save
                                </button>
                            </form>
                        </SettingsSection>
                        <SettingsSection
                            title="Publishing"
                            lead={
                                loaded().suspended
                                    ? "This page was taken down for breaking our rules, so visitors can't see it. Contact support if you think that's a mistake."
                                    : loaded().offline
                                      ? "Your page is published and offline, because your plan doesn't cover it now. Visitors see a short note that there's no page here. You can take it down, and it keeps its content."
                                      : loaded().published
                                        ? "Your page is live. You can take it down and publish it again later."
                                        : "Your page isn't live. Publish it from the page editor. Until then, visitors to your address see a short note that there's no page here."
                            }
                        >
                            <Show when={!loaded().suspended}>
                                <Show
                                    when={loaded().published}
                                    fallback={
                                        <a
                                            class="b"
                                            href={appPath(
                                                onPage("/edit?panel=publish", props.page.id),
                                            )}
                                        >
                                            Go to publish
                                        </a>
                                    }
                                >
                                    <Show
                                        when={confirmDown()}
                                        fallback={
                                            <button
                                                class="b bad unpublish"
                                                onClick={() => setConfirmDown(true)}
                                            >
                                                Take my page down
                                            </button>
                                        }
                                    >
                                        <p class="note">
                                            Visitors will stop seeing your page straight away. You
                                            can publish it again whenever you like.
                                        </p>
                                        <div class="acts">
                                            <button
                                                class="b bad unpublish-yes"
                                                onClick={() => {
                                                    setConfirmDown(false);
                                                    takeDown().catch(() => undefined);
                                                }}
                                            >
                                                Yes, take it down
                                            </button>
                                            <button class="b" onClick={() => setConfirmDown(false)}>
                                                Keep it live
                                            </button>
                                        </div>
                                    </Show>
                                </Show>
                            </Show>
                        </SettingsSection>
                    </div>
                )}
            </Show>
            <toast.View />
        </>
    );
}
