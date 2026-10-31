import { blockDefinitions } from "@tondo/page";
import type { Field } from "@tondo/page";
import { createSignal, For, Show } from "solid-js";
import { getField, HEADER } from "../state/document";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";

const HEADER_FIELDS: readonly Field[] = [
    { kind: "text", key: "name", label: "Name" },
    { kind: "text", key: "tagline", label: "Short line" },
    { kind: "longText", key: "bio", label: "About" },
];

function FieldInput(props: { editor: EditorState; target: string; field: Field }) {
    const [error, setError] = createSignal("");
    const value = () => {
        const current = getField(props.editor.page(), props.target, props.field.key);
        return typeof current === "string" ? current : "";
    };
    const onInput = (next: string) => {
        const accepted = props.editor.setField(props.target, props.field.key, next);
        setError(
            accepted
                ? ""
                : props.field.kind === "link"
                  ? "Use a link starting with https://, http:// or mailto:."
                  : "That's too long for this block.",
        );
    };

    return (
        <Show when={props.field.kind !== "photo" && props.field.kind !== "choice"}>
            <label class="field">
                <span>{props.field.label}</span>
                <Show
                    when={props.field.kind === "longText"}
                    fallback={
                        <input
                            type={props.field.kind === "link" ? "url" : "text"}
                            placeholder={props.field.kind === "link" ? "https://" : undefined}
                            value={value()}
                            aria-invalid={error() !== ""}
                            onInput={(e) => {
                                onInput(e.currentTarget.value);
                            }}
                        />
                    }
                >
                    <textarea
                        rows="3"
                        value={value()}
                        onInput={(e) => {
                            onInput(e.currentTarget.value);
                        }}
                    />
                </Show>
                <Show when={error()}>
                    <small role="alert">{error()}</small>
                </Show>
            </label>
        </Show>
    );
}

export function Inspector(props: { editor: EditorState; onClose: () => void }) {
    const block = () => props.editor.page().blocks.find((b) => b.id === props.editor.selected());
    const definition = () => {
        const current = block();
        return current ? blockDefinitions[current.type] : null;
    };
    const isHeader = () => props.editor.selected() === HEADER;
    const fields = () => (isHeader() ? HEADER_FIELDS : (definition()?.fields ?? []));

    return (
        <>
            <div class="crumb">
                <button
                    class="round"
                    aria-label="Back to looks"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    <Icon name="back" />
                </button>
                <h2>{isHeader() ? "Your details" : definition()?.name}</h2>
            </div>
            <Show when={Object.entries(definition()?.variantLabels ?? {}).length > 1}>
                <div class="seg" role="group" aria-label="Layout">
                    <For each={Object.entries(definition()?.variantLabels ?? {})}>
                        {([variant, label]) => (
                            <button
                                aria-pressed={block()?.variant === variant}
                                onClick={() => {
                                    const id = props.editor.selected();
                                    if (id) props.editor.setField(id, "variant", variant);
                                }}
                            >
                                {label}
                            </button>
                        )}
                    </For>
                </div>
            </Show>
            <For each={fields()}>
                {(field) => (
                    <FieldInput
                        editor={props.editor}
                        target={props.editor.selected() ?? ""}
                        field={field}
                    />
                )}
            </For>
        </>
    );
}
