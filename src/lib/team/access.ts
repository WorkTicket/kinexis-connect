export const TEAM_SEAT_LIMITS: Record<string, number> = {
  starter: 1,
  lead_system: 1,
  professional: 3,
  plus: 3,
  premium: 10,
};

export function teamSeatLimit(plan: string): number {
  return TEAM_SEAT_LIMITS[plan] ?? 1;
}

export function hasAvailableTeamSeat(plan: string, members: number, pendingInvitations: number): boolean {
  return members + pendingInvitations < teamSeatLimit(plan);
}

export function canReadTeam(role?: string): boolean {
  return role === "owner" || role === "manager";
}

export function canManageTeam(role?: string): boolean {
  return role === "owner";
}
