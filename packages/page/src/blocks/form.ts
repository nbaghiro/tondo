import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { choice, list, longText, text } from "../fields";
import { item, lines } from "./parts";

const TYPES = [
    ["text", "Short answer"],
    ["long", "Long answer"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["choice", "Choice"],
] as const;

// Needs answers stored and email sent. It stays out of the shelf until they exist.
export const form = defineBlock({
    schema: blockSchema("form", ["card"], {
        title: z.string().max(40),
        sub: z.string().max(120).optional(),
        questions: z
            .array(
                item({
                    label: z.string().max(40),
                    kind: z.enum(["text", "long", "email", "phone", "choice"]),
                    options: z.string().max(300).optional(),
                }),
            )
            .max(8),
        cta: z.string().max(14).optional(),
    }),
    name: "Form",
    group: "collecting",
    held: true,
    layouts: { card: { label: "Card" } },
    fields: [
        text("title", "Title", { max: 40, inline: true }),
        text("sub", "Short line", { max: 120, inline: true }),
        list("questions", "Questions", {
            title: "label",
            add: "Add a question",
            max: 8,
            fields: [
                text("label", "Question", { max: 40 }),
                choice("kind", "Answer type", { options: TYPES }),
                longText("options", "Options, one per line", {
                    max: 300,
                    when: (values) => values["kind"] === "choice",
                }),
            ],
            make: () => ({ label: "New question", kind: "text" }),
        }),
        text("cta", "Button text", { max: 14 }),
    ],
    make: () => ({
        type: "form" as const,
        variant: "card" as const,
        title: "Ask about a date",
        sub: "I usually reply within two working days.",
        cta: "Send",
        questions: [
            { id: "a", label: "Your name", kind: "text" as const },
            { id: "b", label: "Email", kind: "email" as const },
            {
                id: "c",
                label: "What's it for?",
                kind: "choice" as const,
                options: "Wedding\nEvent\nSomething else",
            },
        ],
    }),
    css: `.b-enq{background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:15px;margin-top:10px;box-shadow:var(--sh,none)}.b-enq>b{display:block;font:var(--dw,500) 18px/1.2 var(--disp)}.b-enq>small{display:block;font-size:13.5px;opacity:.76;margin-top:3px}.b-enq label{display:block;font-size:13.5px;font-weight:600;margin-top:10px}.b-enq input,.b-enq select,.b-enq textarea{display:block;width:100%;margin-top:4px;font:400 15px var(--body);color:inherit;background:transparent;padding:10px 12px;border:1px solid currentColor;border-radius:calc(var(--r)/2)}.b-enq select option{color:#222}.b-enq button{width:100%;margin-top:12px;font:600 15px var(--body);padding:12px;border:0;background:var(--btn);color:var(--btnfg);border-radius:var(--rb);cursor:pointer}`,
    render: (block, ctx) => {
        const asked = block.questions.map((question) => {
            const input =
                question.kind === "choice"
                    ? `<select>${lines(question.options)
                          .map((option) => `<option>${escapeHtml(option)}</option>`)
                          .join("")}</select>`
                    : question.kind === "long"
                      ? `<textarea rows="3"></textarea>`
                      : `<input type="${question.kind === "text" ? "text" : question.kind === "phone" ? "tel" : "email"}">`;
            return `<label>${escapeHtml(question.label)}${input}</label>`;
        });
        return `<form class="b-enq" action="#">${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}${asked.join("")}<button type="button">${escapeHtml(block.cta ?? "Send")}</button></form>`;
    },
});
