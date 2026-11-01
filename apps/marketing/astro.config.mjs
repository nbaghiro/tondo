import { defineConfig } from "astro/config";

export default defineConfig({
    site: "https://tondo.page",
    output: "static",
    server: { host: "127.0.0.1", port: 8103 },
    vite: {
        server: { proxy: { "/api": "http://127.0.0.1:8101", "/photos": "http://127.0.0.1:8101" } },
    },
    devToolbar: { enabled: false },
});
