function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function decodeKey(value: string): ArrayBuffer {
  const normalized = value.trim()
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  if (/^[a-f\d]{64}$/i.test(normalized)) {
    return exactBuffer(Uint8Array.from(normalized.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16)));
  }
  const binary = atob(normalized.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  // SubjectPublicKeyInfo Ed25519 keys end with the raw 32-byte key.
  return exactBuffer(bytes.length === 32 ? bytes : bytes.slice(-32));
}

export async function verifyTelnyxSignature(input: {
  rawBody: string;
  signature: string;
  timestamp: string;
  publicKey: string;
  now?: number;
  toleranceSeconds?: number;
}): Promise<boolean> {
  const { rawBody, signature, timestamp, publicKey } = input;
  if (!rawBody || !signature || !timestamp || !publicKey) return false;
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const tolerance = input.toleranceSeconds ?? 300;
  if (Math.abs((input.now ?? Date.now()) / 1000 - sentAt) > tolerance) return false;
  try {
    const key = await crypto.subtle.importKey("raw", decodeKey(publicKey), { name: "Ed25519" }, false, ["verify"]);
    const signatureBytes = Uint8Array.from(atob(signature), (character) => character.charCodeAt(0));
    return crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      exactBuffer(signatureBytes),
      exactBuffer(new TextEncoder().encode(`${timestamp}|${rawBody}`)),
    );
  } catch {
    return false;
  }
}
