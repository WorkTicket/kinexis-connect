import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/paths";

describe("safeNextPath", () => {
  it("allows local application paths", () => {
    expect(safeNextPath("/app/inbox?filter=open")).toBe("/app/inbox?filter=open");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeNextPath("https://example.com")).toBe("/app");
    expect(safeNextPath("//example.com")).toBe("/app");
  });

  it("uses the requested fallback when no path is provided", () => {
    expect(safeNextPath(null, "/onboarding")).toBe("/onboarding");
  });
});
