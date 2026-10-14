import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { StoreError } from "@/lib/store/types";

// Node.js (local + Vercel Node) needs an explicit WebSocket constructor for Pool.
neonConfig.webSocketConstructor = ws;

declare global {
  var __marketplacePgPool: Pool | undefined;
}

export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url || undefined;
}

export function requireDatabaseUrl(): string {
  const url = getDatabaseUrl();
  if (!url) {
    throw new StoreError(
      "DATABASE_URL is not set. Configure Neon Postgres before mutating demo data.",
      "config",
    );
  }
  return url;
}

/** Process-wide Pool singleton (survives hot reload via globalThis). */
export function getPool(): Pool {
  const connectionString = requireDatabaseUrl();
  if (!globalThis.__marketplacePgPool) {
    globalThis.__marketplacePgPool = new Pool({ connectionString });
  }
  return globalThis.__marketplacePgPool;
}

export async function closePoolForTests(): Promise<void> {
  if (globalThis.__marketplacePgPool) {
    await globalThis.__marketplacePgPool.end();
    globalThis.__marketplacePgPool = undefined;
  }
}
