"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Member = { id: string; user_id: string; role: string; full_name: string };
type Invitation = { id: string; email: string; role: string; expires_at: string };

export function TeamManager({ businessId }: { businessId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { const response = await fetch(`/api/team?business_id=${encodeURIComponent(businessId)}`); if (!response.ok) return; const data = await response.json(); setMembers(data.members); setInvitations(data.invitations); setCurrentUserId(data.current_user_id); setCurrentRole(data.current_role); }, [businessId]);
  useEffect(() => { load(); }, [load]);
  async function invite(event: FormEvent) { event.preventDefault(); setLoading(true); setMessage(""); const response = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, email, role }) }); const data = await response.json(); setLoading(false); setMessage(response.ok ? "Invitation sent." : data.error?.message ?? "Invitation failed."); if (response.ok) { setEmail(""); await load(); } }
  async function remove(payload: { invitation_id?: string; membership_id?: string }) { setMessage(""); const response = await fetch("/api/team", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, ...payload }) }); const data = await response.json(); setMessage(response.ok ? "Team access updated." : data.error?.message ?? "Update failed."); if (response.ok) await load(); }
  return <div className="team-manager"><div className="team-list">{members.map((member) => <div key={member.id}><span className="contact-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span><div><strong>{member.full_name}</strong><small>{member.role}</small></div>{currentRole === "owner" && member.user_id !== currentUserId && member.role !== "owner" ? <button type="button" onClick={() => remove({ membership_id: member.id })}>Remove</button> : null}</div>)}{invitations.map((invitation) => <div key={invitation.id}><span className="contact-avatar">@</span><div><strong>{invitation.email}</strong><small>Pending · {invitation.role}</small></div>{currentRole === "owner" ? <button type="button" onClick={() => remove({ invitation_id: invitation.id })}>Revoke</button> : null}</div>)}</div>{currentRole === "owner" ? <form onSubmit={invite} className="team-invite"><input type="email" placeholder="teammate@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} /><select value={role} onChange={(event) => setRole(event.target.value)}><option value="agent">Agent</option><option value="manager">Manager</option></select><button className="outline-button" disabled={loading}>{loading ? "Sending…" : "Invite"}</button></form> : null}{message ? <p className="team-message">{message}</p> : null}</div>;
}
