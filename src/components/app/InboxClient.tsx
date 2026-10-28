"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, RefreshCw, Send } from "lucide-react";
import { formatDateTime, formatPhone } from "@/lib/format";

type Conversation = { id: string; status: "open" | "resolved"; last_message_at: string | null; contacts: { phone_e164: string; display_name: string | null } | null };
type Message = { id: string; direction: "inbound" | "outbound"; body: string; status: string; created_at: string };

export function InboxClient({ businessId, messagingReady }: { businessId: string; messagingReady: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/conversations?business_id=${encodeURIComponent(businessId)}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setError(data.error?.message ?? "Inbox could not be loaded."); return; }
    setConversations(data.conversations);
    setSelectedId((current) => current || data.conversations[0]?.id || "");
  }, [businessId]);
  async function loadMessages(id: string) {
    if (!id) { setMessages([]); return; }
    const response = await fetch(`/api/conversations/${id}/messages`);
    const data = await response.json();
    if (!response.ok) { setError(data.error?.message ?? "Messages could not be loaded."); return; }
    setMessages(data.messages);
  }
  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(selectedId); }, [selectedId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !body.trim() || !messagingReady) return;
    const response = await fetch(`/api/conversations/${selectedId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: body.trim() }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error?.message ?? "Message could not be queued."); return; }
    setBody("");
    await loadMessages(selectedId);
  }
  async function toggleResolved() {
    const conversation = conversations.find((item) => item.id === selectedId);
    if (!conversation) return;
    const status = conversation.status === "open" ? "resolved" : "open";
    const response = await fetch(`/api/conversations/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) setConversations((items) => items.map((item) => item.id === selectedId ? { ...item, status } : item));
  }
  const selected = conversations.find((item) => item.id === selectedId);

  if (loading) return <div className="settings-skeleton">Loading conversations…</div>;
  if (!conversations.length) return <section className="inbox-empty"><MessageSquareText size={44} /><h2>No conversations yet</h2><p>Customer replies will appear here after messaging is activated.</p></section>;
  return (
    <div className="inbox-shell">
      <aside className="conversation-list"><div className="conversation-list__heading"><strong>Conversations</strong><button onClick={loadConversations} aria-label="Refresh conversations"><RefreshCw size={16} /></button></div>{conversations.map((conversation) => <button key={conversation.id} className={selectedId === conversation.id ? "is-active" : ""} onClick={() => setSelectedId(conversation.id)}><span>{conversation.contacts?.display_name || formatPhone(conversation.contacts?.phone_e164)}</span><small>{formatDateTime(conversation.last_message_at)}</small>{conversation.status === "resolved" ? <em>Resolved</em> : null}</button>)}</aside>
      <section className="message-panel">
        <header><div><strong>{selected?.contacts?.display_name || formatPhone(selected?.contacts?.phone_e164)}</strong><span>{formatPhone(selected?.contacts?.phone_e164)}</span></div><button onClick={toggleResolved}><CheckCircle2 size={16} /> {selected?.status === "resolved" ? "Reopen" : "Resolve"}</button></header>
        {!messagingReady ? <div className="messaging-disabled">Telnyx activation is pending. Conversation history is available, but sending is disabled.</div> : null}
        {error ? <div className="auth-notice auth-notice--error">{error}</div> : null}
        <div className="message-thread">{messages.map((message) => <article key={message.id} className={`message-bubble message-bubble--${message.direction}`}><p>{message.body}</p><span>{formatDateTime(message.created_at)} · {message.status}</span></article>)}</div>
        <form onSubmit={send} className="message-composer"><textarea aria-label="Message" placeholder={messagingReady ? "Write a reply…" : "Messaging activation pending"} value={body} onChange={(event) => setBody(event.target.value)} disabled={!messagingReady} maxLength={1000} /><button disabled={!messagingReady || !body.trim()} aria-label="Send message"><Send size={18} /></button></form>
      </section>
    </div>
  );
}
