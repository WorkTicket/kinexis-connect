"use client";

import Image from "next/image";
import { useState } from "react";

const plans = [
  {
    name: "Starter",
    price: "$49",
    suffix: "/month",
    plan: "starter",
    art: "plan-starter.svg",
    features: [
      "1 phone number",
      "1 user",
      "Basic auto reply",
      "Inbox",
      "Call log",
    ],
  },
  {
    name: "Professional",
    price: "$99",
    suffix: "/month",
    plan: "professional",
    art: "plan-professional.svg",
    featured: true,
    features: [
      "1 phone number",
      "Up to 3 users",
      "Template editing",
      "Labels and assignment",
      "Analytics",
    ],
  },
  {
    name: "Premium",
    price: "$149",
    suffix: "/month",
    plan: "premium",
    art: "plan-premium.svg",
    features: [
      "1 phone number",
      "Up to 10 users",
      "Full analytics",
      "CSV export",
      "Advanced notifications",
    ],
  },
];

const includedPlans = [
  {
    name: "Lead System",
    plan: "lead_system",
    features: "1 user, inbox, call log, and basic automatic reply",
  },
  {
    name: "Plus",
    plan: "plus",
    features: "Up to 3 users, templates, assignment, and analytics",
  },
];

export default function PricingClient() {
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(plan: string) {
    setLoading(plan);
    try {
      const meRes = await fetch("/api/me");
      if (meRes.status === 401) {
        window.location.href = "/signup";
        return;
      }
      const me = await meRes.json();
      const businessId = me?.businesses?.[0]?.business_id;
      if (!businessId) {
        window.location.href = "/onboarding";
        return;
      }
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, business_id: businessId }),
      });
      const json = await res.json();
      if (json.approval_url) window.location.href = json.approval_url;
      else if (json.free) window.location.href = "/app/billing";
      else if (json.error) alert(json.error.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="pricing-page">
      <div className="connect-container">
        <header className="section-heading section-heading--center pricing-heading">
          <p className="eyebrow">Simple monthly pricing</p>
          <h1>Choose the follow-up system your team needs.</h1>
          <p>
            Every paid plan includes missed-call detection, two-way
            conversations, and one Connect phone number.
          </p>
        </header>
        <div className="pricing-grid">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`pricing-card${p.featured ? " pricing-card--featured" : ""}`}
            >
              {p.featured ? (
                <span className="pricing-card__badge">Most popular</span>
              ) : null}
              <Image
                src={`/assets/connect/pricing/${p.art}`}
                alt=""
                width={300}
                height={180}
              />
              <h2>{p.name}</h2>
              <p className="pricing-card__price">
                {p.price}
                <span>{p.suffix}</span>
              </p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(p.plan)}
                disabled={loading === p.plan}
                className="brand-button"
              >
                {loading === p.plan ? "Processing…" : "Subscribe"}
              </button>
            </article>
          ))}
        </div>

        <section className="included-plans">
          <div>
            <p className="eyebrow">Already a Kinexis website customer?</p>
            <h2>Connect may be included with your plan.</h2>
          </div>
          <div className="included-plans__options">
            {includedPlans.map((plan) => (
              <article key={plan.name}>
                <div>
                  <strong>{plan.name}</strong>
                  <span>{plan.features}</span>
                </div>
                <button
                  onClick={() => subscribe(plan.plan)}
                  disabled={loading === plan.plan}
                >
                  {loading === plan.plan
                    ? "Checking…"
                    : "Activate included access"}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
