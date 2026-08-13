import { FormEvent, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { ARCHIVIST_CREDENTIALS, roleLabel } from "../auth";
import type { AuthSession, ChangeRequest, ChangeRequestPayload, ChatMessage } from "../types";

type ArchivistPanelProps = {
  session: AuthSession | null;
  changeRequests: ChangeRequest[];
  chatMessages: ChatMessage[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onRequestChange: (title: string, summary: string, payload: ChangeRequestPayload) => void;
  onSendChatMessage: (body: string) => void;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusIcon(status: ChangeRequest["status"]) {
  if (status === "approved") {
    return <CheckCircle2 size={15} />;
  }
  if (status === "rejected") {
    return <XCircle size={15} />;
  }
  return <Clock3 size={15} />;
}

export function ArchivistPanel({
  session,
  changeRequests,
  chatMessages,
  onApproveRequest,
  onRejectRequest,
  onRequestChange,
  onSendChatMessage,
}: ArchivistPanelProps) {
  const [requestTitle, setRequestTitle] = useState("Curatorial update");
  const [requestSummary, setRequestSummary] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const pendingRequests = useMemo(() => changeRequests.filter((request) => request.status === "pending"), [changeRequests]);
  const canModerate = session?.role === "admin";
  const canRequest = session?.role === "moderator";
  const canChat = session?.role === "admin" || session?.role === "moderator";
  const canViewCredentialPasswords = session?.role === "admin";

  function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!canRequest || !requestTitle.trim() || !requestSummary.trim()) {
      return;
    }
    onRequestChange(requestTitle.trim(), requestSummary.trim(), {
      type: "manual",
    });
    setRequestTitle("Curatorial update");
    setRequestSummary("");
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    if (!canChat || !chatDraft.trim()) {
      return;
    }
    onSendChatMessage(chatDraft.trim());
    setChatDraft("");
  }

  return (
    <section className="archivist-panel" aria-label="Archivist control room">
      <header className="archivist-header">
        <div>
          <h3>Archivist Control</h3>
          <p>{session ? `${session.username} / ${roleLabel(session.role)}` : "No active session"}</p>
        </div>
        {session?.role === "admin" ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
      </header>

      <div className="permission-grid">
        <div>
          <span>Guest View</span>
          <strong>Browse + sandbox only</strong>
          <p>Session experiments reset when the browser session ends. File-system writes are blocked.</p>
        </div>
        <div>
          <span>Moderators</span>
          <strong>Request changes</strong>
          <p>Archivist_X and Archivist_Y can prepare changes, then submit them for Admin approval.</p>
        </div>
        <div>
          <span>Admin</span>
          <strong>Publish control</strong>
          <p>Archivist_Z can publish directly, approve requests, reject requests, and export archive payloads.</p>
        </div>
      </div>

      <div
        className={canViewCredentialPasswords ? "credential-table revealed" : "credential-table masked"}
        aria-label="Archivist accounts"
      >
        {ARCHIVIST_CREDENTIALS.map((credential) => (
          <div key={credential.username}>
            <UserRound size={15} />
            <strong>{credential.username}</strong>
            <span>{credential.title}</span>
            <code>{canViewCredentialPasswords ? credential.password : "ADMIN ONLY"}</code>
          </div>
        ))}
      </div>

      <section className="request-desk" aria-label="Publish and accept change requests">
        <header>
          <h4>Publish / Accept Change Requests</h4>
          <span>{pendingRequests.length} pending</span>
        </header>

        {canRequest ? (
          <form className="request-form" onSubmit={submitRequest}>
            <input value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} placeholder="Request title" />
            <textarea
              value={requestSummary}
              onChange={(event) => setRequestSummary(event.target.value)}
              rows={3}
              placeholder="Describe what should be published or changed..."
            />
            <button type="submit" disabled={!requestTitle.trim() || !requestSummary.trim()}>
              <Send size={15} />
              Submit Request
            </button>
          </form>
        ) : null}

        <div className="request-list">
          {changeRequests.length ? (
            changeRequests.map((request) => (
              <article className={`request-card ${request.status}`} key={request.id}>
                <header>
                  <strong>{request.title}</strong>
                  <span>
                    {statusIcon(request.status)}
                    {request.status}
                  </span>
                </header>
                <p>{request.summary}</p>
                <footer>
                  <span>
                    {request.requester} / {formatTime(request.createdAt)}
                  </span>
                  {request.resolver ? <em>{request.resolver}</em> : null}
                </footer>
                {canModerate && request.status === "pending" ? (
                  <div className="request-actions">
                    <button type="button" onClick={() => onApproveRequest(request.id)}>
                      <CheckCircle2 size={15} />
                      Approve
                    </button>
                    <button type="button" onClick={() => onRejectRequest(request.id)}>
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="empty-archive-copy">No change requests yet.</p>
          )}
        </div>
      </section>

      <section className="live-comments" aria-label="Archivist live comments">
        <header>
          <h4>
            <MessageSquareText size={16} />
            Live Comments
          </h4>
          <span>{canChat ? "open" : "read only"}</span>
        </header>
        <div className="comment-stream">
          {chatMessages.map((message) => (
            <article className={message.role} key={message.id}>
              <header>
                <strong>{message.author}</strong>
                <span>
                  {message.role === "system" ? "SYSTEM" : roleLabel(message.role)} / {formatTime(message.createdAt)}
                </span>
              </header>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
        <form className="comment-form" onSubmit={submitChat}>
          <input
            value={chatDraft}
            onChange={(event) => setChatDraft(event.target.value)}
            placeholder={canChat ? "Send live feedback..." : "Guest View can read comments only"}
            disabled={!canChat}
          />
          <button type="submit" disabled={!canChat || !chatDraft.trim()}>
            <Send size={15} />
          </button>
        </form>
      </section>
    </section>
  );
}
