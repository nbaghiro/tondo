import { describe, expect, it } from "vitest";
import { refusal } from "./load-example";

describe("loading an example into a draft", () => {
    it("runs against the local database", () => {
        expect(refusal({})).toBeNull();
        expect(refusal({ DATABASE_URL: "postgres://a:b@127.0.0.1:8102/tondo" })).toBeNull();
    });

    it("refuses production and any other database", () => {
        expect(refusal({ NODE_ENV: "production" })).toContain("development");
        expect(refusal({ DATABASE_URL: "postgres://a:b@ep-x.neon.tech/tondo" })).toContain("local");
        expect(refusal({ DATABASE_URL: "not a url" })).toContain("local");
    });
});
