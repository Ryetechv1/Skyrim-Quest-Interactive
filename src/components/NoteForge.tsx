import { FilePlus2, LockKeyhole, PenLine } from "lucide-react";
import type { AuthSession, EncryptedFolder, NoteDraft } from "../types";

const VAULT_ROOT = "Archive: MASK_OF_DESPAIR.mega/";
const DEFAULT_FOLDER_OPTIONS = [
  "00_Lore",
  "00_Lore/01_Storyline",
  "01_Research",
  "02_Artifacts/03_Keys",
  "03_Forbidden_Library/02_Constellations",
  "04_Archives_Obscura",
];

type NoteForgeProps = {
  session: AuthSession | null;
  draft: NoteDraft;
  folders: EncryptedFolder[];
  setDraft: (draft: NoteDraft) => void;
  onSeal: () => void;
  busy: boolean;
};

function folderOptionFromPath(path: string) {
  return path.startsWith(VAULT_ROOT) ? path.slice(VAULT_ROOT.length) : path;
}

export function NoteForge({ session, draft, folders, setDraft, onSeal, busy }: NoteForgeProps) {
  const actionLabel =
    session?.role === "guest" ? "Seal Sandbox Note" : session?.role === "moderator" ? "Request Publish" : "Publish Note";
  const helperText =
    session?.role === "guest"
      ? "Guest notes are temporary and reset with the browser session."
      : session?.role === "moderator"
        ? "Moderator notes become admin approval requests."
        : "Admin notes publish directly into the local archive ledger.";
  const folderOptions = Array.from(
    new Set([...DEFAULT_FOLDER_OPTIONS, ...folders.map((folder) => folderOptionFromPath(folder.path))]),
  ).filter(Boolean);

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
          {folderOptions.map((folder) => (
            <option key={folder}>{folder}</option>
          ))}
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
