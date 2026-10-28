"use client";

import { useState } from "react";

export function EntitlementControl({ businessId }: { businessId: string }) {
  const [plan, setPlan] = useState<"lead_system" | "plus">("lead_system");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function update(active: boolean) {
    setLoading(true); setMessage("");
    const response = await fetch("/api/admin/entitlements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, plan, active }) });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? (active ? "Granted" : "Revoked") : data.error?.message ?? "Failed");
  }
  return <div className="entitlement-control"><select aria-label="Included plan" value={plan} onChange={(event) => setPlan(event.target.value as "lead_system" | "plus")}><option value="lead_system">Lead System</option><option value="plus">Plus</option></select><button disabled={loading} onClick={() => update(true)}>Grant</button><button disabled={loading} onClick={() => update(false)}>Revoke</button>{message ? <small>{message}</small> : null}</div>;
}
