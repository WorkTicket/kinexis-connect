import { describe, expect, it } from "vitest";
import { passwordResetSchema, settingsPatchSchema } from "@/lib/validation/schemas";

describe("settings validation", () => {
  it("accepts supported business, forwarding, quiet-hour, and notification values", () => {
    const result = settingsPatchSchema.safeParse({
      business_name: "Acme Services",
      forward_to_e164: "+15551234567",
      quiet_start_local: "21:30",
      quiet_end_local: "08:00:00",
      email_on_new_reply: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone numbers, times, and templates", () => {
    expect(settingsPatchSchema.safeParse({ forward_to_e164: "5551234567" }).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ quiet_start_local: "25:00" }).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ auto_reply_template: "" }).success).toBe(false);
  });
});

describe("password reset validation", () => {
  it("accepts supported password lengths", () => {
    expect(passwordResetSchema.safeParse({ password: "correct-horse-battery-staple" }).success).toBe(true);
  });

  it("rejects short and excessively long passwords", () => {
    expect(passwordResetSchema.safeParse({ password: "short" }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ password: "x".repeat(129) }).success).toBe(false);
  });
});
