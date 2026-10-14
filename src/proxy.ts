import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/provider"] as const;
const COOKIE_NAME = "mil_demo_access";

/**
 * Optional demo gate for unauthenticated /admin and /provider.
 * When DEMO_ACCESS_TOKEN is unset, routes stay open (local default) but pages
 * still display “not a secure admin system” banners.
 * When set, visitors enter it on /demo-access. A short-lived httpOnly cookie
 * grants access without placing the shared code in a URL.
 */
export function proxy(request: NextRequest) {
  const token = process.env.DEMO_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const needsGate = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!needsGate) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;

  if (cookieToken === token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.delete("demo_access");
  url.searchParams.set("demo_gate", "required");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/provider/:path*"],
};
