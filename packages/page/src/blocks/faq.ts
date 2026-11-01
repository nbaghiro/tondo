import { z } from "zod";
import { blockSchema, defineBlock, editableText } from "../define-block";
import { list, longText, text } from "../fields";
import { item } from "./parts";

export const faq = defineBlock({
    schema: blockSchema("faq", ["accordion"], {
        items: z.array(item({ question: z.string().max(80), answer: z.string().max(300) })).max(20),
    }),
    name: "Questions",
    group: "details",
    layouts: { accordion: { label: "Accordion" } },
    fields: [
        list("items", "Questions", {
            title: "question",
            add: "Add a question",
            max: 20,
            fields: [
                text("question", "Question", { max: 80 }),
                longText("answer", "Answer", { max: 300 }),
            ],
            make: () => ({ question: "New question", answer: "" }),
        }),
    ],
    make: () => ({
        type: "faq" as const,
        variant: "accordion" as const,
        items: [
            { id: "a", question: "How long does it take?", answer: "Usually two to three weeks." },
            { id: "b", question: "Do you ship?", answer: "Across Canada and the US." },
        ],
    }),
    css: `.b-faq{margin-top:8px}.b-faq details{border-bottom:1px solid var(--line);padding:12px 0}.b-faq summary{font-weight:600;cursor:pointer;line-height:1.3}.b-faq p{margin:7px 0 0;font-size:14.5px;color:var(--mut)}`,
    render: (block, ctx) =>
        block.items.length
            ? `<div class="b-faq">${block.items
                  .map(
                      (entry, i) =>
                          `<details${i ? "" : " open"}><summary>${editableText(ctx, "span", `items.${String(i)}.question`, entry.question)}</summary>${editableText(ctx, "p", `items.${String(i)}.answer`, entry.answer)}</details>`,
                  )
                  .join("")}</div>`
            : "",
});
