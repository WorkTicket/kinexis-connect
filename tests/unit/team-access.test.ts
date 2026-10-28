import { describe, expect, it } from "vitest";
import { canManageTeam, canReadTeam, hasAvailableTeamSeat, teamSeatLimit } from "@/lib/team/access";

describe("team access and seat limits", () => {
  it("uses plan-specific seat limits", () => {
    expect(teamSeatLimit("starter")).toBe(1);
    expect(teamSeatLimit("professional")).toBe(3);
    expect(teamSeatLimit("premium")).toBe(10);
  });

  it("counts pending invitations against available seats", () => {
    expect(hasAvailableTeamSeat("professional", 1, 1)).toBe(true);
    expect(hasAvailableTeamSeat("professional", 2, 1)).toBe(false);
  });

  it("allows managers to read but only owners to manage", () => {
    expect(canReadTeam("manager")).toBe(true);
    expect(canManageTeam("manager")).toBe(false);
    expect(canManageTeam("owner")).toBe(true);
    expect(canReadTeam("agent")).toBe(false);
  });
});
