import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const GLOBAL_KEY = "__oss_prisma__";

function createClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });
}

export function getPrismaClient() {
  const cached = globalForPrisma[GLOBAL_KEY];
  if (cached) return cached;

  const client = createClient();
  // simpan ke global agar tidak double-instantiate di env serverless/hot-reload
  globalForPrisma[GLOBAL_KEY] = client;
  return client;
}

const prisma = getPrismaClient();
export default prisma;
