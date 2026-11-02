import type { PageSummary } from "@tondo/contract";
import { isReservedHandle, isValidHandle, normaliseHandle } from "@tondo/page";
import { createSignal, onCleanup, Show, untrack } from "solid-js";
import { appPath, onPage } from "../lib/account";
import { checkAddress, createPage } from "../lib/api";

const CHECK_MS = 300;

/** Names a copy of this page and gives it its own address. */
export function CopyPageForm(props: { page: PageSummary; onClose: () => void }) {
    const [name, setName] = createSignal(untrack(() => props.page.name));
    const [handle, setHandle] = createSignal("");
    const [note, setNote] = createSignal<{ ok: boolean; text: string } | null>(null);
    const [problem, setProblem] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    onCleanup(() => {
        clearTimeout(timer);
    });
    const check = (raw: string) => {
        clearTimeout(timer);
        setNote(null);
        const value = normaliseHandle(raw);
        if (!value) return;
        if (!isValidHandle(value)) {
            setNote({ ok: false, text: "Use 1 to 30 lowercase letters, numbers or hyphens." });
            return;
        }
        if (isReservedHandle(value)) {
            setNote({ ok: false, text: "That address is taken. Try another one." });
            return;
        }
        timer = setTimeout(() => {
            checkAddress(value)
                .then((answer) => {
                    if (answer && normaliseHandle(handle()) === value) {
                        setNote({ ok: answer.available, text: answer.message });
                    }
                })
                .catch(() => undefined);
        }, CHECK_MS);
    };
    const submit = async (e: Event) => {
        e.preventDefault();
        setBusy(true);
        setProblem("");
        const made = await createPage({
            name: name().trim(),
            handle: normaliseHandle(handle()),
            from: props.page.id,
        });
        if ("error" in made) {
            setBusy(false);
            setProblem(made.error);
            return;
        }
        location.assign(appPath(onPage("/edit", made.id)));
    };
    return (
        <form
            onSubmit={(e) => {
                submit(e).catch(() => {
                    setBusy(false);
                });
            }}
        >
            <label class="f">
                Name
                <input
                    name="page-name"
                    maxLength={80}
                    required
                    autocomplete="off"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                />
            </label>
            <label class="f">
                Address
                <span class="pre">
                    tondo.page/
                    <input
                        name="page-address"
                        required
                        autocomplete="off"
                        autocapitalize="off"
                        spellcheck={false}
                        value={handle()}
                        onInput={(e) => {
                            setHandle(e.currentTarget.value);
                            check(e.currentTarget.value);
                        }}
                    />
                </span>
            </label>
            <Show when={note()}>
                {(shown) => (
                    <p
                        class={shown().ok ? "note" : "bad-note"}
                        data-address-note
                        role={shown().ok ? "status" : "alert"}
                    >
                        {shown().text}
                    </p>
                )}
            </Show>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <div class="acts">
                <button
                    class="b p"
                    type="submit"
                    data-create-page
                    disabled={busy() || !name().trim() || note()?.ok === false}
                >
                    {busy() ? "Copying" : "Make a copy"}
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
    );
}
