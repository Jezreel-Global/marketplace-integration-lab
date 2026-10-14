"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "mil_demo_access";
const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export async function submitDemoAccessToken(
  submittedToken: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const configuredToken = process.env.DEMO_ACCESS_TOKEN?.trim();
  if (!configuredToken) {
    return { ok: false, error: "Demo access is not configured on this deployment." };
  }
  if (typeof submittedToken !== "string" || submittedToken !== configuredToken) {
    return { ok: false, error: "That demo access code is not valid." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, configuredToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return { ok: true };
}
