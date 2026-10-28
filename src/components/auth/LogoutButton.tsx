"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await createSupabaseBrowserClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <button type="button" className="app-signout" onClick={signOut} disabled={loading}>
      <LogOut size={16} /> {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
