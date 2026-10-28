type MessagingReadinessInput = {
  providerConfigured: boolean;
  subscriptionStatus?: string | null;
  consentReviewStatus?: string | null;
  smsEnabled?: boolean | null;
  registrationStatus?: string | null;
  entitlementActive?: boolean | null;
};

export function isMessagingReady(input: MessagingReadinessInput): boolean {
  return input.providerConfigured
    && (["active", "trialing"].includes(input.subscriptionStatus ?? "") || input.entitlementActive === true)
    && input.consentReviewStatus === "approved"
    && input.smsEnabled === true
    && input.registrationStatus === "approved";
}
