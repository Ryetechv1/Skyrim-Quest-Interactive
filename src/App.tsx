import { useEffect, useMemo, useState } from "react";
import {
  AlignCenterHorizontal,
  Archive,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { CipherWheel } from "./components/CipherWheel";
import { DossierPanel } from "./components/DossierPanel";
import { VaultPanel } from "./components/VaultPanel";
import { NoteForge } from "./components/NoteForge";
import { AccessGate } from "./components/AccessGate";
import { authenticateArchivist, createGuestSession, roleLabel } from "./auth";
import { dossierSteps, inventory, vaultFiles } from "./data";
import { openText, sealText, sealVaultFiles } from "./crypto";
import {
  decodedFragment,
  isWheelSolved,
  progressTowardSolution,
  RING_LENGTHS,
  SOLUTION_OFFSETS,
  wheelChecksum,
} from "./wheel";
import type {
  AuthSession,
  ChangeRequest,
  ChangeRequestPayload,
  ChatMessage,
  NoteDraft,
  RingName,
  RingOffsets,
  SealedFile,
  TerminalEvent,
} from "./types";

const initialOffsets: RingOffsets = {
  outer: 19,
  middle: 4,
  inner: 21,
};

const defaultDraft: NoteDraft = {
  title: "UNNAMED_NOTE.txt.enc",
  folder: "04_Archives_Obscura",
  passphrase: "ARCHIVIST-72",
  body: "Field note: the next investigator should test every key locally before trusting the archive.",
};

const STORAGE_KEYS = {
  authSession: "davinci.auth.session",
  changeRequests: "davinci.archivists.changeRequests",
  chatMessages: "davinci.archivists.chatMessages",
  publishedFiles: "davinci.archivists.publishedFiles",
};

const COLLABORATION_CHANNEL = "davinci-archivist-collaboration";

type CollaborationMessage =
  | {
      type: "requests";
      payload: ChangeRequest[];
    }
  | {
      type: "chat";
      payload: ChatMessage[];
    }
  | {
      type: "published-files";
      payload: SealedFile[];
    };

function event(kind: TerminalEvent["kind"], text: string): TerminalEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    text,
  };
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readSessionJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function sendCollaborationMessage(message: CollaborationMessage) {
  if (!("BroadcastChannel" in window)) {
    return;
  }

  const channel = new BroadcastChannel(COLLABORATION_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

function archiveProgress(files: SealedFile[]) {
  if (!files.length) {
    return 0;
  }
  const opened = files.filter((file) => file.decryptedText).length;
  return Math.round((opened / files.length) * 100);
}

export default function App() {
  const [offsets, setOffsets] = useState<RingOffsets>(initialOffsets);
  const [sealedFiles, setSealedFiles] = useState<SealedFile[]>([]);
  const [publishedFiles, setPublishedFiles] = useState<SealedFile[]>(() =>
    readStoredJson<SealedFile[]>(STORAGE_KEYS.publishedFiles, []),
  );
  const [selectedFileId, setSelectedFileId] = useState(vaultFiles[0].id);
  const [passphrase, setPassphrase] = useState("R3LIQU4RY-72");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [activeTab, setActiveTab] = useState("vault");
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    readSessionJson<AuthSession | null>(STORAGE_KEYS.authSession, null),
  );
  const [draft, setDraft] = useState<NoteDraft>(defaultDraft);
  const [busy, setBusy] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(() =>
    readStoredJson<ChangeRequest[]>(STORAGE_KEYS.changeRequests, []),
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    readStoredJson<ChatMessage[]>(STORAGE_KEYS.chatMessages, [
      {
        id: "system-welcome",
        author: "Reliquary",
        role: "system",
        body: "Live Archivist comments and approval updates appear here for this browser workspace.",
        createdAt: new Date().toISOString(),
      },
    ]),
  );
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([
    event("info", "Connecting to MEGA Vault..."),
    event("ok", "Handshake: OK"),
    event("ok", "Vault Key accepted for Archivist-72"),
    event("info", "Directory tree contains seven sealed objects."),
  ]);

  useEffect(() => {
    let mounted = true;
    sealVaultFiles(vaultFiles).then((files) => {
      if (!mounted) {
        return;
      }
      setSealedFiles([...files, ...readStoredJson<SealedFile[]>(STORAGE_KEYS.publishedFiles, [])]);
      setTerminalEvents((events) => [
        ...events,
        event("ok", "Archive: MASK_OF_DESPAIR.mega indexed"),
        event("warn", "Cipher wheel is out of alignment"),
      ]);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(COLLABORATION_CHANNEL) : null;

    function applyMessage(message: CollaborationMessage) {
      if (message.type === "requests") {
        setChangeRequests(message.payload);
        return;
      }
      if (message.type === "chat") {
        setChatMessages(message.payload);
        return;
      }
      if (message.type === "published-files") {
        setPublishedFiles(message.payload);
        setSealedFiles((files) => [...files.filter((file) => !file.id.startsWith("published-")), ...message.payload]);
      }
    }

    channel?.addEventListener("message", (eventMessage: MessageEvent<CollaborationMessage>) => {
      applyMessage(eventMessage.data);
    });

    function handleStorage(eventMessage: StorageEvent) {
      if (eventMessage.key === STORAGE_KEYS.changeRequests) {
        setChangeRequests(readStoredJson<ChangeRequest[]>(STORAGE_KEYS.changeRequests, []));
      }
      if (eventMessage.key === STORAGE_KEYS.chatMessages) {
        setChatMessages(readStoredJson<ChatMessage[]>(STORAGE_KEYS.chatMessages, []));
      }
      if (eventMessage.key === STORAGE_KEYS.publishedFiles) {
        const nextPublishedFiles = readStoredJson<SealedFile[]>(STORAGE_KEYS.publishedFiles, []);
        setPublishedFiles(nextPublishedFiles);
        setSealedFiles((files) => [
          ...files.filter((file) => !file.id.startsWith("published-")),
          ...nextPublishedFiles,
        ]);
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const selectedFile = sealedFiles.find((file) => file.id === selectedFileId) ?? sealedFiles[0];
  const solvedWheel = isWheelSolved(offsets);
  const decoded = decodedFragment(offsets);
  const ringAccuracy = progressTowardSolution(offsets);
  const solvedCount = sealedFiles.filter((file) => file.decryptedText).length + (solvedWheel ? 1 : 0);
  const progress = archiveProgress(sealedFiles);

  const knownKeys = useMemo(() => {
    const recovered = sealedFiles
      .filter((file) => file.decryptedText)
      .flatMap((file) => {
        const matches = file.decryptedText?.match(/Recovered (?:passphrase|final password): ([A-Z0-9-]+)/g) ?? [];
        return matches.map((match) => match.split(": ")[1]);
      });
    return Array.from(new Set(["R3LIQU4RY-72", ...(solvedWheel ? ["VERITAS"] : []), ...recovered]));
  }, [sealedFiles, solvedWheel]);

  function pushEvent(kind: TerminalEvent["kind"], text: string) {
    setTerminalEvents((events) => [...events.slice(-12), event(kind, text)]);
  }

  function appendChatMessage(author: string, role: ChatMessage["role"], body: string) {
    const message: ChatMessage = {
      id: makeId("chat"),
      author,
      role,
      body,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((current) => {
      const next = [...current.slice(-80), message];
      writeStoredJson(STORAGE_KEYS.chatMessages, next);
      sendCollaborationMessage({ type: "chat", payload: next });
      return next;
    });
  }

  function setSession(session: AuthSession) {
    setAuthSession(session);
    sessionStorage.setItem(STORAGE_KEYS.authSession, JSON.stringify(session));
  }

  function signOut() {
    const wasGuest = authSession?.role === "guest";
    sessionStorage.removeItem(STORAGE_KEYS.authSession);
    setAuthSession(null);
    if (wasGuest) {
      setSealedFiles((files) => files.filter((file) => !file.id.startsWith("guest-")));
      setOffsets(initialOffsets);
      setPassphrase("R3LIQU4RY-72");
      setDraft(defaultDraft);
    }
    pushEvent("warn", "Session closed. Guest sandbox state has been discarded.");
  }

  function handleGuestAccess() {
    const session = createGuestSession();
    setSession(session);
    pushEvent("warn", "GUEST VIEW opened. Experiments are local and reset with the browser session.");
  }

  function handleArchivistAccess(username: string, password: string) {
    const session = authenticateArchivist(username, password);
    if (!session) {
      return null;
    }

    setSession(session);
    pushEvent("ok", `${roleLabel(session.role)} login accepted: ${session.username}`);
    appendChatMessage("Reliquary", "system", `${session.username} entered the archive as ${roleLabel(session.role)}.`);
    return session;
  }

  function updateChangeRequests(next: ChangeRequest[]) {
    setChangeRequests(next);
    writeStoredJson(STORAGE_KEYS.changeRequests, next);
    sendCollaborationMessage({ type: "requests", payload: next });
  }

  function requestChange(title: string, summary: string, payload: ChangeRequestPayload) {
    if (!authSession) {
      return;
    }

    if (authSession.role === "guest") {
      pushEvent("error", "GUEST VIEW cannot submit publish requests.");
      return;
    }

    const request: ChangeRequest = {
      id: makeId("request"),
      title,
      summary,
      requester: authSession.username,
      requesterRole: authSession.role,
      status: "pending",
      createdAt: new Date().toISOString(),
      payload,
    };
    updateChangeRequests([request, ...changeRequests]);
    pushEvent("warn", `${authSession.username} filed change request: ${title}`);
    appendChatMessage("Reliquary", "system", `${authSession.username} requested approval: ${title}.`);
  }

  async function makeSealedNote(draftToSeal: NoteDraft, idPrefix: string): Promise<SealedFile> {
    const normalizedTitle = draftToSeal.title.endsWith(".enc") ? draftToSeal.title : `${draftToSeal.title}.enc`;
    const sealed = await sealText(draftToSeal.body, draftToSeal.passphrase.trim());

    return {
      id: `${idPrefix}-${Date.now()}`,
      name: normalizedTitle,
      type: "file",
      path: `Archive: MASK_OF_DESPAIR.mega/${draftToSeal.folder}`,
      keyLabel: idPrefix === "guest" ? "Guest Sandbox Password" : "Published Password",
      password: "",
      plainText: "",
      clue:
        idPrefix === "guest"
          ? "A temporary Guest View experiment. This entry is not published and resets with the session."
          : "A published Archivist note sealed through the approval workflow.",
      size: `${Math.max(1, Math.ceil(draftToSeal.body.length / 128))}.${draftToSeal.body.length % 10} KB`,
      locked: true,
      ...sealed,
    };
  }

  async function publishDraft(draftToSeal: NoteDraft, publisher: string) {
    const file = await makeSealedNote(draftToSeal, "published");
    const nextPublishedFiles = [...publishedFiles, file];
    setPublishedFiles(nextPublishedFiles);
    writeStoredJson(STORAGE_KEYS.publishedFiles, nextPublishedFiles);
    sendCollaborationMessage({ type: "published-files", payload: nextPublishedFiles });
    setSealedFiles((files) => [...files, file]);
    setSelectedFileId(file.id);
    setActiveTab("vault");
    pushEvent("ok", `${file.name} published by ${publisher}.`);
    appendChatMessage("Reliquary", "system", `${publisher} published ${file.name}.`);
  }

  function rotateRing(ring: RingName, delta: number) {
    setOffsets((current) => ({
      ...current,
      [ring]: (current[ring] + delta + RING_LENGTHS[ring]) % RING_LENGTHS[ring],
    }));
  }

  function autoAlign() {
    setOffsets(SOLUTION_OFFSETS);
    pushEvent("ok", "Wheel aligned to H / 4 / ᚨ. Red needles stabilized.");
  }

  function resetWheel() {
    setOffsets(initialOffsets);
    pushEvent("warn", "Wheel reset. Alignment cache cleared.");
  }

  function testWheel() {
    if (solvedWheel) {
      setPassphrase((current) => {
        const normalized = current.trim();
        return normalized && normalized !== "R3LIQU4RY-72" && normalized !== "VERITAS" ? current : "VERITAS";
      });
      pushEvent("ok", "Decoded Fragment accepted: VERITAS OCCULTA REVELATUR");
      pushEvent("ok", "Recovered passphrase added to key ledger: VERITAS");
      return;
    }

    pushEvent("error", `Wheel checksum ${wheelChecksum(offsets)} rejected. ${ringAccuracy}/3 rings match.`);
  }

  async function decryptSelectedFile() {
    if (!selectedFile) {
      return;
    }
    setBusy(true);
    try {
      const plainText = await openText(selectedFile, passphrase.trim());
      setSealedFiles((files) =>
        files.map((file) =>
          file.id === selectedFile.id
            ? {
                ...file,
                decryptedText: plainText,
                locked: false,
              }
            : file,
        ),
      );
      const recovered = plainText.match(/Recovered (?:passphrase|final password): ([A-Z0-9-]+)/)?.[1];
      pushEvent("ok", `${selectedFile.name} decrypted with ${selectedFile.keyLabel}`);
      if (recovered) {
        setPassphrase(recovered);
        pushEvent("ok", `Recovered key loaded: ${recovered}`);
      }
    } catch {
      pushEvent("error", `${selectedFile.name} rejected the supplied key`);
    } finally {
      setBusy(false);
    }
  }

  async function sealCustomNote() {
    if (!draft.title.trim() || !draft.passphrase.trim() || !draft.body.trim()) {
      pushEvent("error", "Custom note requires title, passphrase, and body.");
      return;
    }

    if (!authSession) {
      pushEvent("error", "Sign in as Guest View or an Archivist before sealing notes.");
      return;
    }

    if (authSession.role === "moderator") {
      requestChange(
        `Publish ${draft.title.endsWith(".enc") ? draft.title : `${draft.title}.enc`}`,
        `Seal a moderator note into ${draft.folder}.`,
        {
          type: "seal-note",
          draft: { ...draft },
        },
      );
      return;
    }

    setBusy(true);
    try {
      if (authSession.role === "guest") {
        const file = await makeSealedNote(draft, "guest");
        setSealedFiles((files) => [...files, file]);
        setSelectedFileId(file.id);
        setActiveTab("vault");
        pushEvent("warn", `${file.name} sealed in Guest sandbox only. It will reset after this browser session.`);
      } else {
        await publishDraft(draft, authSession.username);
      }
    } finally {
      setBusy(false);
    }
  }

  async function approveChangeRequest(requestId: string) {
    if (authSession?.role !== "admin") {
      pushEvent("error", "Only Archivist_Z can approve change requests.");
      return;
    }

    const request = changeRequests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending") {
      return;
    }

    setBusy(true);
    try {
      if (request.payload.type === "seal-note") {
        await publishDraft(request.payload.draft, request.requester);
      } else {
        pushEvent("ok", `${request.title} approved. Admin acceptance recorded for execution.`);
      }

      const nextRequests = changeRequests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: "approved" as const,
              resolvedAt: new Date().toISOString(),
              resolver: authSession.username,
            }
          : item,
      );
      updateChangeRequests(nextRequests);
      appendChatMessage("Reliquary", "system", `${authSession.username} approved ${request.title}.`);
    } finally {
      setBusy(false);
    }
  }

  function rejectChangeRequest(requestId: string) {
    if (authSession?.role !== "admin") {
      pushEvent("error", "Only Archivist_Z can reject change requests.");
      return;
    }

    const request = changeRequests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending") {
      return;
    }

    const nextRequests = changeRequests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status: "rejected" as const,
            resolvedAt: new Date().toISOString(),
            resolver: authSession.username,
          }
        : item,
    );
    updateChangeRequests(nextRequests);
    pushEvent("warn", `${request.title} rejected by ${authSession.username}.`);
    appendChatMessage("Reliquary", "system", `${authSession.username} rejected ${request.title}.`);
  }

  function downloadMegaArchive() {
    if (authSession?.role === "guest") {
      pushEvent("error", "GUEST VIEW cannot export or write files. Browse and experiment in-session only.");
      return;
    }

    const archive = {
      archive: "MASK_OF_DESPAIR.mega",
      exportedAt: new Date().toISOString(),
      wheelChecksum: wheelChecksum(offsets),
      solvedWheel,
      files: sealedFiles.map(({ plainText: _plainText, password: _password, decryptedText: _decryptedText, ...file }) => file),
    };

    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "MASK_OF_DESPAIR.mega.json";
    anchor.click();
    URL.revokeObjectURL(url);
    pushEvent("ok", "Encrypted MEGA archive exported as JSON payload.");
  }

  return (
    <main className="app-shell">
      <DossierPanel
        session={authSession}
        onSignOut={signOut}
        steps={dossierSteps}
        inventory={inventory.map((item) => ({
          ...item,
          acquired:
            item.acquired ||
            (item.id === "seal-ring" && knownKeys.includes("VERITAS")) ||
            (item.id === "folding-key" && knownKeys.includes("OCCULTA")) ||
            (item.id === "wax" &&
              sealedFiles.some((file) => file.id.startsWith("guest-") || file.id.startsWith("published-"))),
        }))}
        solvedCount={solvedCount}
        fragmentCount={knownKeys.length}
        progress={progress}
      />

      <section className="workbench" aria-label="3-Layer Cipher Wheel workbench">
        <header className="workbench-header">
          <div>
            <h1>3-Layer Cipher Wheel</h1>
            <p>The Reliquary of Knowledge</p>
          </div>
          <div className="archive-status">
            <Archive size={18} />
            <span>Archive: MASK_OF_DESPAIR.mega</span>
          </div>
        </header>

        <div className="manuscript-stage">
          <div className="red-thread red-thread-horizontal" />
          <div className="red-thread red-thread-vertical" />
          <div className="folio-note folio-note-top">Align truth, shadow, memory.</div>
          <div className="folio-note folio-note-side">7 / 14 / 3</div>
          <CipherWheel offsets={offsets} rotateRing={rotateRing} />
          <div className="geometry-mark geometry-left" />
          <div className="geometry-mark geometry-right" />
        </div>

        <div className="decoded-strip" aria-live="polite">
          <span>Decoded Fragment</span>
          <strong>{decoded}</strong>
          <em>{solvedWheel ? "Truth hidden reveals" : `${ringAccuracy}/3 rings match the reliquary diagram`}</em>
        </div>

        <section className="wheel-controls" aria-label="Ring controls">
          {(["outer", "middle", "inner"] as RingName[]).map((ring) => (
            <div className="control-group" key={ring}>
              <span>{ring} ring</span>
              <button type="button" onClick={() => rotateRing(ring, -1)} aria-label={`Rotate ${ring} ring left`}>
                <RotateCcw size={16} />
              </button>
              <strong>{offsets[ring].toString().padStart(2, "0")}</strong>
              <button type="button" onClick={() => rotateRing(ring, 1)} aria-label={`Rotate ${ring} ring right`}>
                <RefreshCcw size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="seal-button" onClick={autoAlign}>
            <AlignCenterHorizontal size={16} />
            Align
          </button>
          <button type="button" className="seal-button primary" onClick={testWheel}>
            <ShieldCheck size={16} />
            Test Decrypt
          </button>
        </section>

        <section className="key-console" aria-label="Key entry">
          <label htmlFor="passphrase">
            <KeyRound size={16} />
            Key Entry
          </label>
          <input
            id="passphrase"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            type={showPassphrase ? "text" : "password"}
            placeholder="Enter Vault Key or passphrase..."
          />
          <button type="button" onClick={() => setShowPassphrase((visible) => !visible)} aria-label="Show passphrase">
            {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button type="button" className="submit-key" onClick={decryptSelectedFile} disabled={busy || !selectedFile}>
            {selectedFile?.decryptedText ? <Unlock size={16} /> : <Lock size={16} />}
            Decrypt
          </button>
          <button type="button" onClick={downloadMegaArchive}>
            <Download size={16} />
            MEGA File
          </button>
          <button type="button" onClick={resetWheel}>
            <RefreshCcw size={16} />
            Reset Wheel
          </button>
        </section>
      </section>

      <aside className="vault-column" aria-label="MEGA Vault">
        <VaultPanel
          session={authSession}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          files={sealedFiles}
          selectedFileId={selectedFileId}
          setSelectedFileId={setSelectedFileId}
          terminalEvents={terminalEvents}
          knownKeys={knownKeys}
          busy={busy}
          changeRequests={changeRequests}
          chatMessages={chatMessages}
          onApproveRequest={(requestId) => {
            void approveChangeRequest(requestId);
          }}
          onRejectRequest={rejectChangeRequest}
          onRequestChange={requestChange}
          onSendChatMessage={(body) => {
            if (!authSession || authSession.role === "guest") {
              pushEvent("error", "GUEST VIEW can read archive feedback but cannot post Archivist comments.");
              return;
            }
            appendChatMessage(authSession.username, authSession.role, body);
          }}
        />
        <NoteForge session={authSession} draft={draft} setDraft={setDraft} onSeal={sealCustomNote} busy={busy} />
      </aside>

      {activeTab !== "archivists" ? (
        <button type="button" className="floating-add" onClick={() => setActiveTab("notes")} aria-label="Open note forge">
          <Plus size={20} />
        </button>
      ) : null}

      {!authSession ? (
        <AccessGate
          onGuestAccess={handleGuestAccess}
          onArchivistAccess={handleArchivistAccess}
        />
      ) : null}
    </main>
  );
}
