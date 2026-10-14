export type DemoResetConfirmation = {
  databaseUrl: string;
  confirm: string | undefined;
  nonProduction: string | undefined;
  targetDatabase: string | undefined;
};

/** Require explicit intent and an exact database-name match before any reset connection is opened. */
export function demoResetSafetyError(
  confirmation: DemoResetConfirmation,
): string | undefined {
  if (confirmation.confirm !== "YES") {
    return "Set DEMO_RESET_CONFIRM=YES to request a demo reset.";
  }
  if (confirmation.nonProduction !== "YES") {
    return "Set DEMO_RESET_NON_PRODUCTION=YES only after confirming this is not Production.";
  }

  let actualDatabase: string;
  try {
    actualDatabase = decodeURIComponent(
      new URL(confirmation.databaseUrl).pathname.replace(/^\/+/, ""),
    );
  } catch {
    return "DATABASE_URL must be a valid PostgreSQL connection URL.";
  }
  if (!actualDatabase) {
    return "DATABASE_URL must include a database name.";
  }
  if (confirmation.targetDatabase !== actualDatabase) {
    return "DEMO_RESET_DATABASE must exactly match the database name in DATABASE_URL.";
  }
  return undefined;
}
