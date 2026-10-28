import { redirect } from "next/navigation";
import { BillingClient } from "@/components/app/BillingClient";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";

export default async function Billing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app/billing");
  const membership = (await getUserBusinesses(user.id))[0];
  if (!membership) redirect("/onboarding");
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Subscription</p><h1>Billing</h1><p>Review your plan and manage PayPal billing.</p></div></header><BillingClient businessId={membership.business_id} /></div>;
}
