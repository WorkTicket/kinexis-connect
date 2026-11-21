import type { MetadataRoute } from "next";

const SITE_URL = "https://connect.kinexisdigital.com";

export default function robots(): MetadataRoute.Robots {
  return {
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
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
