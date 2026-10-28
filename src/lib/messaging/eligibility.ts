import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function hasServiceConsent(businessId: string, contactId: string): Promise<boolean> {
  const svc = createSupabaseServiceClient();
  const { data } = await svc
    .from("consent_events")
    .select("status")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("consent_type", "service_sms")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.status === "granted";
}

export function renderTemplate(template: string, businessName: string): string {
  const safe = businessName.replace(/[<>]/g, "");
  return template.replace(/\{business_name\}/g, safe);
}

export function inQuietHours(tz: string, now: Date, start: string, end: string): boolean {
  // simple local hour check
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = fmt.formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const mins = h * 60 + m;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s > e) return mins >= s || mins < e;
  return mins >= s && mins < e;
}
