import type { DomainRecord, DomainResponse } from "@tondo/contract";
import { createResource, createSignal, For, Show } from "solid-js";
import { appPath } from "../lib/account";
import { checkDomain, connectDomain, loadDomain, removeDomain } from "../lib/api";
import { SettingsSection } from "./Parts";

const LEAD = "Show this page at an address you own, such as yourname.com.";

function Record(props: { record: DomainRecord; onCopy: (text: string) => void }) {
    return (
        <tr>
            <td>{props.record.type}</td>
            <td>{props.record.name}</td>
            <td>
                <button
                    type="button"
                    class="lnk dns-value"
                    title="Copy"
                    onClick={() => {
                        props.onCopy(props.record.value);
                    }}
                >
                    {props.record.value}
                </button>
            </td>
        </tr>
    );
}

export function DomainSection(props: { pageId: string; handle: string; published: boolean }) {
    // Null when custom domains are off here, and then nothing is shown.
    const [state, { mutate }] = createResource(
        () => props.pageId,
        async (pageId) => {
            const loaded = await loadDomain(pageId);
            if (loaded?.domain?.status !== "waiting") return loaded;
            const checked = await checkDomain(pageId);
            return "problem" in checked ? loaded : checked;
        },
    );
    const [typed, setTyped] = createSignal("");
    const [problem, setProblem] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    const [copied, setCopied] = createSignal("");

    const run = async (work: () => Promise<DomainResponse | { problem: string }>) => {
        setBusy(true);
        setProblem("");
        const result = await work();
        setBusy(false);
        if ("problem" in result) setProblem(result.problem);
        else mutate(result);
    };
    const copy = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                setCopied(`Copied ${text}`);
            })
            .catch(() => undefined);
    };
    const remove = async () => {
        const failed = await removeDomain(props.pageId);
        setConfirming(false);
        if (failed) {
            setProblem(failed);
            return;
        }
        setTyped("");
        const fresh = await loadDomain(props.pageId);
        mutate(fresh);
    };

    const Problem = () => (
        <Show when={problem()}>
            <p class="bad-note" role="alert">
                {problem()}
            </p>
        </Show>
    );
    const RemoveButton = () => (
        <Show
            when={confirming()}
            fallback={
                <button
                    class="b"
                    type="button"
                    data-domain-remove
                    onClick={() => setConfirming(true)}
                >
                    Remove domain
                </button>
            }
        >
            <p class="dns-confirm">
                Visitors to this domain will stop seeing your page. tondo.page/{props.handle} keeps
                working.
            </p>
            <div class="acts">
                <button
                    class="b bad"
                    type="button"
                    data-domain-remove-yes
                    onClick={() => {
                        remove().catch(() => undefined);
                    }}
                >
                    Yes, remove it
                </button>
                <button class="b" type="button" onClick={() => setConfirming(false)}>
                    Keep it
                </button>
            </div>
        </Show>
    );

    return (
        <Show when={state()}>
            {(loaded) => (
                <Show
                    when={loaded().domain}
                    fallback={
                        <SettingsSection title="Your own domain" lead={LEAD}>
                            <Show
                                when={loaded().allowed}
                                fallback={
                                    <>
                                        <p class="dns-confirm" data-domain-pro>
                                            Your own domain comes with Pro.
                                        </p>
                                        <a class="b" href={appPath("/account")}>
                                            See Pro
                                        </a>
                                    </>
                                }
                            >
                                <Show
                                    when={loaded().canChange}
                                    fallback={
                                        <p class="dns-confirm">
                                            Only the person whose page this is, or the team's owner,
                                            can connect a domain.
                                        </p>
                                    }
                                >
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            run(() => connectDomain(props.pageId, typed())).catch(
                                                () => undefined,
                                            );
                                        }}
                                    >
                                        <label class="f">
                                            Your domain
                                            <input
                                                name="domain"
                                                placeholder="yourname.com"
                                                autocomplete="off"
                                                autocapitalize="off"
                                                spellcheck={false}
                                                value={typed()}
                                                onInput={(e) => setTyped(e.currentTarget.value)}
                                            />
                                            <small>
                                                If you don't have one yet, buy it from a domain
                                                company first, then come back.
                                            </small>
                                        </label>
                                        <Problem />
                                        <button
                                            class="b"
                                            type="submit"
                                            disabled={busy() || !typed().trim()}
                                        >
                                            Connect domain
                                        </button>
                                    </form>
                                </Show>
                            </Show>
                        </SettingsSection>
                    }
                >
                    {(domain) => (
                        <SettingsSection title="Your own domain" lead={LEAD}>
                            <Show when={domain().status === "live"}>
                                <p class="dns-state" data-domain-live>
                                    <span class="tag ok">
                                        <i />
                                        Connected
                                    </span>
                                    <span>
                                        {props.published
                                            ? "Your page shows at "
                                            : "Your page will show once you publish it, at "}
                                        <a
                                            class="lnk"
                                            href={`https://${domain().host}`}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            {domain().host}
                                        </a>
                                    </span>
                                </p>
                            </Show>
                            <Show when={domain().status === "paused"}>
                                <p class="note" data-domain-paused>
                                    Your plan doesn't include a domain now, so visitors see a short
                                    note there. It comes back when you're on Pro.
                                </p>
                                <p>
                                    <a class="b" href={appPath("/account")}>
                                        See Pro
                                    </a>
                                </p>
                            </Show>
                            <Show when={domain().status === "waiting"}>
                                <ol class="dns-steps" data-domain-waiting>
                                    <li>
                                        Log in to the company you bought {domain().host} from, and
                                        open its DNS settings. They're sometimes called Manage DNS.
                                    </li>
                                    <li>
                                        Add these records. If it already has records with the same
                                        name, replace them.
                                        <table class="dns">
                                            <thead>
                                                <tr>
                                                    <th>Type</th>
                                                    <th>Name</th>
                                                    <th>Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <For each={domain().records}>
                                                    {(record) => (
                                                        <Record record={record} onCopy={copy} />
                                                    )}
                                                </For>
                                            </tbody>
                                        </table>
                                        <small aria-live="polite">
                                            {copied() || "Press a value to copy it."}
                                        </small>
                                    </li>
                                    <li>
                                        Come back here and check. It can take a few minutes, and
                                        sometimes up to a day.
                                    </li>
                                </ol>
                                <Show when={domain().missing}>
                                    <p class="note" data-domain-missing>
                                        {domain().missing === "code"
                                            ? "We can't see the TXT record yet. Check it matches, or give it a little longer."
                                            : "We can see the TXT record. We're still waiting for the others to reach us."}
                                    </p>
                                </Show>
                                <div class="acts dns-acts">
                                    <button
                                        class="b p"
                                        type="button"
                                        data-domain-check
                                        disabled={busy()}
                                        onClick={() => {
                                            run(() => checkDomain(props.pageId)).catch(
                                                () => undefined,
                                            );
                                        }}
                                    >
                                        Check now
                                    </button>
                                </div>
                            </Show>
                            <Problem />
                            <Show when={loaded().canChange}>
                                <RemoveButton />
                            </Show>
                        </SettingsSection>
                    )}
                </Show>
            )}
        </Show>
    );
}
