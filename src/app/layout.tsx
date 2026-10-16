import type { Metadata } from "next";
import { Source_Sans_3, Syne } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback } from "@/components/site-header";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-[var(--color-ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-ink)]">
                {BRAND.name}
              </span>{" "}
              — hackathon learning project. Not a production payments platform.
            </p>
            <p>Milestone 3B · authenticated seller profiles; simulated payments only</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
