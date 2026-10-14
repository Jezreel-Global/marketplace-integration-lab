import { createPostgresStore } from "@/lib/store/postgres-adapter";
import { getDatabaseUrl, getPool } from "@/lib/store/db";
import { StoreError, type MarketplaceStore } from "@/lib/store/types";

declare global {
  var __marketplaceStore: MarketplaceStore | undefined;
  var __marketplaceStoreOverride: MarketplaceStore | undefined;
}

/**
 * Runtime store singleton backed by Neon PostgreSQL.
 * Reads without DATABASE_URL return empty runtime rows so seed UI still builds;
 * mutations require DATABASE_URL and throw a config StoreError.
 */
export function getMarketplaceStore(): MarketplaceStore {
  if (globalThis.__marketplaceStoreOverride) {
    return globalThis.__marketplaceStoreOverride;
  }

  const url = getDatabaseUrl();
  if (!url) {
    return createUnconfiguredStore();
  }

  if (!globalThis.__marketplaceStore) {
    globalThis.__marketplaceStore = createPostgresStore(getPool());
  }
  return globalThis.__marketplaceStore;
}

function createUnconfiguredStore(): MarketplaceStore {
  const configError = () => {
    throw new StoreError(
      "DATABASE_URL is not set. Configure Neon Postgres before mutating demo data.",
      "config",
    );
  };

  return {
    async listBookings() {
      return [];
    },
    async listPaymentAttempts() {
      return [];
    },
    async getBookingById() {
      return undefined;
    },
    async insertBooking() {
      return configError();
    },
    async updateBooking() {
      return configError();
    },
  };
}

/** Test helper: inject a store (e.g. memory) without touching Postgres. */
export function setMarketplaceStoreForTests(
  store: MarketplaceStore | undefined,
) {
  globalThis.__marketplaceStoreOverride = store;
  if (!store) {
    globalThis.__marketplaceStore = undefined;
  }
}

export type { MarketplaceStore } from "@/lib/store/types";
export {
  StoreError,
  publicStoreErrorMessage,
} from "@/lib/store/types";
export { createMemoryStore } from "@/lib/store/memory-adapter";
export { createPostgresStore } from "@/lib/store/postgres-adapter";
