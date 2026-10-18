"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { EnvBadge } from "@/components/env-badge";
import { HamburgerMenuButton } from "@/components/hamburger-menu-button";
import { BRAND } from "@/lib/brand";

const links = [
  { href: "/#services", label: "Browse services" },
  { href: "/playground", label: "Payment playground" },
  { href: "/seller", label: "Seller account" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Create account" },
  { href: "/provider", label: "Provider illustration" },
  { href: "/admin", label: "Admin tools · restricted" },
] as const;

const primaryLinks = [links[0], links[1], links[2]] as const;
const accountLinks = [links[3], links[4]] as const;
const additionalLinks = [links[5], links[6]] as const;
const primaryLabels: Record<(typeof primaryLinks)[number]["href"], string> = {
  "/#services": "Browse",
  "/playground": "Demo Studio",
  "/seller": "Seller",
};

function isActiveLink(pathname: string | null, href: (typeof links)[number]["href"]) {
  if (!pathname) return false;
  return href === "/#services"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  href,
  label,
  pathname,
  onClick,
  prominent = false,
}: {
  href: (typeof links)[number]["href"];
  label: string;
  pathname: string | null;
  onClick?: () => void;
  prominent?: boolean;
}) {
  const active = isActiveLink(pathname, href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={prominent
        ? "focus-ring inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-md bg-[var(--color-brand)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:brightness-95"
        : `focus-ring whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"}`}
    >
      {label}
    </Link>
  );
}

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
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--color-ink)] sm:text-lg"
        >
          <span className="sm:hidden">{BRAND.shortName}</span>
          <span className="hidden sm:inline">{BRAND.name}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 xl:flex" aria-label="Primary">
          {primaryLinks.map((link) => (
            <NavigationLink
              key={link.href}
              {...link}
              label={primaryLabels[link.href]}
              pathname={pathname}
              onClick={onNavigate}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-1 xl:flex">
          {accountLinks.map((link) => (
            <NavigationLink
              key={link.href}
              {...link}
              pathname={pathname}
              onClick={onNavigate}
              prominent={link.href === "/sign-up"}
            />
          ))}
        </div>

        <div className="hidden xl:block">
          <EnvBadge compact />
        </div>

        <div className="ml-auto xl:ml-0">
          <HamburgerMenuButton
            expanded={open}
            controls="mobile-nav"
            onClick={onToggle}
          />
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        style={{ right: "max(1rem, calc((100vw - 72rem) / 2 + 1.5rem))" }}
        className="absolute inset-x-0 top-full z-50 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3 shadow-sm sm:px-6 xl:inset-x-auto xl:w-64 xl:rounded-b-lg xl:border xl:bg-white xl:px-3 xl:py-3"
      >
        <nav className="flex flex-col gap-1 xl:hidden" aria-label="Mobile primary">
          {links.map((link) => (
            <NavigationLink
              key={link.href}
              {...link}
              pathname={pathname}
              onClick={onNavigate}
            />
          ))}
        </nav>
        <nav className="hidden flex-col gap-1 xl:flex" aria-label="Additional pages">
          {additionalLinks.map((link) => (
            <NavigationLink key={link.href} {...link} pathname={pathname} onClick={onNavigate} />
          ))}
        </nav>
        <div className="mt-3 xl:hidden">
          <EnvBadge />
        </div>
      </div>
    </header>
  );
}

/** Static shell for prerender while `usePathname` resolves under Cache Components. */
export function SiteHeaderFallback() {
  const [open, setOpen] = useState(false);

  return (
    <HeaderShell
      pathname={null}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      onNavigate={() => setOpen(false)}
    />
  );
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
