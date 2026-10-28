const PAYPAL_BASE = process.env.PAYPAL_ENVIRONMENT === "production"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export async function getPayPalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

export async function paypalRequest(path: string, method = "GET", body?: unknown) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed: ${res.status} ${text}`);
  return json;
}

export function planIdForTier(tier: string): string | undefined {
  const map: Record<string, string | undefined> = {
    starter: process.env.PAYPAL_STARTER_PLAN_ID,
    professional: process.env.PAYPAL_PROFESSIONAL_PLAN_ID,
    premium: process.env.PAYPAL_PREMIUM_PLAN_ID,
  };
  return map[tier];
}

export function isIncludedPlan(tier: string): tier is "lead_system" | "plus" {
  return tier === "lead_system" || tier === "plus";
}

export function mapPayPalSubscriptionStatus(status?: string): string {
  const map: Record<string, string> = {
    APPROVAL_PENDING: "incomplete",
    APPROVED: "incomplete",
    ACTIVE: "active",
    SUSPENDED: "paused",
    CANCELLED: "canceled",
    EXPIRED: "canceled",
  };
  return map[status ?? ""] ?? "incomplete";
}

export function mapPayPalWebhookStatus(eventType: string): string | undefined {
  const map: Record<string, string> = {
    "BILLING.SUBSCRIPTION.ACTIVATED": "active",
    "BILLING.SUBSCRIPTION.CANCELLED": "canceled",
    "BILLING.SUBSCRIPTION.SUSPENDED": "paused",
    "BILLING.SUBSCRIPTION.EXPIRED": "canceled",
    "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "past_due",
    "PAYMENT.SALE.DENIED": "past_due",
  };
  return map[eventType];
}

export function paypalSubscriptionIdForEvent(eventType: string, resource: { id?: string; billing_agreement_id?: string }): string | undefined {
  return eventType.startsWith("PAYMENT.")
    ? resource.billing_agreement_id
    : resource.id ?? resource.billing_agreement_id;
}

type PayPalMoney = {
  value?: string;
  total?: string;
  currency_code?: string;
  currency?: string;
};

export function parsePayPalMoney(money?: PayPalMoney): { amount: number; currency?: string } | null {
  const raw = money?.value ?? money?.total;
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return { amount, currency: money?.currency_code ?? money?.currency };
}

export function paypalEventTime(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (candidate && !Number.isNaN(Date.parse(candidate))) return new Date(candidate).toISOString();
  }
  return new Date().toISOString();
}

export async function getPayPalPlanPrice(planId: string): Promise<{ amount: number; currency?: string } | null> {
  const plan = await paypalRequest(`/v1/billing/plans/${encodeURIComponent(planId)}`) as {
    billing_cycles?: Array<{
      tenure_type?: string;
      pricing_scheme?: { fixed_price?: PayPalMoney };
    }>;
  };
  const cycle = plan.billing_cycles?.find((item) => item.tenure_type === "REGULAR") ?? plan.billing_cycles?.[0];
  return parsePayPalMoney(cycle?.pricing_scheme?.fixed_price);
}

export function paypalAccountUrl() {
  return process.env.PAYPAL_ENVIRONMENT === "production"
    ? "https://www.paypal.com/myaccount/autopay/"
    : "https://www.sandbox.paypal.com/myaccount/autopay/";
}
