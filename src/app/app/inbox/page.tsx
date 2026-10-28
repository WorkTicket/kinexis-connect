import { redirect } from "next/navigation";
import { InboxClient } from "@/components/app/InboxClient";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { isMessagingReady } from "@/lib/messaging/readiness";

export default async function Inbox() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app/inbox");
  const membership = (await getUserBusinesses(user.id))[0];
  if (!membership) redirect("/onboarding");
  const svc = createSupabaseServiceClient();
  const [{ data: subscription }, { data: entitlement }, { data: settings }, { data: phone }] = await Promise.all([
    svc.from("subscriptions").select("status").eq("business_id", membership.business_id).maybeSingle(),
    svc.from("included_entitlements").select("active").eq("business_id", membership.business_id).eq("active", true).maybeSingle(),
    svc.from("business_settings").select("sms_consent_review_status").eq("business_id", membership.business_id).maybeSingle(),
    svc.from("phone_numbers").select("sms_enabled,sms_registration_status").eq("business_id", membership.business_id).eq("provider", "telnyx").maybeSingle(),
  ]);
  const providerConfigured = Boolean(process.env.TELNYX_API_KEY && process.env.TELNYX_PUBLIC_KEY && process.env.TELNYX_MESSAGING_PROFILE_ID);
  const messagingReady = isMessagingReady({ providerConfigured, subscriptionStatus: subscription?.status, entitlementActive: entitlement?.active, consentReviewStatus: settings?.sms_consent_review_status, smsEnabled: phone?.sms_enabled, registrationStatus: phone?.sms_registration_status });
  return <div className="dashboard-page dashboard-page--inbox"><header className="dashboard-heading"><div><p className="eyebrow">Conversations</p><h1>Inbox</h1><p>Continue customer conversations from one place.</p></div></header><InboxClient businessId={membership.business_id} messagingReady={messagingReady} /></div>;
}
