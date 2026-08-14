import { useEffect, useMemo, useRef, useState } from "react";
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
import { CipherWheel, computeProbeResult, scriptSymbolSrc } from "./components/CipherWheel";
import { DossierPanel } from "./components/DossierPanel";
import { VaultPanel } from "./components/VaultPanel";
import { NoteForge } from "./components/NoteForge";
import { AccessGate } from "./components/AccessGate";
import { OriginPremiseModal } from "./components/OriginPremiseModal";
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
  EncryptedFolder,
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

const ORIGIN_SOLVE_WORD = "ORIGIN";
const ORIGIN_SOLVE_LETTERS = ORIGIN_SOLVE_WORD.split("");
const ORIGIN_ATTEMPT_LIMIT = 6;

const ORIGIN_SYMBOL_SETS = [
  {
    label: "A^1 + A^2",
    detail:
      "The outer Daedric ring is A-Z. Two outer symbols are caught by the black frame, one in A^1 and one in A^2, and their alphabet places steer A^3.",
  },
  {
    label: "B Gate",
    detail:
      "The middle ring is 1-9. Only one red mark belongs in Zone B at a time; sweep it first to make the answer box jump in useful steps.",
  },
  {
    label: "C Pair",
    detail:
      "The inner ring is a memory pair. Zone C reads two glyphs side by side, so a small inner turn can change A^3 more than expected.",
  },
  {
    label: "A^3",
    detail:
      "The final box is the only visible answer. If A^3 shows the current ORIGIN letter, press Validate A^3 to stamp it and reveal the next phase.",
  },
];

const ORIGIN_GUIDE_STEPS = [
  {
    unlockAt: 0,
    target: "O",
    title: "1. O - First Point",
    clue:
      "Begin with the answer box, not the wheel art. Watch A^3 while you turn one ring at a time: sweep B through 1-9, count how C changes the jump, then nudge A^1/A^2 until A^3 reads O. Press Validate A^3 only when O is visible.",
    reward: "O teaches the rule: A^3 is the answer box, and only validation makes it real.",
  },
  {
    unlockAt: 1,
    target: "R",
    title: "2. R - Number Gate",
    clue:
      "Use the clue from O: keep your eyes on A^3, then use B as the first control. Move the middle ring one mark at a time until the result range bends toward R, then fine tune C and the outer pair. Validate only when A^3 shows R.",
    reward: "R teaches that the middle symbol is not decoration; it gates the hidden arithmetic.",
  },
  {
    unlockAt: 2,
    target: "I",
    title: "3. I - Memory Pair",
    clue:
      "Now read C as two glyphs side by side. Hold a useful B value, rotate the inner ring slowly, and notice when A^3 leaps or settles. If I is skipped, adjust A^1/A^2 by one outer step and sweep C again before validating.",
    reward: "I teaches that C is a pair, so the inner ring carries two hidden weights at once.",
  },
  {
    unlockAt: 3,
    target: "G",
    title: "4. G - Split Outer",
    clue:
      "The outer ring is split by the frame. Treat A^1 and A^2 as two alphabet weights, not one. Use the outer ring for broad movement, then use B for range and C for correction until the final box lands on G.",
    reward: "G teaches that A^1 and A^2 are a paired outer instruction feeding A^3.",
  },
  {
    unlockAt: 4,
    target: "I",
    title: "5. I - Return",
    clue:
      "This second I proves the sequence can be repeated. Do not invent a new rule: choose the target, sweep B, count the C pair, split A^1/A^2, and validate A^3 only when the script result is I.",
    reward: "The returned I confirms the method. The last phase asks you to use all three zones together.",
  },
  {
    unlockAt: 5,
    target: "N",
    title: "6. N - Seal Origin",
    clue:
      "For N, combine every clue in order: B selects the number gate, C supplies the two-glyph memory weight, A^1/A^2 supply the alphabet pair, and A^3 speaks the answer. Validate N to complete ORIGIN.",
    reward: "N seals ORIGIN and opens the premise record.",
  },
];

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
  encryptedFolders: "davinci.archivists.encryptedFolders",
};

const COLLABORATION_CHANNEL = "davinci-archivist-collaboration";
const VAULT_ROOT = "Archive: MASK_OF_DESPAIR.mega";
const isWebArchiveMode = window.location.pathname.includes("/web-archive/");

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
    }
  | {
      type: "encrypted-folders";
      payload: EncryptedFolder[];
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

function normalizeFolderInput(rawPath: string) {
  const trimmed = rawPath.trim().replace(/\\/g, "/");
  const withoutRoot = trimmed
    .replace(/^Archive:\s*MASK_OF_DESPAIR\.mega\/?/i, "")
    .replace(/^\/+/, "");
  const segments = withoutRoot
    .split("/")
    .map((segment) =>
      segment
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9_. -]/g, "")
        .replace(/[. ]+$/g, ""),
    )
    .filter(Boolean);

  return segments.join("/");
}

function absoluteFolderPath(relativePath: string) {
  return `${VAULT_ROOT}/${relativePath}`;
}

function collectKnownFolderPaths(files: SealedFile[], folders: EncryptedFolder[]) {
  const known = new Set<string>();

  files.forEach((file) => {
    const [, ...segments] = file.path.split("/");
    let current = VAULT_ROOT;
    segments.filter(Boolean).forEach((segment) => {
      current = `${current}/${segment}`;
      known.add(current.toLowerCase());
    });
  });

  folders.forEach((folder) => {
    const [, ...segments] = folder.path.split("/");
    let current = VAULT_ROOT;
    segments.filter(Boolean).forEach((segment) => {
      current = `${current}/${segment}`;
      known.add(current.toLowerCase());
    });
  });

  return known;
}

export default function App() {
  const [offsets, setOffsets] = useState<RingOffsets>(initialOffsets);
  const [sealedFiles, setSealedFiles] = useState<SealedFile[]>([]);
  const [publishedFiles, setPublishedFiles] = useState<SealedFile[]>(() =>
    readStoredJson<SealedFile[]>(STORAGE_KEYS.publishedFiles, []),
  );
  const [encryptedFolders, setEncryptedFolders] = useState<EncryptedFolder[]>(() =>
    readStoredJson<EncryptedFolder[]>(STORAGE_KEYS.encryptedFolders, []),
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
  const [originHits, setOriginHits] = useState<string[]>([]);
  const [originPremiseOpen, setOriginPremiseOpen] = useState(false);
  const [originAttemptCount, setOriginAttemptCount] = useState(0);
  const lastOriginHitRef = useRef("");

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
        return;
      }
      if (message.type === "encrypted-folders") {
        setEncryptedFolders(message.payload);
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
      if (eventMessage.key === STORAGE_KEYS.encryptedFolders) {
        setEncryptedFolders(readStoredJson<EncryptedFolder[]>(STORAGE_KEYS.encryptedFolders, []));
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
  const originProbeResult = computeProbeResult(offsets);
  const ringAccuracy = progressTowardSolution(offsets);
  const solvedCount = sealedFiles.filter((file) => file.decryptedText).length + (solvedWheel ? 1 : 0);
  const progress = archiveProgress(sealedFiles);
  const originNextLetter = ORIGIN_SOLVE_LETTERS[originHits.length] ?? null;
  const originGuideStepIndex = Math.min(originHits.length, ORIGIN_GUIDE_STEPS.length - 1);
  const originAttemptsRemaining = ORIGIN_ATTEMPT_LIMIT - originAttemptCount;

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
    setOriginPremiseOpen(false);
    setOriginAttemptCount(0);
    setOriginHits([]);
    lastOriginHitRef.current = "";
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

  function createEncryptedFolder(rawPath: string) {
    if (authSession?.role !== "admin") {
      pushEvent("error", "Only Archivist_Z can create encrypted folder branches.");
      return;
    }

    const relativePath = normalizeFolderInput(rawPath);
    if (!relativePath) {
      pushEvent("error", "Encrypted folder branch requires a folder path.");
      return;
    }

    const path = absoluteFolderPath(relativePath);
    const knownFolders = collectKnownFolderPaths(sealedFiles, encryptedFolders);
    if (knownFolders.has(path.toLowerCase())) {
      pushEvent("warn", `${relativePath} already exists in the Vault branch ledger.`);
      return;
    }

    const folder: EncryptedFolder = {
      id: makeId("folder"),
      path,
      createdBy: authSession.username,
      createdAt: new Date().toISOString(),
    };
    const nextFolders = [...encryptedFolders, folder].sort((first, second) => first.path.localeCompare(second.path));
    setEncryptedFolders(nextFolders);
    writeStoredJson(STORAGE_KEYS.encryptedFolders, nextFolders);
    sendCollaborationMessage({ type: "encrypted-folders", payload: nextFolders });
    setDraft((current) => ({ ...current, folder: relativePath }));
    setActiveTab("vault");
    pushEvent("ok", `${relativePath} encrypted folder branch created by ${authSession.username}.`);
    appendChatMessage("Reliquary", "system", `${authSession.username} created encrypted folder branch ${relativePath}.`);
  }

  function rotateRing(ring: RingName, delta: number) {
    setOffsets((current) => ({
      ...current,
      [ring]: (current[ring] + delta + RING_LENGTHS[ring]) % RING_LENGTHS[ring],
    }));
  }

  function resetOriginChain(message: string) {
    setOriginHits([]);
    setOriginAttemptCount(0);
    setOriginPremiseOpen(false);
    lastOriginHitRef.current = "";
    pushEvent("warn", message);
  }

  function checkOriginAttempt() {
    if (!originNextLetter) {
      setOriginPremiseOpen(true);
      pushEvent("ok", "ORIGIN is already sealed. Premise record reopened.");
      return;
    }

    if (originProbeResult.symbol === originNextLetter) {
      const nextHits = [...originHits, originProbeResult.symbol];
      setOriginHits(nextHits);
      setOriginAttemptCount(0);
      lastOriginHitRef.current = `${nextHits.length}:${originProbeResult.symbol}:${offsets.outer}-${offsets.middle}-${offsets.inner}`;
      pushEvent(
        "ok",
        `TRUE validation: ORIGIN hit ${nextHits.length}/${ORIGIN_SOLVE_LETTERS.length}, ${originProbeResult.symbol} approved at A^3 and stamped from sequence ${offsets.outer}/${offsets.middle}/${offsets.inner}.`,
      );

      if (nextHits.length === ORIGIN_SOLVE_LETTERS.length) {
        pushEvent("ok", "ORIGIN sequence complete. The first point has been found.");
        setOriginPremiseOpen(true);
      }

      return;
    }

    const nextAttemptCount = originAttemptCount + 1;

    if (nextAttemptCount >= ORIGIN_ATTEMPT_LIMIT) {
      resetOriginChain(
        `Six false A^3 validations exhausted the chain. ORIGIN progress reset; begin again at ${ORIGIN_SOLVE_LETTERS[0]}.`,
      );
      return;
    }

    setOriginAttemptCount(nextAttemptCount);
    pushEvent(
      "warn",
      `FALSE validation: A^3 reads ${originProbeResult.symbol}; seek ${originNextLetter}. False check ${nextAttemptCount}/${ORIGIN_ATTEMPT_LIMIT}.`,
    );
  }

  function autoAlign() {
    setOffsets(SOLUTION_OFFSETS);
    pushEvent("ok", "Wheel aligned to H / 4 / ᚨ. Red needles stabilized.");
  }

  function resetWheel() {
    setOffsets(initialOffsets);
    resetOriginChain("Wheel reset. ORIGIN chain and alignment cache cleared.");
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
    <main
      className={[
        "app-shell",
        isWebArchiveMode ? "archive-publish" : "",
        activeTab === "places" || activeTab === "guides" ? "places-layout" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isWebArchiveMode ? (
        <div className="archive-publish-ribbon" role="status">
          <span>Web Archive Publish - offline cache ready after first full load</span>
          <a href="/davinci-escape-room/download/davinci-web-archive.zip" download>
            Download Archive
          </a>
        </div>
      ) : null}
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
          <div className="origin-stamp-ledger" aria-label="Validated Zone A3 symbol stamps">
            <span>Zone A^3 Stamps</span>
            <ol>
              {ORIGIN_SOLVE_LETTERS.map((letter, index) => {
                const found = originHits[index];
                const stampSrc = found ? scriptSymbolSrc(found) : null;

                return (
                  <li className={found ? "found" : ""} key={`origin-stamp-${letter}-${index}`}>
                    {stampSrc ? (
                      <img src={stampSrc} alt={`${found} validated A^3 stamp`} draggable={false} />
                    ) : (
                      <em>{index + 1}</em>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="decoded-strip" aria-live="polite">
          <span>Decoded Fragment</span>
          <strong>{decoded}</strong>
          <em>{solvedWheel ? "Truth hidden reveals" : `${ringAccuracy}/3 rings match the reliquary diagram`}</em>
        </div>

        <section className="origin-riddle" aria-label="Origin riddle">
          <div className="origin-guide-intro">
            <span>Origin Method</span>
            <p>
              Discover six sequences, one for each letter of ORIGIN. A candidate does not count until Validate A^3
              returns TRUE.
            </p>
            <ol className="origin-discovery-loop">
              <li>Read the current target letter.</li>
              <li>Sweep B through the 1-9 gate.</li>
              <li>Test the two-glyph C pair.</li>
              <li>Split A^1 and A^2 on the outer ring.</li>
              <li>Validate A^3, then follow the next phase clue.</li>
            </ol>
          </div>
          <div className="origin-status-panel">
            <ol className="origin-hit-tracker" aria-label="Origin hit tracker">
              {ORIGIN_SOLVE_LETTERS.map((letter, index) => (
                <li
                  className={[
                    originHits[index] ? "found" : "",
                    index === originHits.length ? "current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`${letter}-${index}`}
                >
                  <span>{originHits[index] ?? letter}</span>
                </li>
              ))}
            </ol>
            <div className="origin-attempt-meter" aria-live="polite">
              <strong>{originNextLetter ? `Seek ${originNextLetter}` : "ORIGIN sealed"}</strong>
              <small>
                {originNextLetter
                  ? `${originAttemptCount}/${ORIGIN_ATTEMPT_LIMIT} false validations - ${originAttemptsRemaining} remain`
                  : "Premise record unlocked"}
              </small>
              <button type="button" onClick={checkOriginAttempt}>
                {originNextLetter ? "Validate A^3" : "Open Premise"}
              </button>
            </div>
          </div>
          <ol className="origin-phase-rail" aria-label="Origin phase summary">
            {ORIGIN_GUIDE_STEPS.map((step, index) => {
              const unlocked = originHits.length >= step.unlockAt;
              const sealed = originHits.length > step.unlockAt;
              const active = unlocked && originGuideStepIndex === index && originHits.length < ORIGIN_SOLVE_LETTERS.length;

              return (
                <li
                  className={[unlocked ? "unlocked" : "locked", sealed ? "sealed" : "", active ? "active" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  key={`phase-rail-${step.title}`}
                >
                  <b>{index + 1}</b>
                  <span>{step.title.replace(/^\d+\.\s*/, "")}</span>
                </li>
              );
            })}
          </ol>
          <div className="origin-symbol-legend" aria-label="Origin symbol legend">
            {ORIGIN_SYMBOL_SETS.map((set) => (
              <article key={set.label}>
                <strong>{set.label}</strong>
                <p>{set.detail}</p>
              </article>
            ))}
          </div>
          <ol className="origin-method-chain" aria-label="Origin chained method">
            {ORIGIN_GUIDE_STEPS.map((step, index) => {
              const unlocked = originHits.length >= step.unlockAt;
              const active = unlocked && originGuideStepIndex === index && originHits.length < ORIGIN_SOLVE_LETTERS.length;
              const previousSeal = step.unlockAt > 0 ? ORIGIN_SOLVE_LETTERS[step.unlockAt - 1] : null;

              return (
                <li
                  className={[unlocked ? "unlocked" : "locked", active ? "active" : ""].filter(Boolean).join(" ")}
                  key={step.title}
                >
                  <strong>{step.title}</strong>
                  <p>
                    {unlocked
                      ? step.clue
                      : previousSeal
                        ? `Seal ${previousSeal} to reveal this phase.`
                        : "Awaiting first seal."}
                  </p>
                  <em>{unlocked ? step.reward : "The next answer hides the next instruction."}</em>
                </li>
              );
            })}
          </ol>
        </section>

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

      <aside className={activeTab === "places" ? "vault-column places-mode" : "vault-column"} aria-label="MEGA Vault">
        <VaultPanel
          session={authSession}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          files={sealedFiles}
          folders={encryptedFolders}
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
          onCreateEncryptedFolder={createEncryptedFolder}
        />
        {activeTab !== "places" ? (
          <NoteForge
            session={authSession}
            draft={draft}
            folders={encryptedFolders}
            setDraft={setDraft}
            onSeal={sealCustomNote}
            busy={busy}
          />
        ) : null}
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

      <OriginPremiseModal open={originPremiseOpen} onClose={() => setOriginPremiseOpen(false)} />
    </main>
  );
}
