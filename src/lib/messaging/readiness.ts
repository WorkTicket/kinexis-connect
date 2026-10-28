type MessagingReadinessInput = {
  providerConfigured: boolean;
  subscriptionStatus?: string | null;
  consentReviewStatus?: string | null;
  smsEnabled?: boolean | null;
  registrationStatus?: string | null;
};

export function isMessagingReady(input: MessagingReadinessInput): boolean {
  return input.providerConfigured
    && ["active", "trialing"].includes(input.subscriptionStatus ?? "")
    && input.consentReviewStatus === "approved"
    && input.smsEnabled === true
    && input.registrationStatus === "approved";
}
