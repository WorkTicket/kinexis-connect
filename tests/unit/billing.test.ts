import { describe, expect, it } from "vitest";
import {
  isIncludedPlan,
  mapPayPalSubscriptionStatus,
  mapPayPalWebhookStatus,
  parsePayPalMoney,
  paypalEventTime,
  paypalSubscriptionIdForEvent,
} from "@/lib/billing/paypal";

describe("PayPal billing helpers", () => {
  it("maps subscription API statuses conservatively", () => {
    expect(mapPayPalSubscriptionStatus("ACTIVE")).toBe("active");
    expect(mapPayPalSubscriptionStatus("SUSPENDED")).toBe("paused");
    expect(mapPayPalSubscriptionStatus("CANCELLED")).toBe("canceled");
    expect(mapPayPalSubscriptionStatus("UNKNOWN")).toBe("incomplete");
  });

  it("maps lifecycle and failed-payment webhook events", () => {
    expect(mapPayPalWebhookStatus("BILLING.SUBSCRIPTION.ACTIVATED")).toBe("active");
    expect(mapPayPalWebhookStatus("BILLING.SUBSCRIPTION.PAYMENT.FAILED")).toBe("past_due");
    expect(mapPayPalWebhookStatus("PAYMENT.SALE.COMPLETED")).toBeUndefined();
  });

  it("uses the billing agreement ID for sale events", () => {
    const resource = { id: "sale-id", billing_agreement_id: "subscription-id" };
    expect(paypalSubscriptionIdForEvent("PAYMENT.SALE.COMPLETED", resource)).toBe("subscription-id");
    expect(paypalSubscriptionIdForEvent("BILLING.SUBSCRIPTION.ACTIVATED", resource)).toBe("sale-id");
  });

  it("restricts included entitlements to Kinexis bundle plans", () => {
    expect(isIncludedPlan("lead_system")).toBe(true);
    expect(isIncludedPlan("plus")).toBe(true);
    expect(isIncludedPlan("starter")).toBe(false);
  });

  it("normalizes subscription-plan and sale amount formats", () => {
    expect(parsePayPalMoney({ value: "99.00", currency_code: "USD" })).toEqual({ amount: 99, currency: "USD" });
    expect(parsePayPalMoney({ total: "49.00", currency: "USD" })).toEqual({ amount: 49, currency: "USD" });
    expect(parsePayPalMoney({ value: "not-a-number" })).toBeNull();
  });

  it("uses the provider's payment time instead of webhook processing time", () => {
    expect(paypalEventTime("2026-10-28T16:05:00Z", "2026-10-28T17:49:00Z")).toBe("2026-10-28T16:05:00.000Z");
    expect(paypalEventTime(undefined, "2026-10-28T17:49:00Z")).toBe("2026-10-28T17:49:00.000Z");
  });
});
