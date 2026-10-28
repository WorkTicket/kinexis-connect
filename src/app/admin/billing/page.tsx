import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, titleCase } from "@/lib/format";

export default async function AdminBilling() {
  const { data } = await createSupabaseServiceClient().from("subscriptions").select("*, businesses(name)").order("updated_at", { ascending: false }).limit(100);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Revenue operations</p><h1>Subscriptions</h1><p>PayPal and included-plan subscription states.</p></div></header><div className="table-card"><table><thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Provider ID</th><th>Last verified</th></tr></thead><tbody>{(data ?? []).map((subscription) => <tr key={subscription.id}><td>{Array.isArray(subscription.businesses) ? subscription.businesses[0]?.name : subscription.businesses?.name}</td><td>{titleCase(subscription.plan)}</td><td><span className={`status-pill status-pill--${subscription.status}`}>{titleCase(subscription.status)}</span></td><td>{subscription.paypal_subscription_id ?? "Included / pending"}</td><td>{formatDateTime(subscription.last_verified_at)}</td></tr>)}</tbody></table></div></div>;
}
