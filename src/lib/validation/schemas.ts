import { z } from "zod";

export const E164 = z.string().regex(/^\+[1-9]\d{1,14}$/);
const localTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, "Invalid local time");

export const planSchema = z.enum(["starter", "professional", "premium", "lead_system", "plus"]);

export const settingsPatchSchema = z.object({
  business_name: z.string().min(1).max(120).optional(),
  industry: z.string().max(120).nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
  forward_to_e164: E164.nullable().optional(),
  ring_timeout_seconds: z.number().int().min(10).max(40).optional(),
  auto_reply_enabled: z.boolean().optional(),
  auto_reply_template: z.string().min(1).max(320).optional(),
  auto_reply_cooldown_hours: z.number().int().min(1).max(168).optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_start_local: localTime.optional(),
  quiet_end_local: localTime.optional(),
  after_hours_mode: z.enum(["hold", "skip"]).optional(),
  email_on_new_reply: z.boolean().optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(1000),
});

export const conversationPatchSchema = z.object({
  status: z.enum(["open", "resolved"]).optional(),
  assigned_user_id: z.string().uuid().nullable().optional(),
});

export const checkoutSchema = z.object({
  plan: planSchema,
});

export const passwordResetSchema = z.object({
  password: z.string().min(8).max(128),
});
