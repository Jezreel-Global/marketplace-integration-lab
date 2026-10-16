export type StripeConnectReadinessState =
  | "disabled"
  | "configuration_missing"
  | "configuration_invalid"
  | "eligibility_unverified";

export interface StripeConnectReadiness {
  state: StripeConnectReadinessState;
  label: string;
  message: string;
  featureFlagEnabled: boolean;
  stripeOperationsAvailable: false;
  eligibilityVerified: false;
}

type StripeEnvironment = Readonly<Record<string, string | undefined>>;

const TEST_SECRET_KEY = /^sk_test_[A-Za-z0-9]+$/;
const WEBHOOK_SECRET = /^whsec_[A-Za-z0-9_-]+$/;

function result(
  state: StripeConnectReadinessState,
  label: string,
  message: string,
  featureFlagEnabled = false,
): StripeConnectReadiness {
  return {
    state, label, message, featureFlagEnabled,
    stripeOperationsAvailable: false,
    eligibilityVerified: false,
  };
}

export function inspectStripeConnectConfiguration(
  env: StripeEnvironment,
): StripeConnectReadiness {
  const flagWasSet = env.STRIPE_CONNECT_ENABLED !== undefined;
  const flag = env.STRIPE_CONNECT_ENABLED?.trim();
  const enabled = flag === "true";
  const secret = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();

  if (flagWasSet && flag !== "true" && flag !== "false") {
    return result("configuration_invalid", "Configuration invalid",
      "STRIPE_CONNECT_ENABLED must be exactly true or false. No Stripe calls are made.");
  }
  if ((secret && !TEST_SECRET_KEY.test(secret)) ||
      (webhookSecret && !WEBHOOK_SECRET.test(webhookSecret))) {
    return result("configuration_invalid", "Configuration invalid",
      "Use a valid Stripe test secret and webhook signing secret. Live secret keys are rejected. No Stripe calls are made.",
      enabled);
  }
  if (!enabled) {
    return result("disabled", "Disabled by default",
      "Stripe Connect is disabled. Credentials alone do not enable it; simulated payments remain separate. No Stripe calls are made.");
  }
  if (!secret || !webhookSecret) {
    return result("configuration_missing", "Configuration incomplete",
      "The feature flag is enabled, but test-mode Stripe configuration is incomplete. No Stripe calls are made.",
      true);
  }
  return result("eligibility_unverified", "Country and capabilities unverified",
    "Test-mode configuration is present, but platform and seller countries, capabilities, and NGN charge and settlement support have not been verified. No onboarding, charge, or transfer flow is implemented.",
    true);
}
