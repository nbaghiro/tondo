import { defineConfig, devices } from "@playwright/test";
import { PORTS } from "./scripts/ports";
import { TEST_DATABASE } from "./tests/setup-database";
import { STRIPE_TEST_SECRET } from "./tests/test-code";

const server = `http://localhost:${String(PORTS.testServer)}`;

// Runs the production build through the real server, with a stand-in for Neon Auth.
export default defineConfig({
    testDir: "tests",
    testMatch: "*.spec.ts",
    globalSetup: "./tests/setup-database.ts",
    fullyParallel: true,
    forbidOnly: Boolean(process.env["CI"]),
    retries: process.env["CI"] ? 1 : 0,
    reporter: process.env["CI"] ? "github" : "list",
    use: {
        baseURL: server,
        ...(process.env["CI"] ? {} : { channel: "chrome" }),
        trace: "retain-on-failure",
    },
    projects: [
        { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
        {
            name: "phone",
            use: {
                viewport: devices["iPhone 13"].viewport,
                hasTouch: true,
                isMobile: true,
            },
        },
    ],
    webServer: [
        {
            command: "pnpm exec tsx tests/neon-stand-in.ts",
            port: PORTS.testNeon,
            reuseExistingServer: false,
        },
        {
            command: "pnpm build && pnpm --filter @tondo/server start",
            url: `${server}/health`,
            reuseExistingServer: false,
            timeout: 180_000,
            env: {
                NODE_ENV: "production",
                PORT: String(PORTS.testServer),
                DATABASE_URL: TEST_DATABASE,
                NEON_AUTH_BASE_URL: `http://127.0.0.1:${String(PORTS.testNeon)}/auth`,
                RATE_LIMIT_SCALE: "1000",
                BLOCKED_HOSTS: "blocked.example",
                COUNT_FLUSH_MS: "50",
                PLANS_ON: "true",
                STRIPE_KEY: "rk_test_stand_in",
                STRIPE_WEBHOOK_SECRET: STRIPE_TEST_SECRET,
                STRIPE_API_BASE: `http://127.0.0.1:${String(PORTS.testNeon)}`,
                NEON_AUTH_COOKIE_SECRET: "a-test-secret-that-is-long-enough-to-use",
                S3_ENDPOINT: `http://127.0.0.1:${String(PORTS.testNeon)}/s3`,
                S3_ACCESS_KEY: "test",
                S3_SECRET_KEY: "test",
                SITE_URL: server,
                EDITOR_URL: "/app",
                // The stand-in plays the model. Empty keys stop .env supplying real ones.
                TONDO_FAKE_AI: "1",
                GOOGLE_API_KEY: "",
                PEXELS_API_KEY: "",
            },
        },
    ],
});
