import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("Connect crawl metadata", () => {
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

  it("keeps the current five sitemap URLs and priorities", () => {
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
      {
        url: "https://connect.kinexisdigital.com/privacy",
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: "https://connect.kinexisdigital.com/terms",
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: "https://connect.kinexisdigital.com/sms-policy",
        changeFrequency: "yearly",
        priority: 0.3,
      },
    ]);
  });
});
