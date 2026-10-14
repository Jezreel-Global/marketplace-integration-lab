"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { EnvBadge } from "@/components/env-badge";
import { BRAND } from "@/lib/brand";

const links = [
  { href: "/", label: "Marketplace" },
  { href: "/provider", label: "Provider" },
  { href: "/admin", label: "Admin" },
] as const;

function HeaderShell({
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  pathname: string | null;
  open: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)] sm:text-xl"
        >
          {BRAND.name}
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active =
              pathname != null &&
              (link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <EnvBadge compact />
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={onToggle}
        >
          Menu
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-[var(--color-line)] px-4 py-3 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                onClick={onNavigate}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3">
            <EnvBadge />
          </div>
        </div>
      )}
    </header>
  );
}

/** Static shell for prerender while `usePathname` resolves under Cache Components. */
export function SiteHeaderFallback() {
  return <HeaderShell pathname={null} open={false} />;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <HeaderShell
      pathname={pathname}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      onNavigate={() => setOpen(false)}
    />
  );
}
