// What the editor's inspector draws for a block. This is data, so the page package stays free of UI.
export type Field =
    | { kind: "text" | "longText" | "link" | "photo"; key: string; label: string }
    | {
          kind: "choice";
          key: string;
          label: string;
          options: readonly (readonly [string, string])[];
      };

export const text = (key: string, label: string): Field => ({ kind: "text", key, label });
export const longText = (key: string, label: string): Field => ({ kind: "longText", key, label });
export const link = (key: string, label: string): Field => ({ kind: "link", key, label });
export const photo = (key: string, label: string): Field => ({ kind: "photo", key, label });
