import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { hasClerkConfiguration } from "@/lib/auth-config";

const PROTECTED_PREFIXES = ["/admin", "/provider"] as const;
const COOKIE_NAME = "mil_demo_access";

/**
 * Optional demo gate for unauthenticated /admin and /provider.
 * When DEMO_ACCESS_TOKEN is unset, routes stay open (local default) but pages
 * still display “not a secure admin system” banners.
 * When set, visitors enter it on /demo-access. A short-lived httpOnly cookie
 * grants access without placing the shared code in a URL.
 */
function enforceDemoGate(request: NextRequest) {
  const token = process.env.DEMO_ACCESS_TOKEN?.trim();
  if (!token) return undefined;
  const { pathname } = request.nextUrl;
  const needsGate = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!needsGate || request.cookies.get(COOKIE_NAME)?.value === token) return undefined;
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.delete("demo_access");
  url.searchParams.set("demo_gate", "required");
  return NextResponse.redirect(url);
}
const clerkProxy = hasClerkConfiguration() ? clerkMiddleware() : undefined;
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const gateResponse = enforceDemoGate(request);
  if (gateResponse) return gateResponse;
  return clerkProxy ? clerkProxy(request, event) : NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/provider/:path*", "/seller/:path*", "/sign-in/:path*", "/sign-up/:path*", "/__clerk/:path*"],
};
