"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { TeamManager } from "@/components/app/TeamManager";

type SettingsPayload = {
  business: { id: string; name: string; industry: string | null; timezone: string; status: string };
  settings: {
    forward_to_e164: string | null;
    forwarding_verified_at: string | null;
    ring_timeout_seconds: number;
    auto_reply_enabled: boolean;
    auto_reply_template: string;
    auto_reply_cooldown_hours: number;
    quiet_hours_enabled: boolean;
    quiet_start_local: string;
    quiet_end_local: string;
    after_hours_mode: "hold" | "skip";
    sms_consent_review_status: string;
  };
  phone: { e164: string; sms_registration_status: string } | null;
  notifications: { email_on_new_reply: boolean };
};

export default function Settings() {
  const [businessId, setBusinessId] = useState("");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const meResponse = await fetch("/api/me");
      if (!meResponse.ok) { setError("Your account could not be loaded."); return; }
      const me = await meResponse.json();
      const id = me.businesses?.[0]?.business_id;
      if (!id) { window.location.assign("/onboarding"); return; }
      setBusinessId(id);
      const response = await fetch(`/api/settings?business_id=${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok) { setError(payload.error?.message ?? "Settings could not be loaded."); return; }
      setData(payload);
    }
    load();
  }, []);

  function updateBusiness(field: "name" | "industry" | "timezone", value: string) {
    setData((current) => current ? { ...current, business: { ...current.business, [field]: value } } : current);
  }
  function updateSetting(field: keyof SettingsPayload["settings"], value: string | number | boolean) {
    setData((current) => current ? { ...current, settings: { ...current.settings, [field]: value } } : current);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true); setMessage(""); setError("");
    const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      business_id: businessId,
      business_name: data.business.name,
      industry: data.business.industry || null,
      timezone: data.business.timezone,
      forward_to_e164: data.settings.forward_to_e164 || null,
      ring_timeout_seconds: Number(data.settings.ring_timeout_seconds),
      auto_reply_enabled: data.settings.auto_reply_enabled,
      auto_reply_template: data.settings.auto_reply_template,
      auto_reply_cooldown_hours: Number(data.settings.auto_reply_cooldown_hours),
      quiet_hours_enabled: data.settings.quiet_hours_enabled,
      quiet_start_local: data.settings.quiet_start_local,
      quiet_end_local: data.settings.quiet_end_local,
      after_hours_mode: data.settings.after_hours_mode,
      email_on_new_reply: data.notifications.email_on_new_reply,
    }) });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) { setError(payload.error?.message ?? "Settings could not be saved."); return; }
    setMessage("Settings saved.");
  }

  if (error && !data) return <div className="dashboard-page"><h1>Settings</h1><div className="auth-notice auth-notice--error">{error}</div></div>;
  if (!data) return <div className="dashboard-page"><h1>Settings</h1><div className="settings-skeleton">Loading your business settings…</div></div>;

  const twilioReady = Boolean(data.phone && data.phone.sms_registration_status === "approved" && data.settings.sms_consent_review_status === "approved");
  return (
    <div className="dashboard-page">
      <header className="dashboard-heading"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>Manage business details, forwarding, automatic replies, and quiet hours.</p></div></header>
      {!twilioReady ? <section className="integration-banner"><Image src="/assets/connect/empty-states/setup-phone-number.svg" alt="" width={400} height={300} /><div><span>Twilio activation pending</span><h2>Messaging is safely disabled.</h2><p>You can finish configuring your account now. Calling and texting will remain off until a Connect number and approved messaging registration are attached.</p></div></section> : null}
      <form onSubmit={save} className="settings-form">
        {message ? <div className="auth-notice auth-notice--success">{message}</div> : null}{error ? <div className="auth-notice auth-notice--error">{error}</div> : null}
        <section className="settings-section"><div><h2>Business profile</h2><p>Basic information used throughout Connect.</p></div><div className="settings-fields"><label>Business name<input value={data.business.name} required onChange={(event) => updateBusiness("name", event.target.value)} /></label><label>Industry<input value={data.business.industry ?? ""} onChange={(event) => updateBusiness("industry", event.target.value)} /></label><label>Timezone<select value={data.business.timezone} onChange={(event) => updateBusiness("timezone", event.target.value)}><option value="America/New_York">Eastern Time</option><option value="America/Chicago">Central Time</option><option value="America/Denver">Mountain Time</option><option value="America/Los_Angeles">Pacific Time</option><option value="America/Phoenix">Arizona</option><option value="Pacific/Honolulu">Hawaii</option></select></label></div></section>
        <section className="settings-section"><div><h2>Phone forwarding</h2><p>Where incoming calls should ring.</p></div><div className="settings-fields"><label>Connect number<input value={data.phone?.e164 ?? "Pending assignment"} disabled /></label><label>Forward calls to<input placeholder="+15551234567" value={data.settings.forward_to_e164 ?? ""} onChange={(event) => updateSetting("forward_to_e164", event.target.value)} /><span className="field-hint">Use E.164 format, including +1 for US numbers.</span></label><label>Ring time<select value={data.settings.ring_timeout_seconds} onChange={(event) => updateSetting("ring_timeout_seconds", Number(event.target.value))}><option value={15}>15 seconds</option><option value={20}>20 seconds</option><option value={25}>25 seconds</option><option value={30}>30 seconds</option><option value={35}>35 seconds</option><option value={40}>40 seconds</option></select></label></div></section>
        <section className="settings-section"><div><h2>Automatic reply</h2><p>Prepared now; activated after Twilio approval.</p></div><div className="settings-fields"><label className="toggle-field"><input type="checkbox" checked={data.settings.auto_reply_enabled} onChange={(event) => updateSetting("auto_reply_enabled", event.target.checked)} /><span><strong>Enable missed-call reply</strong><small>Messages remain blocked until activation requirements pass.</small></span></label><label className="settings-fields__wide">Message template<textarea rows={5} maxLength={320} value={data.settings.auto_reply_template} onChange={(event) => updateSetting("auto_reply_template", event.target.value)} /><span className="field-hint">Use {"{business_name}"} to insert your business name. {data.settings.auto_reply_template.length}/320</span></label><label>Cooldown<select value={data.settings.auto_reply_cooldown_hours} onChange={(event) => updateSetting("auto_reply_cooldown_hours", Number(event.target.value))}><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>72 hours</option><option value={168}>7 days</option></select></label></div></section>
        <section className="settings-section"><div><h2>Quiet hours</h2><p>Control automatic messages outside business hours.</p></div><div className="settings-fields"><label className="toggle-field"><input type="checkbox" checked={data.settings.quiet_hours_enabled} onChange={(event) => updateSetting("quiet_hours_enabled", event.target.checked)} /><span><strong>Respect quiet hours</strong><small>Uses the business timezone above.</small></span></label><label>Start<input type="time" value={data.settings.quiet_start_local.slice(0, 5)} onChange={(event) => updateSetting("quiet_start_local", event.target.value)} /></label><label>End<input type="time" value={data.settings.quiet_end_local.slice(0, 5)} onChange={(event) => updateSetting("quiet_end_local", event.target.value)} /></label><label>After-hours behavior<select value={data.settings.after_hours_mode} onChange={(event) => updateSetting("after_hours_mode", event.target.value)}><option value="skip">Skip the automatic reply</option><option value="hold">Hold until quiet hours end</option></select></label></div></section>
        <section className="settings-section"><div><h2>Notifications</h2><p>Choose when Connect should email you.</p></div><div className="settings-fields"><label className="toggle-field"><input type="checkbox" checked={data.notifications.email_on_new_reply} onChange={(event) => setData((current) => current ? { ...current, notifications: { email_on_new_reply: event.target.checked } } : current)} /><span><strong>Email me when a customer replies</strong><small>Delivery requires the production email provider to be configured.</small></span></label></div></section>
        <section className="settings-section"><div><h2>Team</h2><p>Invite teammates within your plan’s seat limit.</p></div><TeamManager businessId={businessId} /></section>
        <div className="settings-actions"><button className="brand-button" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></div>
      </form>
    </div>
  );
}
