import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  FolderLock,
  KeyRound,
  Lock,
  TerminalSquare,
  Unlock,
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { manuscriptTabs } from "../data";
import type {
  AuthSession,
  ChangeRequest,
  ChangeRequestPayload,
  ChatMessage,
  EncryptedFolder,
  SealedFile,
  TerminalEvent,
} from "../types";
import { ArchivistPanel } from "./ArchivistPanel";
import { BrokenPathPuzzle, type BrokenPathState } from "./BrokenPathPuzzle";
import { GuidePanel } from "./GuidePanel";
import { MegaPanel } from "./MegaPanel";
import { PlacesPanel } from "./PlacesPanel";

type VaultPanelProps = {
  session: AuthSession | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  files: SealedFile[];
  folders: EncryptedFolder[];
  selectedFileId: string;
  setSelectedFileId: (id: string) => void;
  terminalEvents: TerminalEvent[];
  knownKeys: string[];
  busy: boolean;
  changeRequests: ChangeRequest[];
  chatMessages: ChatMessage[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onRequestChange: (title: string, summary: string, payload: ChangeRequestPayload) => void;
  onSendChatMessage: (body: string) => void;
  onCreateEncryptedFolder: (folderPath: string) => void;
  brokenPathUnlocked: boolean;
  brokenPathState: BrokenPathState;
  onBrokenPathStateChange: (state: BrokenPathState) => void;
  onBrokenPathLog: (kind: TerminalEvent["kind"], text: string) => void;
};

type TreeFolder = {
  name: string;
  children: Record<string, TreeFolder>;
  files: SealedFile[];
};

function ensureTreePath(root: TreeFolder, path: string) {
  const [, ...segments] = path.split("/");
  const folderSegments = segments.map((segment) => segment.trim()).filter(Boolean);
  let cursor = root;

  folderSegments.forEach((segment) => {
    cursor.children[segment] ??= { name: segment, children: {}, files: [] };
    cursor = cursor.children[segment];
  });

  return cursor;
}

function makeTree(files: SealedFile[], folders: EncryptedFolder[]) {
  const root: TreeFolder = { name: "Archive: MASK_OF_DESPAIR.mega", children: {}, files: [] };

  folders.forEach((folder) => {
    ensureTreePath(root, folder.path);
  });

  files.forEach((file) => {
    const [, ...segments] = file.path.split("/");
    const cursor = ensureTreePath(root, segments.length ? file.path : "Archive: MASK_OF_DESPAIR.mega/00_Inbox");
    cursor.files.push(file);
  });

  return root;
}

function TreeView({
  folder,
  selectedFileId,
  setSelectedFileId,
  depth = 0,
}: {
  folder: TreeFolder;
  selectedFileId: string;
  setSelectedFileId: (id: string) => void;
  depth?: number;
}) {
  const folders = Object.values(folder.children).sort((first, second) => first.name.localeCompare(second.name));

  return (
    <div className="tree-node">
      {depth === 0 ? (
        <div className="folder-row root">
          <ChevronDown size={14} />
          <Folder size={16} />
          <span>{folder.name}</span>
        </div>
      ) : null}
      {folders.map((child) => (
        <div className="tree-branch" key={`${child.name}-${depth}`} style={{ "--depth": depth } as CSSProperties}>
          <div className="folder-row">
            <ChevronRight size={13} />
            {child.files.some((file) => file.locked && !file.decryptedText) ? (
              <FolderLock size={15} />
            ) : (
              <Folder size={15} />
            )}
            <span>{child.name}</span>
          </div>
          <TreeView
            folder={child}
            selectedFileId={selectedFileId}
            setSelectedFileId={setSelectedFileId}
            depth={depth + 1}
          />
        </div>
      ))}
      {folder.files.map((file) => (
        <button
          type="button"
          className={file.id === selectedFileId ? "file-row selected" : "file-row"}
          key={file.id}
          onClick={() => setSelectedFileId(file.id)}
          style={{ "--depth": depth } as CSSProperties}
        >
          <FileText size={14} />
          <span>{file.name}</span>
          {file.decryptedText ? <Unlock size={13} /> : <Lock size={13} />}
        </button>
      ))}
    </div>
  );
}

export function VaultPanel({
  session,
  activeTab,
  setActiveTab,
  files,
  folders,
  selectedFileId,
  setSelectedFileId,
  terminalEvents,
  knownKeys,
  busy,
  changeRequests,
  chatMessages,
  onApproveRequest,
  onRejectRequest,
  onRequestChange,
  onSendChatMessage,
  onCreateEncryptedFolder,
  brokenPathUnlocked,
  brokenPathState,
  onBrokenPathStateChange,
  onBrokenPathLog,
}: VaultPanelProps) {
  const [folderDraft, setFolderDraft] = useState("");
  const selectedFile = files.find((file) => file.id === selectedFileId);
  const tree = makeTree(files, folders);
  const canCreateFolder = session?.role === "admin";
  const isGuest = session?.role === "guest";
  const isOriginStoryRecord = selectedFile?.id === "lore-origin-premise" && Boolean(selectedFile.decryptedText);
  const noteFiles = useMemo(
    () =>
      files.filter(
        (file) =>
          file.path.includes("/00_Lore/") ||
          file.path.includes("/01_Research/01_Notes") ||
          file.id.startsWith("published-") ||
          file.id.startsWith("guest-"),
      ).sort((first, second) => {
        if (first.id === "lore-origin-premise") return -1;
        if (second.id === "lore-origin-premise") return 1;
        return first.name.localeCompare(second.name);
      }),
    [files],
  );

  useEffect(() => {
    if (activeTab === "notes" && noteFiles.length && !noteFiles.some((file) => file.id === selectedFileId)) {
      setSelectedFileId(noteFiles[0].id);
    }
  }, [activeTab, noteFiles, selectedFileId, setSelectedFileId]);

  function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderDraft.trim()) {
      return;
    }
    onCreateEncryptedFolder(folderDraft);
    setFolderDraft("");
  }

  return (
    <section className="vault-panel">
      <header className="vault-header">
        <div>
          <h2>The Reliquary</h2>
          <p>Vault status: {busy ? "decrypting" : "secure"}</p>
        </div>
        <Lock size={22} />
      </header>

      <div className="vault-tabs" role="tablist" aria-label="Vault workspaces">
        {manuscriptTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="vault-surface">
        {activeTab === "mega" ? (
          <MegaPanel session={session} onRequestChange={onRequestChange} />
        ) : activeTab === "archivists" ? (
          <ArchivistPanel
            session={session}
            changeRequests={changeRequests}
            chatMessages={chatMessages}
            onApproveRequest={onApproveRequest}
            onRejectRequest={onRejectRequest}
            onRequestChange={onRequestChange}
            onSendChatMessage={onSendChatMessage}
          />
        ) : activeTab === "places" ? (
          <PlacesPanel />
        ) : activeTab === "guides" ? (
          <GuidePanel session={session} />
        ) : activeTab === "cipher" ? (
          <BrokenPathPuzzle
            unlocked={brokenPathUnlocked}
            state={brokenPathState}
            onStateChange={onBrokenPathStateChange}
            onLog={onBrokenPathLog}
          />
        ) : activeTab === "vault" ? (
          <>
            <div className="vault-meta">
              <span>Vault Key</span>
              <strong>R3LIQU4RY-72</strong>
            </div>
            <div className="tree-wrap">
              <div className="tree-heading">
                <h3>Encrypted Folders</h3>
                <span>{folders.length} branch{folders.length === 1 ? "" : "es"} indexed</span>
              </div>
              {canCreateFolder ? (
                <form className="folder-branch-forge" onSubmit={handleCreateFolder}>
                  <label>
                    <FolderPlus size={15} />
                    <span>Branch</span>
                    <input
                      value={folderDraft}
                      onChange={(event) => setFolderDraft(event.target.value)}
                      placeholder="05_New_Vault/01_Encrypted_Branch"
                    />
                  </label>
                  <button type="submit" disabled={!folderDraft.trim()}>
                    <FolderPlus size={15} />
                    Create
                  </button>
                </form>
              ) : isGuest ? (
                <div className="folder-branch-readonly">
                  Guest View can browse encrypted branches, but new Vault branches require Archivist_Z.
                </div>
              ) : null}
              <TreeView folder={tree} selectedFileId={selectedFileId} setSelectedFileId={setSelectedFileId} />
            </div>
          </>
        ) : activeTab === "notes" ? (
          <div className="key-ledger note-ledger">
            <h3>Manuscript Notes</h3>
            {noteFiles.length ? (
              noteFiles.map((file) => (
                <button
                  type="button"
                  className={file.id === selectedFileId ? "ledger-row note-ledger-row selected" : "ledger-row note-ledger-row"}
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                >
                  <FileText size={15} />
                  <span>{file.name}</span>
                  <strong>{file.decryptedText ? "opened" : "sealed"}</strong>
                </button>
              ))
            ) : (
              <p>No storyline record has awakened yet. Complete The Story Begins to write the first lore note.</p>
            )}
            <p>Unlocked storyline records and published Archivist notes collect here.</p>
          </div>
        ) : (
          <div className="key-ledger">
            <h3>{activeTab === "keys" ? "Encryption Keys" : "Manuscript Notes"}</h3>
            {knownKeys.map((key) => (
              <div className="ledger-row" key={key}>
                <KeyRound size={15} />
                <span>{key}</span>
                <strong>accepted</strong>
              </div>
            ))}
            <p>
              {activeTab === "cipher"
                ? "The red needles compare the alphabet, symbol, and glyph rings against the reliquary diagram."
                : "Recovered passwords are staged here so the next encrypted document can be opened quickly."}
            </p>
          </div>
        )}

        {activeTab !== "mega" &&
        activeTab !== "archivists" &&
        activeTab !== "places" &&
        activeTab !== "guides" &&
        activeTab !== "cipher" ? (
          <>
            <article className={isOriginStoryRecord ? "file-preview origin-story-preview" : "file-preview"}>
              <header>
                <span>File Preview</span>
                <strong>{selectedFile?.path.split("/").slice(-2).join("/") ?? "Indexing..."}</strong>
              </header>
              {selectedFile ? (
                <>
                  <div className="file-meta">
                    <span>File</span>
                    <strong>{selectedFile.name}</strong>
                    <em>{selectedFile.size}</em>
                  </div>
                  <p className="file-clue">{selectedFile.clue}</p>
                  <pre>
                    {selectedFile.decryptedText ??
                      `${selectedFile.cipherText.slice(0, 72)}\n${selectedFile.cipherText.slice(72, 144)}\n\nAES-GCM sealed. Supply ${selectedFile.keyLabel}.`}
                  </pre>
                </>
              ) : (
                <p className="file-clue">Archive encryption pass is still initializing.</p>
              )}
            </article>

            <section className="terminal-log" aria-label="Terminal log">
              <h3>
                <TerminalSquare size={16} />
                Terminal Log
              </h3>
              {terminalEvents.map((terminalEvent) => (
                <p className={terminalEvent.kind} key={terminalEvent.id}>
                  <span>&gt;</span>
                  {terminalEvent.text}
                </p>
              ))}
              <i />
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
