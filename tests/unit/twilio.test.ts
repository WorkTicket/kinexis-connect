import { describe, it, expect } from "vitest";
import { verifyTwilioSignature } from "@/lib/security/twilio";

describe("twilio signature", () => {
  it("rejects invalid", async () => {
    const ok = await verifyTwilioSignature("token", "badsig", "https://example.com", { Foo: "bar" });
    expect(ok).toBe(false);
  });
});
