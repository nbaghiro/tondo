// What the editor's inspector draws for a block. This is data, so the page package stays free of UI.
export type BlockValues = Readonly<Record<string, unknown>>;

interface Common {
    key: string;
    label: string;
    hint?: string;
    /** Behind "More options". */
    more?: boolean;
    /** Leave this out to always show the field. */
    when?: (values: BlockValues) => boolean;
}

export interface TextField extends Common {
    kind: "text" | "longText";
    max: number;
    placeholder?: string;
    /** Edited in place on the canvas as well as in the panel. */
    inline?: boolean;
}
export interface LinkField extends Common {
    kind: "link";
    /** A text field this fills in, when a link's service is recognised and the text is empty. */
    fills?: string;
}
export interface PhotoField extends Common {
    kind: "photo";
}
export interface PhotoListField extends Common {
    kind: "photoList";
    max: number;
}
export interface ToggleField extends Common {
    kind: "toggle";
}
export interface ChoiceField extends Common {
    kind: "choice";
    options: readonly (readonly [value: string, label: string])[];
}
export interface DateTimeField extends Common {
    kind: "dateTime";
}
export interface ListField extends Common {
    kind: "list";
    /** The item field shown as each row's title. */
    title: string;
    add: string;
    max: number;
    fields: readonly Field[];
    make: () => Record<string, unknown>;
}
export interface SourceOption {
    value: string;
    label: string;
    /** Sources that aren't built yet stay out of the panel, though saved pages may use them. */
    held?: boolean;
}
export interface SourceField extends Common {
    kind: "source";
    options: readonly SourceOption[];
}
export interface FileField extends Common {
    kind: "file";
}

export type Field =
    | TextField
    | LinkField
    | PhotoField
    | PhotoListField
    | ToggleField
    | ChoiceField
    | DateTimeField
    | ListField
    | SourceField
    | FileField;

type Extras<F extends Field> = Omit<F, "kind" | "key" | "label">;

export const text = (key: string, label: string, extras: Extras<TextField>): TextField => ({
    kind: "text",
    key,
    label,
    ...extras,
});
export const longText = (key: string, label: string, extras: Extras<TextField>): TextField => ({
    kind: "longText",
    key,
    label,
    ...extras,
});
export const link = (key: string, label: string, extras: Extras<LinkField> = {}): LinkField => ({
    kind: "link",
    key,
    label,
    ...extras,
});
export const photo = (key: string, label: string, extras: Extras<PhotoField> = {}): PhotoField => ({
    kind: "photo",
    key,
    label,
    ...extras,
});
export const photoList = (
    key: string,
    label: string,
    extras: Extras<PhotoListField>,
): PhotoListField => ({ kind: "photoList", key, label, ...extras });
export const choice = (key: string, label: string, extras: Extras<ChoiceField>): ChoiceField => ({
    kind: "choice",
    key,
    label,
    ...extras,
});
export const list = (key: string, label: string, extras: Extras<ListField>): ListField => ({
    kind: "list",
    key,
    label,
    ...extras,
});
export const source = (key: string, label: string, extras: Extras<SourceField>): SourceField => ({
    kind: "source",
    key,
    label,
    ...extras,
});
