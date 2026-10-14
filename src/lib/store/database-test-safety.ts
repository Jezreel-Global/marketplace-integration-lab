export function databaseTestSafetyError(
  databaseUrl: string | undefined,
  nonProductionConfirmation: string | undefined,
  targetDatabase: string | undefined,
): string | undefined {
  if (!databaseUrl) {
    return "DATABASE_URL is not set.";
  }
  if (nonProductionConfirmation !== "YES") {
    return "Set DATABASE_TEST_NON_PRODUCTION=YES only for a disposable non-production database.";
  }

  let actualDatabase: string;
  try {
    actualDatabase = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\/+/, ""));
  } catch {
    return "DATABASE_URL must be a valid PostgreSQL connection URL.";
  }
  if (!actualDatabase) {
    return "DATABASE_URL must include a database name.";
  }
  if (targetDatabase !== actualDatabase) {
    return "DATABASE_TEST_DATABASE must exactly match the database name in DATABASE_URL.";
  }
  return undefined;
}
