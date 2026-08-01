import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton. Next.js clears the module registry on every hot reload in
 * development, which would otherwise open a new connection pool per edit and
 * exhaust Supabase's connection limit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
