import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// In production use DATABASE_URL_PROD if set (e.g. on host), else DATABASE_URL
const connectionUrl =
  process.env.NODE_ENV === "production" && process.env.DATABASE_URL_PROD
    ? process.env.DATABASE_URL_PROD
    : process.env.DATABASE_URL;

// Dev uses a separate Postgres schema (e.g. restaumap-dev) so prod uses public
const devSchema = process.env["POSTGRES_SCHEMA_DEV"] ?? "restaumap-dev";

/** The Postgres schema used for all tables — needed for $queryRaw */
export const dbSchema =
  process.env.NODE_ENV === "production" ? "public" : devSchema;
const adapter = new PrismaPg(
  { connectionString: connectionUrl! },
  {
    schema: process.env.NODE_ENV === "production" ? undefined : devSchema,
  },
);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
