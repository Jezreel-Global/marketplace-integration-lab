import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { hasClerkConfiguration } from "@/lib/auth-config";

export default function SellerAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return hasClerkConfiguration() ? (
    <ClerkProvider>{children}</ClerkProvider>
  ) : (
    children
  );
}
