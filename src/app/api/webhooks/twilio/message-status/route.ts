import { NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/security/twilio";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function POST(req: Request) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/twilio/message-status";
  if (!(await verifyTwilioSignature(authToken, signature, publicUrl, params))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (params.AccountSid !== process.env.TWILIO_ACCOUNT_SID) return new NextResponse("Forbidden", { status: 403 });

  const sid = params.MessageSid;
  const status = params.MessageStatus;
  if (!sid) return new NextResponse("Bad Request", { status: 400 });

  const svc = createSupabaseServiceClient();
  const { data: msg } = await svc.from("messages").select("id,status").eq("twilio_message_sid", sid).maybeSingle();
  if (!msg) return new NextResponse("OK", { status: 200 });

  // allowed transitions: don't regress delivered->sent
  const rank: Record<string, number> = { queued: 0, sending: 1, sent: 2, delivered: 3, undelivered: 4, failed: 4, received: 5, blocked: 6 };
  const current = rank[msg.status] ?? 0;
  const incoming = rank[status] ?? 0;
  if (status === "delivered" && msg.status === "delivered") {
    // noop
  } else if (incoming >= current || status === "failed" || status === "undelivered") {
    await svc.from("messages").update({ status, updated_at: new Date().toISOString() }).eq("id", msg.id);
  }
  return new NextResponse("OK", { status: 200 });
}
