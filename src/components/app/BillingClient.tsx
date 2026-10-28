"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime, titleCase } from "@/lib/format";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  billing_currency: string | null;
  billing_amount: number | null;
  current_period_end: string | null;
  last_payment_at: string | null;
  paypal_subscription_id: string | null;
};

const planArt: Record<string, string> = { starter: "plan-starter.svg", professional: "plan-professional.svg", premium: "plan-premium.svg" };

export function BillingClient({ businessId }: { businessId: string }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    setLoading(true); setError("");
    const response = await fetch(`/api/billing?business_id=${encodeURIComponent(businessId)}${refresh ? "&refresh=true" : ""}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setError(data.error?.message ?? "Billing could not be loaded."); return; }
    setSubscription(data.subscription);
  }, [businessId]);
  useEffect(() => { load(); }, [load]);

  async function openPayPal() {
    setWorking(true);
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const data = await response.json();
    setWorking(false);
    if (response.ok && data.url) window.location.assign(data.url);
    else setError(data.error?.message ?? "PayPal could not be opened.");
  }
  async function cancel() {
    if (!window.confirm("Cancel this Connect subscription? Calling and messaging access will be disabled.")) return;
    setWorking(true); setError("");
    const response = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId }) });
    const data = await response.json();
    setWorking(false);
    if (!response.ok) { setError(data.error?.message ?? "Cancellation failed."); return; }
    await load();
  }

  if (loading) return <div className="settings-skeleton">Loading subscription…</div>;
  if (!subscription) return <section className="billing-empty"><Image src="/assets/connect/empty-states/empty-billing.svg" alt="" width={400} height={300} /><h2>No subscription yet</h2><p>Choose a plan to continue setting up Connect.</p><Link className="brand-button" href="/pricing">Compare plans</Link></section>;
  const active = ["active", "trialing"].includes(subscription.status);
  return (
    <div className="billing-layout">
      {error ? <div className="auth-notice auth-notice--error">{error}</div> : null}
      <section className="subscription-card">
        <div>{planArt[subscription.plan] ? <Image src={`/assets/connect/pricing/${planArt[subscription.plan]}`} alt="" width={300} height={180} /> : <Image src="/assets/connect/onboarding/subscription-active.svg" alt="" width={480} height={360} />}</div>
        <div className="subscription-card__details"><span className={`status-pill status-pill--${subscription.status}`}>{titleCase(subscription.status)}</span><p className="eyebrow">Current plan</p><h2>{titleCase(subscription.plan)}</h2><dl><div><dt>Provider</dt><dd>{subscription.paypal_subscription_id ? "PayPal" : "Included entitlement"}</dd></div><div><dt>Last payment</dt><dd>{formatDateTime(subscription.last_payment_at)}</dd></div><div><dt>Next billing date</dt><dd>{formatDateTime(subscription.current_period_end)}</dd></div></dl></div>
      </section>
      <section className="dashboard-panel"><div className="panel-heading"><div><h2>Manage subscription</h2><p>Refresh provider status or manage the billing agreement.</p></div></div><div className="billing-actions"><button className="outline-button" onClick={() => load(true)} disabled={working}>Refresh status</button>{subscription.paypal_subscription_id ? <button className="outline-button" onClick={openPayPal} disabled={working}>Open PayPal</button> : null}{active ? <button className="danger-button" onClick={cancel} disabled={working}>Cancel subscription</button> : <Link className="brand-button" href="/pricing">Choose a plan</Link>}</div></section>
    </div>
  );
}
