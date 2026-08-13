import { FilePlus2, LockKeyhole, PenLine } from "lucide-react";
import type { AuthSession, NoteDraft } from "../types";

type NoteForgeProps = {
  session: AuthSession | null;
  draft: NoteDraft;
  setDraft: (draft: NoteDraft) => void;
  onSeal: () => void;
  busy: boolean;
};

export function NoteForge({ session, draft, setDraft, onSeal, busy }: NoteForgeProps) {
  const actionLabel =
    session?.role === "guest" ? "Seal Sandbox Note" : session?.role === "moderator" ? "Request Publish" : "Publish Note";
  const helperText =
    session?.role === "guest"
      ? "Guest notes are temporary and reset with the browser session."
      : session?.role === "moderator"
        ? "Moderator notes become admin approval requests."
        : "Admin notes publish directly into the local archive ledger.";

  return (
    <section className="note-forge" aria-label="Encrypted note forge">
      <header>
        <h2>Folder & Key Forge</h2>
        <p>{helperText}</p>
      </header>
      <label>
        <FilePlus2 size={15} />
        File
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          placeholder="NOTE_NAME.txt.enc"
        />
      </label>
      <label>
        <LockKeyhole size={15} />
        Password
        <input
          value={draft.passphrase}
          onChange={(event) => setDraft({ ...draft, passphrase: event.target.value })}
          placeholder="Passphrase"
        />
      </label>
      <label>
        <PenLine size={15} />
        Folder
        <select value={draft.folder} onChange={(event) => setDraft({ ...draft, folder: event.target.value })}>
          <option>01_Research</option>
          <option>02_Artifacts/03_Keys</option>
          <option>03_Forbidden_Library/02_Constellations</option>
          <option>04_Archives_Obscura</option>
        </select>
      </label>
      <textarea
        value={draft.body}
        onChange={(event) => setDraft({ ...draft, body: event.target.value })}
        rows={4}
      />
      <button type="button" onClick={onSeal} disabled={busy || !session}>
        <LockKeyhole size={16} />
        {actionLabel}
      </button>
    </section>
  );
}
