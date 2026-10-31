import { sampleHandle, samplePage } from "@tondo/page";
import { createDb } from "./client";
import { seedUser } from "./pages";

const { db, close } = createDb();
await seedUser(db, sampleHandle, samplePage);
await close();
process.stdout.write(`Seeded tondo.page/${sampleHandle}.\n`);
