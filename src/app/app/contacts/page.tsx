import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, formatPhone } from "@/lib/format";

export default async function Contacts() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app/contacts");
  const membership = (await getUserBusinesses(user.id))[0];
  if (!membership) redirect("/onboarding");
  const { data: contacts } = await createSupabaseServiceClient().from("contacts").select("*").eq("business_id", membership.business_id).order("last_inbound_at", { ascending: false, nullsFirst: false }).limit(100);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Customers</p><h1>Contacts</h1><p>People who have called or messaged your Connect number.</p></div></header>{!contacts?.length ? <EmptyState illustration="contacts" title="Your contact list is ready" description="People who call or reply to your business will be added automatically." /> : <div className="contact-grid">{contacts.map((contact) => <article className="contact-card" key={contact.id}><div className="contact-avatar">{(contact.display_name || contact.phone_e164 || "?").slice(0, 1).toUpperCase()}</div><div><h2>{contact.display_name || formatPhone(contact.phone_e164)}</h2>{contact.display_name ? <p>{formatPhone(contact.phone_e164)}</p> : null}<span>Last inbound: {formatDateTime(contact.last_inbound_at)}</span></div>{contact.opt_out ? <span className="status-pill status-pill--failed">Opted out</span> : <span className="status-pill status-pill--active">Messaging allowed</span>}</article>)}</div>}</div>;
}
