import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderLock,
  KeyRound,
  Lock,
  TerminalSquare,
  Unlock,
} from "lucide-react";
import type { CSSProperties } from "react";
import { manuscriptTabs } from "../data";
import type { AuthSession, ChangeRequest, ChangeRequestPayload, ChatMessage, SealedFile, TerminalEvent } from "../types";
import { ArchivistPanel } from "./ArchivistPanel";
import { MegaPanel } from "./MegaPanel";
import { PlacesPanel } from "./PlacesPanel";

type VaultPanelProps = {
  session: AuthSession | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  files: SealedFile[];
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
};

type TreeFolder = {
  name: string;
  children: Record<string, TreeFolder>;
  files: SealedFile[];
};

function makeTree(files: SealedFile[]) {
  const root: TreeFolder = { name: "Archive: MASK_OF_DESPAIR.mega", children: {}, files: [] };

  files.forEach((file) => {
    const [, ...segments] = file.path.split("/");
    const folderSegments = segments.length ? segments : ["00_Inbox"];
    let cursor = root;
    folderSegments.forEach((segment) => {
      cursor.children[segment] ??= { name: segment, children: {}, files: [] };
      cursor = cursor.children[segment];
    });
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
  const folders = Object.values(folder.children);

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
}: VaultPanelProps) {
  const selectedFile = files.find((file) => file.id === selectedFileId);
  const tree = makeTree(files);

  return (
    <section className="vault-panel">
      <header className="vault-header">
        <div>
          <h2>MEGA Vault</h2>
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
          <PlacesPanel session={session} />
        ) : activeTab === "vault" ? (
          <>
            <div className="vault-meta">
              <span>Vault Key</span>
              <strong>R3LIQU4RY-72</strong>
            </div>
            <div className="tree-wrap">
              <h3>Encrypted Folders</h3>
              <TreeView folder={tree} selectedFileId={selectedFileId} setSelectedFileId={setSelectedFileId} />
            </div>
          </>
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

        {activeTab !== "mega" && activeTab !== "archivists" && activeTab !== "places" ? (
          <>
            <article className="file-preview">
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
