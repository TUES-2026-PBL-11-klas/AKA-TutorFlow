import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient };

if (!g.__prisma) {
  const pool = new Pool({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true`,
    ssl: { rejectUnauthorized: false },
  });

  pool.on("error", () => {});

  // @ts-expect-error -- duplicate @types/pg versions (ours vs adapter's bundled copy)
  g.__prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = g.__prisma;
