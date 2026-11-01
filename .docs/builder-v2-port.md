# Moving the sections builder into the real app

Naib approved the prototype in `.scratchpad/builder-v2`. This moves it into `apps/editor` and replaces the shelf and block panels. Blocks stay the engine, and sections are the layer people see.

1. **Page document, version 2.** Blocks gain an optional `section` id and `tint`. Ribbon gains a `wave` layout, the header an optional `wordmark`, and the page an optional `style`. Photos named `paint-1` are painted placeholders. `upgradePage` gives older pages section ids.
2. **`packages/page/src/sections.ts`.** The catalogue, and the functions that read sections out of the block list and change them.
3. **`packages/render/src/style.ts`.** Turns `style` into CSS on the server, including recolouring and contrast correction, so published pages need no script.
4. **Editor.** Floating top bars, a sections panel on the left, a panel on the right when something is selected or Look is open, dragging on the phone, and a bottom sheet on phones.
5. **Start flow.** After sign-up and verification: name, sections, wordmark, look and address. It replaces `/claim`.

Editing before sign-up stays out of scope, and is a decision for later.
