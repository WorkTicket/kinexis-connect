import { describe, expect, it } from "vitest";
import { verifyTelnyxSignature } from "@/lib/security/telnyx";

function base64(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64");
}

describe("Telnyx webhook verification", () => {
  it("accepts the exact signed body and rejects tampering and stale requests", async () => {
    const keys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const publicKey = await crypto.subtle.exportKey("raw", keys.publicKey);
    const timestamp = "1800000000";
    const rawBody = '{"data":{"id":"evt-1"}}';
    const signature = await crypto.subtle.sign(
      { name: "Ed25519" },
      keys.privateKey,
      new TextEncoder().encode(`${timestamp}|${rawBody}`),
    );
    const input = { rawBody, timestamp, signature: base64(signature), publicKey: base64(publicKey), now: 1_800_000_000_000 };

    await expect(verifyTelnyxSignature(input)).resolves.toBe(true);
    await expect(verifyTelnyxSignature({ ...input, rawBody: `${rawBody} ` })).resolves.toBe(false);
    await expect(verifyTelnyxSignature({ ...input, now: input.now + 301_000 })).resolves.toBe(false);
  });
});
