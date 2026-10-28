import { describe, expect, it } from "vitest";
import { isMessagingReady } from "@/lib/messaging/readiness";

const ready = {
  providerConfigured: true,
  subscriptionStatus: "active",
  consentReviewStatus: "approved",
  smsEnabled: true,
  registrationStatus: "approved",
};

describe("messaging readiness", () => {
  it("requires every provider, billing, compliance, and number gate", () => {
    expect(isMessagingReady(ready)).toBe(true);
    expect(isMessagingReady({ ...ready, providerConfigured: false })).toBe(false);
    expect(isMessagingReady({ ...ready, subscriptionStatus: "past_due" })).toBe(false);
    expect(isMessagingReady({ ...ready, consentReviewStatus: "pending" })).toBe(false);
    expect(isMessagingReady({ ...ready, registrationStatus: "pending" })).toBe(false);
  });

  it("allows a trialing subscription only when all other gates pass", () => {
    expect(isMessagingReady({ ...ready, subscriptionStatus: "trialing" })).toBe(true);
  });
});
