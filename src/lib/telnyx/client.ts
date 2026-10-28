const API_BASE = "https://api.telnyx.com/v2";

export class TelnyxApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

async function telnyxRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) throw new TelnyxApiError("Telnyx is not configured", 503, "provider_not_configured");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const result = await response.json().catch(() => ({})) as {
    data?: T;
    errors?: Array<{ code?: string; title?: string; detail?: string }>;
  };
  if (!response.ok) {
    const error = result.errors?.[0];
    throw new TelnyxApiError(
      error?.detail ?? error?.title ?? `Telnyx request failed (${response.status})`,
      response.status,
      error?.code,
      Number(response.headers.get("retry-after") ?? 0) || undefined,
    );
  }
  return (result.data ?? result) as T;
}

export function isTelnyxConfigured() {
  return Boolean(
    process.env.TELNYX_API_KEY &&
    process.env.TELNYX_PUBLIC_KEY &&
    process.env.TELNYX_VOICE_APPLICATION_ID &&
    process.env.TELNYX_MESSAGING_PROFILE_ID,
  );
}

export function callCommand(callControlId: string, action: string, body: Record<string, unknown> = {}) {
  return telnyxRequest<{ result: string }>(
    `/calls/${encodeURIComponent(callControlId)}/actions/${action}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export type SentMessage = {
  id: string;
  parts?: number;
  cost?: { amount?: string | number; currency?: string };
  to?: Array<{ status?: string }>;
};

export function sendTelnyxMessage(from: string, to: string, text: string) {
  return telnyxRequest<SentMessage>("/messages", {
    method: "POST",
    body: JSON.stringify({ from, to, text, messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID }),
  });
}
