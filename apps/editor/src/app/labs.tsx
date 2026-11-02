import { render } from "solid-js/web";
import { BlockLab } from "../components/BlockLab";
import { FieldLab } from "../components/FieldLab";
import "../styles/fields.css";
import "../styles/builder.css";

/** Development only: every field or every block on one page. */
export function mountLab(root: HTMLElement, lab: string): void {
    render(() => (lab === "fields" ? <FieldLab /> : <BlockLab />), root);
}
