import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma configuration (replaces the deprecated `package.json#prisma` block).
 *
 * A Prisma config file disables Prisma's automatic .env loading, so we load it
 * here — preferring .env.local (Next.js convention) and falling back to .env.
 * The seed command runs through tsx so it can import the app's TypeScript
 * business-logic modules directly.
 */
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
