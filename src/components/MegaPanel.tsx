import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Cloud,
  Copy,
  Download,
  File,
  Folder,
  FolderPlus,
  Link,
  Loader2,
  LogOut,
  RefreshCcw,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import {
  closeMega,
  createMegaFolder,
  deleteMegaNode,
  downloadMegaFile,
  getMegaAccountInfo,
  loginMega,
  refreshMega,
  renameMegaNode,
  shareMegaNode,
  uploadMegaFile,
  type MegaSession,
} from "../megaClient";
import type { MegaAccountInfo, MegaLog, MegaNode } from "../types";

function log(kind: MegaLog["kind"], text: string): MegaLog {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    text,
  };
}

function bytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function flattenFolders(node: MegaNode | null): MegaNode[] {
  if (!node) {
    return [];
  }

  return [node, ...node.children.flatMap(flattenFolders)].filter((item) => item.directory);
}

function findNode(root: MegaNode | null, nodeId: string): MegaNode | null {
  if (!root) {
    return null;
  }
  if (root.id === nodeId) {
    return root;
  }
  for (const child of root.children) {
    const match = findNode(child, nodeId);
    if (match) {
      return match;
    }
  }
  return null;
}

function MegaTree({
  node,
  selectedNodeId,
  onSelect,
  depth = 0,
}: {
  node: MegaNode;
  selectedNodeId: string;
  onSelect: (node: MegaNode) => void;
  depth?: number;
}) {
  return (
    <div className="mega-tree-node">
      <button
        type="button"
        className={selectedNodeId === node.id ? "mega-tree-row selected" : "mega-tree-row"}
        onClick={() => onSelect(node)}
        style={{ "--depth": depth } as React.CSSProperties}
      >
        {node.directory ? <Folder size={15} /> : <File size={15} />}
        <span>{node.name}</span>
        <em>{node.directory ? `${node.children.length}` : bytes(node.size)}</em>
      </button>
      {node.directory
        ? node.children.map((child) => (
            <MegaTree key={child.id} node={child} selectedNodeId={selectedNodeId} onSelect={onSelect} depth={depth + 1} />
          ))
        : null}
    </div>
  );
}

export function MegaPanel() {
  const [session, setSession] = useState<MegaSession | null>(null);
  const [root, setRoot] = useState<MegaNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [accountInfo, setAccountInfo] = useState<MegaAccountInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secondFactorCode, setSecondFactorCode] = useState("");
  const [folderName, setFolderName] = useState("Codex GPT Uploads");
  const [renameValue, setRenameValue] = useState("");
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<MegaLog[]>([
    log("info", "MEGA bridge idle. Credentials stay in memory for this browser session only."),
  ]);

  useEffect(() => {
    return () => {
      void closeMega(session);
    };
  }, [session]);

  const folders = useMemo(() => flattenFolders(root), [root]);
  const selectedNode = useMemo(() => findNode(root, selectedNodeId), [root, selectedNodeId]);
  const selectedFolderId = selectedNode?.directory ? selectedNode.id : selectedNode?.path ? folders[0]?.id : root?.id;

  function pushLog(kind: MegaLog["kind"], text: string) {
    setLogs((current) => [...current.slice(-8), log(kind, text)]);
  }

  async function refreshCurrent(nextSession = session) {
    if (!nextSession) {
      return;
    }

    const refreshed = await refreshMega(nextSession);
    nextSession.nodes = refreshed.nodes;
    setRoot(refreshed.root);
    setSelectedNodeId((current) => refreshed.nodes.has(current) ? current : refreshed.root.id);
    setAccountInfo(await getMegaAccountInfo(nextSession));
  }

  async function runMegaTask(text: string, task: () => Promise<void>) {
    setBusy(true);
    setShareLink("");
    try {
      await task();
      pushLog("ok", text);
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : "MEGA operation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await runMegaTask("MEGA account connected.", async () => {
      await closeMega(session);
      const nextSession = await loginMega({ email, password, secondFactorCode });
      setSession(nextSession);
      const refreshed = await refreshMega(nextSession);
      nextSession.nodes = refreshed.nodes;
      setRoot(refreshed.root);
      setSelectedNodeId(refreshed.root.id);
      setAccountInfo(await getMegaAccountInfo(nextSession));
      setPassword("");
      setSecondFactorCode("");
    });
  }

  async function handleSignOut() {
    await closeMega(session);
    setSession(null);
    setRoot(null);
    setAccountInfo(null);
    setSelectedNodeId("root");
    setShareLink("");
    pushLog("warn", "MEGA session closed.");
  }

  function handleUploadSelection(event: ChangeEvent<HTMLInputElement>) {
    setSelectedUpload(event.target.files?.[0] ?? null);
  }

  return (
    <section className="mega-panel" aria-label="MEGA cloud integration">
      <header className="mega-header">
        <div>
          <h3>Live MEGA Cloud</h3>
          <p>{session ? "Connected account filesystem" : "Connect to MEGA.nz from this app"}</p>
        </div>
        <Cloud size={22} />
      </header>

      {!session ? (
        <form className="mega-login" onSubmit={handleLogin}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label>
            2FA Code
            <input
              value={secondFactorCode}
              onChange={(event) => setSecondFactorCode(event.target.value)}
              inputMode="numeric"
              placeholder="Optional"
            />
          </label>
          <button type="submit" disabled={busy || !email || !password}>
            {busy ? <Loader2 size={16} className="spin" /> : <Shield size={16} />}
            Connect MEGA
          </button>
          <p className="mega-privacy">Credentials are used in-memory only and are not stored by this app.</p>
        </form>
      ) : (
        <>
          <div className="mega-account">
            <div>
              <span>Account</span>
              <strong>{email}</strong>
            </div>
            <div>
              <span>Storage</span>
              <strong>
                {bytes(accountInfo?.spaceUsed ?? 0)} / {bytes(accountInfo?.spaceTotal ?? 0)}
              </strong>
            </div>
            <button type="button" onClick={() => void refreshCurrent()} disabled={busy}>
              <RefreshCcw size={15} />
              Refresh
            </button>
            <button type="button" onClick={() => void handleSignOut()}>
              <LogOut size={15} />
              Sign Out
            </button>
          </div>

          <div className="mega-browser">
            <div className="mega-tree">
              {root ? <MegaTree node={root} selectedNodeId={selectedNodeId} onSelect={(node) => {
                setSelectedNodeId(node.id);
                setRenameValue(node.name);
              }} /> : null}
            </div>
            <article className="mega-detail">
              <h4>{selectedNode?.name ?? "Select a MEGA node"}</h4>
              <p>{selectedNode?.path ?? "Your MEGA tree will appear after login."}</p>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedNode?.directory ? "Folder" : "File"}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{bytes(selectedNode?.size ?? 0)}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div className="mega-actions-grid">
            <label className="mega-file-picker">
              <Upload size={15} />
              <span>{selectedUpload?.name ?? "Choose file"}</span>
              <input type="file" onChange={handleUploadSelection} />
            </label>
            <button
              type="button"
              disabled={busy || !selectedUpload || !selectedFolderId}
              onClick={() =>
                void runMegaTask(`${selectedUpload?.name} uploaded to MEGA.`, async () => {
                  if (!session || !selectedUpload || !selectedFolderId) return;
                  await uploadMegaFile(session, selectedFolderId, selectedUpload);
                  setSelectedUpload(null);
                  await refreshCurrent(session);
                })
              }
            >
              <Upload size={15} />
              Upload
            </button>
            <input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Folder name" />
            <button
              type="button"
              disabled={busy || !folderName.trim() || !selectedFolderId}
              onClick={() =>
                void runMegaTask(`${folderName} created in MEGA.`, async () => {
                  if (!session || !selectedFolderId) return;
                  await createMegaFolder(session, selectedFolderId, folderName);
                  await refreshCurrent(session);
                })
              }
            >
              <FolderPlus size={15} />
              Folder
            </button>
            <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="Rename selected" />
            <button
              type="button"
              disabled={busy || !selectedNode || !renameValue.trim()}
              onClick={() =>
                void runMegaTask("MEGA node renamed.", async () => {
                  if (!session || !selectedNode) return;
                  await renameMegaNode(session, selectedNode.id, renameValue);
                  await refreshCurrent(session);
                })
              }
            >
              Rename
            </button>
            <button
              type="button"
              disabled={busy || !selectedNode || selectedNode.directory}
              onClick={() =>
                void runMegaTask("MEGA file downloaded.", async () => {
                  if (!session || !selectedNode) return;
                  await downloadMegaFile(session, selectedNode.id);
                })
              }
            >
              <Download size={15} />
              Download
            </button>
            <button
              type="button"
              disabled={busy || !selectedNode}
              onClick={() =>
                void runMegaTask("MEGA share link created.", async () => {
                  if (!session || !selectedNode) return;
                  const url = await shareMegaNode(session, selectedNode.id);
                  setShareLink(url);
                  await navigator.clipboard?.writeText(url).catch(() => undefined);
                })
              }
            >
              <Link size={15} />
              Link
            </button>
            <button
              type="button"
              className="mega-danger"
              disabled={busy || !selectedNode || selectedNode.id === root?.id}
              onClick={() =>
                void runMegaTask("MEGA node moved to trash.", async () => {
                  if (!session || !selectedNode) return;
                  await deleteMegaNode(session, selectedNode.id);
                  await refreshCurrent(session);
                })
              }
            >
              <Trash2 size={15} />
              Trash
            </button>
          </div>

          {shareLink ? (
            <div className="mega-share">
              <span>{shareLink}</span>
              <button type="button" onClick={() => void navigator.clipboard?.writeText(shareLink)}>
                <Copy size={15} />
              </button>
            </div>
          ) : null}
        </>
      )}

      <section className="mega-log" aria-label="MEGA operation log">
        {logs.map((entry) => (
          <p className={entry.kind} key={entry.id}>
            <span>&gt;</span>
            {entry.text}
          </p>
        ))}
      </section>
    </section>
  );
}
