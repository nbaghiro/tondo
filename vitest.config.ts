import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["{apps,packages,scripts}/**/*.test.{ts,tsx}"],
        passWithNoTests: false,
        // This cache keeps an old import.meta.glob result when files are added to a folder it reads.
        fsModuleCache: false,
    },
});
