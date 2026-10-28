import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, titleCase } from "@/lib/format";
import { EntitlementControl } from "@/components/admin/EntitlementControl";

export default async function AdminBusinesses() {
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("businesses").select("*, subscriptions(plan,status), phone_numbers(e164,sms_registration_status)").order("created_at", { ascending: false }).limit(100);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Tenants</p><h1>Businesses</h1><p>Accounts, subscriptions, and activation state.</p></div></header><div className="table-card"><table><thead><tr><th>Business</th><th>Status</th><th>Plan</th><th>Connect number</th><th>Created</th><th>Included access</th></tr></thead><tbody>{(data ?? []).map((business) => { const subscription = Array.isArray(business.subscriptions) ? business.subscriptions[0] : business.subscriptions; const phone = Array.isArray(business.phone_numbers) ? business.phone_numbers[0] : business.phone_numbers; return <tr key={business.id}><td><strong>{business.name}</strong><small>{business.industry || "No industry"}</small></td><td><span className={`status-pill status-pill--${business.status}`}>{titleCase(business.status)}</span></td><td>{subscription ? <>{titleCase(subscription.plan)}<small>{titleCase(subscription.status)}</small></> : "—"}</td><td>{phone?.e164 ?? "Pending"}</td><td>{formatDateTime(business.created_at)}</td><td><EntitlementControl businessId={business.id} /></td></tr>; })}</tbody></table></div></div>;
}
