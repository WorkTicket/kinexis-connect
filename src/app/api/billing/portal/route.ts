import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/membership";
import { paypalAccountUrl } from "@/lib/billing/paypal";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  return NextResponse.json({ url: paypalAccountUrl() });
}
