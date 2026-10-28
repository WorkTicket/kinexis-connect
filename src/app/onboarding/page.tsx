"use client";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      if (!active) return;
      if (data.businesses?.length) {
        window.location.replace("/pricing");
        return;
      }
      setName(data.user?.business_name ?? "");
    });
    return () => { active = false; };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/onboarding/create-business", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, industry }) });
    const json = await res.json();
    if (res.ok) { setMsg("Business created. Choose your plan to continue."); window.location.href = "/pricing"; }
    else { setMsg(json.error?.message ?? "Failed"); }
    setLoading(false);
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-card__art">
          <Image src="/assets/connect/onboarding/business-setup.svg" alt="Business profile setup" width={480} height={360} priority />
          <p>Step 1 of 3</p>
          <h2>First, tell us about your business.</h2>
        </div>
        <div className="onboarding-card__form">
          <p className="eyebrow">Business setup</p>
          <h1>Create your business profile</h1>
          <p>We’ll use this information to personalize your Connect account.</p>
          <form onSubmit={submit} className="auth-form">
            <label>Business name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Industry <span className="field-hint">Optional</span><input value={industry} onChange={(e) => setIndustry(e.target.value)} /></label>
            {msg && <div className="auth-notice auth-notice--info">{msg}</div>}
            <button disabled={loading} className="brand-button">{loading ? "Creating…" : "Continue to plans"}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
