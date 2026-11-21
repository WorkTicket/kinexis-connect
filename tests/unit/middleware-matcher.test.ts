import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "@/middleware";

describe("authentication middleware matcher", () => {
  const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

  it("covers protected app, onboarding, and admin pages including nested routes", () => {
    for (const path of ["/app", "/app/inbox", "/onboarding", "/admin", "/admin/audit-logs"]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it("skips public marketing, auth, API, and webhook routes", () => {
    for (const path of ["/", "/pricing", "/login", "/signup", "/api/me", "/api/webhooks/paypal"]) {
      expect(matches(path), path).toBe(false);
    }
  });
});
