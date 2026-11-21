import type { Metadata } from "next";

export const CONNECT_SITE_URL = "https://connect.kinexisdigital.com";
export const CONNECT_METADATA_BASE = new URL(CONNECT_SITE_URL);

export const homePageMetadata: Metadata = {
  title: {
    absolute: "Missed-Call Text-Back for Service Businesses | KINEXIS Connect",
  },
  description:
    "Automatically text customers after unanswered calls, manage two-way replies in one inbox, and track recovered leads with KINEXIS Connect for service businesses.",
  alternates: {
    canonical: `${CONNECT_SITE_URL}/`,
  },
};

export const pricingPageMetadata: Metadata = {
  title: {
    absolute: "Pricing | KINEXIS Connect",
  },
  description:
    "Compare KINEXIS Connect monthly plans for missed-call follow-up, two-way customer conversations, team inbox tools, and lead analytics.",
  alternates: {
    canonical: `${CONNECT_SITE_URL}/pricing`,
  },
};
