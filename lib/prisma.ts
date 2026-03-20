import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL/DATABASE_URL for Prisma");
  }

  const require = createRequire(import.meta.url);
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
