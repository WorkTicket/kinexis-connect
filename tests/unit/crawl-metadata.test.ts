import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as homePageMetadata } from "@/app/(marketing)/page";
import { metadata as pricingPageMetadata } from "@/app/(marketing)/pricing/page";
import { CONNECT_METADATA_BASE, CONNECT_SITE_URL } from "@/lib/seo-metadata";

describe("Connect crawl metadata", () => {
  it("pins the live home and pricing SEO metadata to the production origin", () => {
    expect(CONNECT_SITE_URL).toBe("https://connect.kinexisdigital.com");
    expect(CONNECT_METADATA_BASE.toString()).toBe(
      "https://connect.kinexisdigital.com/",
    );
    expect(homePageMetadata).toMatchObject({
      title: {
        absolute:
          "Missed-Call Text-Back for Service Businesses | KINEXIS Connect",
      },
      description:
        "Automatically text customers after unanswered calls, manage two-way replies in one inbox, and track recovered leads with KINEXIS Connect for service businesses.",
      alternates: { canonical: "https://connect.kinexisdigital.com/" },
    });
    expect(pricingPageMetadata).toMatchObject({
      title: { absolute: "Pricing | KINEXIS Connect" },
      description:
        "Compare KINEXIS Connect monthly plans for missed-call follow-up, two-way customer conversations, team inbox tools, and lead analytics.",
      alternates: { canonical: "https://connect.kinexisdigital.com/pricing" },
    });
  });

  it("preserves the live robots policy and sitemap location", () => {
    const result = robots();
    expect(result).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app",
          "/admin",
          "/app/",
          "/admin/",
          "/onboarding",
          "/onboarding/",
          "/auth/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/billing/",
          "/api/",
        ],
      },
      host: "https://connect.kinexisdigital.com",
      sitemap: "https://connect.kinexisdigital.com/sitemap.xml",
    });
  });

  it("keeps only indexable marketing URLs in the sitemap", () => {
    expect(sitemap()).toEqual([
      {
        url: "https://connect.kinexisdigital.com",
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: "https://connect.kinexisdigital.com/pricing",
        changeFrequency: "monthly",
        priority: 0.8,
      },
    ]);
  });
});
