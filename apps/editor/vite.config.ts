import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// In production the server serves the editor at /app.
export default defineConfig(({ command }) => ({
    base: command === "build" ? "/app/" : "/",
    plugins: [solid()],
    // Demo photos, until object storage takes over.
    publicDir: "../../packages/brand/photos",
    server: {
        host: "127.0.0.1",
        port: 8100,
        strictPort: true,
        proxy: { "/api": "http://127.0.0.1:8101", "/health": "http://127.0.0.1:8101" },
    },
    preview: { host: "127.0.0.1", port: 8100, strictPort: true },
}));
