import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectStripeConnectConfiguration } from "../src/lib/stripe/readiness-core";

const TEST_SECRET = "sk_test_testOnlyValue123";
const WEBHOOK_SECRET = "whsec_testOnlyValue123";

describe("Stripe Connect readiness guard", () => {
  it("defaults disabled; a test key alone does not enable it", () => {
    const r = inspectStripeConnectConfiguration({
      STRIPE_SECRET_KEY: TEST_SECRET, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    });
    assert.equal(r.state, "disabled");
    assert.equal(r.featureFlagEnabled, false);
    assert.equal(r.stripeOperationsAvailable, false);
  });

  it("reports missing config when explicitly enabled without secrets", () => {
    const r = inspectStripeConnectConfiguration({ STRIPE_CONNECT_ENABLED: "true" });
    assert.equal(r.state, "configuration_missing");
    assert.equal(r.featureFlagEnabled, true);
    assert.equal(r.stripeOperationsAvailable, false);
  });

  it("rejects live secret keys even while disabled", () => {
    const r = inspectStripeConnectConfiguration({ STRIPE_SECRET_KEY: "sk_live_doNotUse" });
    assert.equal(r.state, "configuration_invalid");
    assert.equal(r.stripeOperationsAvailable, false);
    assert.doesNotMatch(r.message, /sk_live_doNotUse/);
  });

  it("rejects malformed flags, keys, and webhook secrets", () => {
    assert.equal(inspectStripeConnectConfiguration({
      STRIPE_CONNECT_ENABLED: "yes",
    }).state, "configuration_invalid");
    assert.equal(inspectStripeConnectConfiguration({
      STRIPE_CONNECT_ENABLED: "true",
      STRIPE_SECRET_KEY: "pk_test_not_secret", STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    }).state, "configuration_invalid");
    assert.equal(inspectStripeConnectConfiguration({
      STRIPE_CONNECT_ENABLED: "true",
      STRIPE_SECRET_KEY: TEST_SECRET, STRIPE_WEBHOOK_SECRET: "bad",
    }).state, "configuration_invalid");
  });

  it("reports valid test config as eligibility-unverified", () => {
    const r = inspectStripeConnectConfiguration({
      STRIPE_CONNECT_ENABLED: "true", STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    });
    assert.equal(r.state, "eligibility_unverified");
    assert.equal(r.eligibilityVerified, false);
    assert.equal(r.stripeOperationsAvailable, false);
    assert.match(r.message, /have not been verified/);
  });

  it("never returns secret values in readiness data", () => {
    const r = inspectStripeConnectConfiguration({
      STRIPE_CONNECT_ENABLED: "true", STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    });
    assert.equal(JSON.stringify(r).includes(TEST_SECRET), false);
    assert.equal(JSON.stringify(r).includes(WEBHOOK_SECRET), false);
  });
});
