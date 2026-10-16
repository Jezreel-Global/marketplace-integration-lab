import "server-only";

import {
  inspectStripeConnectConfiguration,
  type StripeConnectReadiness,
} from "@/lib/stripe/readiness-core";

export function getStripeConnectReadiness(): StripeConnectReadiness {
  return inspectStripeConnectConfiguration(process.env);
}
