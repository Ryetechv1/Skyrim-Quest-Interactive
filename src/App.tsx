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
import { CipherWheel, detectProbeSignature, probeSignatureMatches, scriptSymbolSrc } from "./components/CipherWheel";
import { DossierPanel } from "./components/DossierPanel";
import { VaultPanel } from "./components/VaultPanel";
import { NoteForge } from "./components/NoteForge";
import { AccessGate } from "./components/AccessGate";
import { OriginPremiseModal, PREMISE_PARAGRAPHS, PREMISE_TITLE } from "./components/OriginPremiseModal";
import { authenticateArchivist, createGuestSession, roleLabel } from "./auth";
import { dossierSteps, inventory, vaultFiles } from "./data";
import { openText, sealText, sealVaultFiles } from "./crypto";
import {
  isWheelSolved,
  progressTowardSolution,
  RING_LENGTHS,
  SOLUTION_OFFSETS,
  wheelChecksum,
} from "./wheel";
import {
  VOLVELLE_ATTEMPT_LIMIT,
  VOLVELLE_HORIZON_LEDGER,
  VOLVELLE_HOUR_LEDGER,
  VOLVELLE_PHASES,
  VOLVELLE_SOLVE_LETTERS,
  VOLVELLE_SOLVE_WORD,
  VOLVELLE_STAMP_LETTERS,
  VOLVELLE_STAMP_WORD,
  VOLVELLE_STAR_LEDGER,
} from "./volvelle";
import type { VolvellePhase, VolvelleSignature } from "./volvelle";
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

const ORIGIN_SOLVE_LETTERS = VOLVELLE_SOLVE_LETTERS;
const ZONE_A3_STAMP_LETTERS = VOLVELLE_STAMP_LETTERS;
const ORIGIN_ATTEMPT_LIMIT = VOLVELLE_ATTEMPT_LIMIT;
const VOLVELLE_REMEMBRANCE_DAYS = 5;
const VOLVELLE_REMEMBRANCE_MS = VOLVELLE_REMEMBRANCE_DAYS * 24 * 60 * 60 * 1000;
const VOLVELLE_HINT_MAX_TOKENS = 5;
const VOLVELLE_HINT_REFRESH_MS = 60 * 60 * 1000;

const ORIGIN_SYMBOL_SETS = [
  {
    label: "Horizon Atlas",
    detail:
      "Outer Daedric ring. Use A-Z values and the static lowercase guide to bring the requested pair into the twin horizon.",
  },
  {
    label: "Hour Gate",
    detail:
      "Middle ring. Each clue points to an hour such as Dawn, Zenith, or Midnight; the ledger maps that hour to 1-9.",
  },
  {
    label: "Star Ledger",
    detail:
      "Inner ring. The clue points to two descriptions; match them to rows here, then place both runes inside Zone C.",
  },
  {
    label: "Final Sight",
    detail:
      "The only visible answer zone. It stays unsettled until the active phase signature is witnessed by the frame.",
  },
];
const ORIGIN_GUIDE_STEPS = VOLVELLE_PHASES;

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
  volvelleCompletion: "davinci.volvelle.completion",
  volvelleHints: "davinci.volvelle.hints",
};

const COLLABORATION_CHANNEL = "davinci-archivist-collaboration";
const VAULT_ROOT = "Archive: MASK_OF_DESPAIR.mega";
const ORIGIN_STORY_FOLDER = "00_Lore/01_Storyline";
const ORIGIN_STORY_FILE_ID = "lore-origin-premise";
const SYSTEM_ENCRYPTED_FOLDERS: EncryptedFolder[] = [
  {
    id: "system-folder-lore",
    path: `${VAULT_ROOT}/00_Lore`,
    createdBy: "Reliquary",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "system-folder-storyline",
    path: `${VAULT_ROOT}/${ORIGIN_STORY_FOLDER}`,
    createdBy: "Reliquary",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
];
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

type VolvelleCompletionMemory = {
  word: string;
  stampWord?: string;
  hits: string[];
  completedAt: string;
  expiresAt: string;
};

type VolvelleHintWallet = {
  tokens: number;
  refreshedAt: number;
  revealed: string[];
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

function phaseHintKey(index: number) {
  return `phase-${index}`;
}

function normalizeVolvelleHintWallet(
  wallet: Partial<VolvelleHintWallet> | null | undefined,
  now = Date.now(),
): VolvelleHintWallet {
  const rawTokens = Number.isFinite(wallet?.tokens) ? Number(wallet?.tokens) : VOLVELLE_HINT_MAX_TOKENS;
  let tokens = Math.min(VOLVELLE_HINT_MAX_TOKENS, Math.max(0, Math.floor(rawTokens)));
  let refreshedAt = Number.isFinite(wallet?.refreshedAt) ? Number(wallet?.refreshedAt) : now;

  if (tokens < VOLVELLE_HINT_MAX_TOKENS) {
    const earned = Math.floor(Math.max(0, now - refreshedAt) / VOLVELLE_HINT_REFRESH_MS);
    if (earned > 0) {
      tokens = Math.min(VOLVELLE_HINT_MAX_TOKENS, tokens + earned);
      refreshedAt += earned * VOLVELLE_HINT_REFRESH_MS;
    }
  } else if (refreshedAt > now) {
    refreshedAt = now;
  }

  return {
    tokens,
    refreshedAt,
    revealed: Array.from(new Set(Array.isArray(wallet?.revealed) ? wallet.revealed.filter(Boolean) : [])),
  };
}

function readVolvelleHintWallet(): VolvelleHintWallet {
  const wallet = normalizeVolvelleHintWallet(
    readStoredJson<Partial<VolvelleHintWallet> | null>(STORAGE_KEYS.volvelleHints, null),
  );
  writeStoredJson(STORAGE_KEYS.volvelleHints, wallet);
  return wallet;
}

function writeVolvelleHintWallet(wallet: VolvelleHintWallet) {
  writeStoredJson(STORAGE_KEYS.volvelleHints, wallet);
}

function formatHintRefresh(wallet: VolvelleHintWallet) {
  if (wallet.tokens >= VOLVELLE_HINT_MAX_TOKENS) {
    return "full";
  }

  const remainingMs = Math.max(0, wallet.refreshedAt + VOLVELLE_HINT_REFRESH_MS - Date.now());
  const minutes = Math.ceil(remainingMs / 60000);
  return minutes <= 1 ? "next token in 1 min" : `next token in ${minutes} min`;
}

function volvelleStageMatches(current: VolvelleSignature, phase: VolvellePhase) {
  const star =
    current.zoneC[0].symbol === phase.signature.zoneC[0].symbol &&
    current.zoneC[1].symbol === phase.signature.zoneC[1].symbol;
  const hour = current.zoneB.symbol === phase.signature.zoneB.symbol;
  const horizon =
    current.zoneA1.symbol === phase.signature.zoneA1.symbol &&
    current.zoneA2.symbol === phase.signature.zoneA2.symbol;

  return {
    star,
    hour,
    horizon,
    count: [star, hour, horizon].filter(Boolean).length,
  };
}

function phaseTitleLabel(phase: VolvellePhase) {
  return phase.title.replace(/^\d+\.\s*/, "");
}

function phasePlaceLabel(phase: VolvellePhase) {
  return phaseTitleLabel(phase).split("/").pop()?.trim() || phaseTitleLabel(phase);
}

function buildCodedFragment(phase: VolvellePhase | null, current: VolvelleSignature) {
  if (!phase) {
    return {
      text: "ORIGIN is sealed; the Dragon glyphs hold their final scar in the final sight.",
      status: "All three sights have already answered.",
    };
  }

  const matches = volvelleStageMatches(current, phase);
  const place = phasePlaceLabel(phase);
  const phaseName = phaseTitleLabel(phase);
  const matched: string[] = [];
  const missing: string[] = [];

  if (matches.star) {
    matched.push(`Zone C hums beneath ${place}`);
  } else {
    missing.push("Zone C inner runes");
  }

  if (matches.hour) {
    matched.push(`${phase.hour} holds its hour`);
  } else {
    missing.push(`${phase.hour} Hour Gate`);
  }

  if (matches.horizon) {
    matched.push("the twin horizon draws true");
  } else {
    missing.push("twin horizon");
  }

  if (matches.count === 0) {
    return {
      text: `${phaseName}: the lens circles ${place}; no stage has settled.`,
      status: "0/3 riddle stages align - seek the inner runes first.",
    };
  }

  if (matches.count === 3) {
    return {
      text: `${phaseName}: Zone C, ${phase.hour}, and the horizon agree; the final sight is ready to speak ${phase.target}.`,
      status: "3/3 riddle stages align - validate the final sight to stamp the sequence.",
    };
  }

  return {
    text: `${phaseName}: ${matched.join("; ")}. Still resisting: ${missing.join(", ")}.`,
    status: `${matches.count}/3 riddle stages align - continue the current phase.`,
  };
}

function readVolvelleCompletionMemory(): VolvelleCompletionMemory | null {
  const memory = readStoredJson<VolvelleCompletionMemory | null>(STORAGE_KEYS.volvelleCompletion, null);
  const expiresAt = memory ? Date.parse(memory.expiresAt) : Number.NaN;

  if (
    !memory ||
    memory.word !== VOLVELLE_SOLVE_WORD ||
    memory.stampWord !== VOLVELLE_STAMP_WORD ||
    memory.hits.join("") !== VOLVELLE_SOLVE_WORD ||
    !Number.isFinite(expiresAt)
  ) {
    localStorage.removeItem(STORAGE_KEYS.volvelleCompletion);
    return null;
  }

  if (expiresAt <= Date.now()) {
    localStorage.removeItem(STORAGE_KEYS.volvelleCompletion);
    return null;
  }

  return memory;
}

function writeVolvelleCompletionMemory(hits: string[]): VolvelleCompletionMemory {
  const completedAt = new Date();
  const memory: VolvelleCompletionMemory = {
    word: VOLVELLE_SOLVE_WORD,
    stampWord: VOLVELLE_STAMP_WORD,
    hits,
    completedAt: completedAt.toISOString(),
    expiresAt: new Date(completedAt.getTime() + VOLVELLE_REMEMBRANCE_MS).toISOString(),
  };
  writeStoredJson(STORAGE_KEYS.volvelleCompletion, memory);
  return memory;
}

function clearVolvelleCompletionMemory() {
  localStorage.removeItem(STORAGE_KEYS.volvelleCompletion);
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

function mergeEncryptedFolderBranches(folders: EncryptedFolder[]) {
  const byPath = new Map<string, EncryptedFolder>();

  [...SYSTEM_ENCRYPTED_FOLDERS, ...folders].forEach((folder) => {
    byPath.set(folder.path.toLowerCase(), folder);
  });

  return Array.from(byPath.values()).sort((first, second) => first.path.localeCompare(second.path));
}

function originStoryText() {
  return `${PREMISE_TITLE}\n\n${PREMISE_PARAGRAPHS.join("\n\n")}`;
}

function upsertSealedFile(files: SealedFile[], file: SealedFile) {
  return [...files.filter((item) => item.id !== file.id), file];
}

async function makeOriginStorylineFile(): Promise<SealedFile> {
  const plainText = originStoryText();
  const sealed = await sealText(plainText, VOLVELLE_SOLVE_WORD);

  return {
    id: ORIGIN_STORY_FILE_ID,
    name: "PREMISE_ORIGIN.story.txt.enc",
    type: "file",
    path: absoluteFolderPath(ORIGIN_STORY_FOLDER),
    keyLabel: "ORIGIN Story Seal",
    password: VOLVELLE_SOLVE_WORD,
    plainText,
    clue: "Unlocked by completing The Story Begins. This storyline record is mirrored into Notes.",
    size: `${Math.max(1, Math.ceil(plainText.length / 1024))}.${plainText.length % 10} KB`,
    locked: false,
    decryptedText: plainText,
    ...sealed,
  };
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
    event("info", "Connecting to The Reliquary..."),
    event("ok", "Handshake: OK"),
    event("ok", "Vault Key accepted for Archivist-72"),
    event("info", "Directory tree contains seven sealed objects."),
  ]);
  const [volvelleMemory, setVolvelleMemory] = useState<VolvelleCompletionMemory | null>(() =>
    readVolvelleCompletionMemory(),
  );
  const [volvelleHintWallet, setVolvelleHintWallet] = useState<VolvelleHintWallet>(() => readVolvelleHintWallet());
  const [originHits, setOriginHits] = useState<string[]>(() => volvelleMemory?.hits ?? []);
  const [originPremiseOpen, setOriginPremiseOpen] = useState(false);
  const [originAttemptCount, setOriginAttemptCount] = useState(0);
  const lastOriginHitRef = useRef("");

  useEffect(() => {
    let mounted = true;
    sealVaultFiles(vaultFiles).then(async (files) => {
      if (!mounted) {
        return;
      }
      let nextFiles = [...files, ...readStoredJson<SealedFile[]>(STORAGE_KEYS.publishedFiles, [])];
      if (readVolvelleCompletionMemory()) {
        nextFiles = upsertSealedFile(nextFiles, await makeOriginStorylineFile());
      }
      if (!mounted) {
        return;
      }
      setSealedFiles(nextFiles);
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
    const timer = window.setInterval(() => {
      setVolvelleHintWallet((current) => {
        const next = normalizeVolvelleHintWallet(current);
        if (
          next.tokens !== current.tokens ||
          next.refreshedAt !== current.refreshedAt ||
          next.revealed.length !== current.revealed.length
        ) {
          writeVolvelleHintWallet(next);
          return next;
        }
        return current;
      });
    }, 60000);

    return () => window.clearInterval(timer);
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
  const volvelleSignature = detectProbeSignature(offsets);
  const ringAccuracy = progressTowardSolution(offsets);
  const progress = archiveProgress(sealedFiles);
  const displayedEncryptedFolders = useMemo(() => mergeEncryptedFolderBranches(encryptedFolders), [encryptedFolders]);
  const activeVolvellePhase = ORIGIN_GUIDE_STEPS[originHits.length] ?? null;
  const codedFragment = buildCodedFragment(activeVolvellePhase, volvelleSignature);
  const originNextLetter = activeVolvellePhase?.target ?? null;
  const originGuideStepIndex = Math.min(originHits.length, ORIGIN_GUIDE_STEPS.length - 1);
  const originAttemptsRemaining = ORIGIN_ATTEMPT_LIMIT - originAttemptCount;
  const volvellePhaseMatched = activeVolvellePhase
    ? probeSignatureMatches(volvelleSignature, activeVolvellePhase.signature)
    : false;
  const volvelleAnswerSymbol = volvellePhaseMatched ? activeVolvellePhase?.target : null;
  const activeVolvelleHintKey = activeVolvellePhase ? phaseHintKey(activeVolvellePhase.unlockAt) : "";
  const activeVolvelleHint =
    activeVolvellePhase && volvelleHintWallet.revealed.includes(activeVolvelleHintKey) ? activeVolvellePhase.hint : "";
  const hintRefreshLabel = formatHintRefresh(volvelleHintWallet);
  const volvelleRememberedUntil = volvelleMemory
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(volvelleMemory.expiresAt))
    : null;
  const originProgress = Math.round((originHits.length / ORIGIN_SOLVE_LETTERS.length) * 100);
  const dossierProgressRows = [
    {
      label: "Current Chapter",
      value: originNextLetter ? `Seek ${originNextLetter}` : "Storyline Stored",
      width: originNextLetter ? originProgress : 100,
    },
    {
      label: "ORIGIN Seals",
      value: `${originHits.length} / ${ORIGIN_SOLVE_LETTERS.length}`,
      width: originProgress,
    },
    {
      label: "Vault Records",
      value: `${progress}% indexed`,
      width: progress,
    },
  ];

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
    const remembered = readVolvelleCompletionMemory();
    setVolvelleMemory(remembered);
    setOriginHits(remembered?.hits ?? []);
    lastOriginHitRef.current = remembered ? `${VOLVELLE_SOLVE_WORD}:remembered` : "";
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

  async function archiveOriginStoryline(focusRecord = false) {
    const file = await makeOriginStorylineFile();

    setSealedFiles((files) => upsertSealedFile(files, file));

    if (focusRecord) {
      setSelectedFileId(file.id);
      setActiveTab("notes");
      pushEvent("ok", `${file.name} copied into ${ORIGIN_STORY_FOLDER} and mirrored in Notes.`);
    }
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
    const knownFolders = collectKnownFolderPaths(sealedFiles, displayedEncryptedFolders);
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

  function resetOriginChain(message: string, clearMemory = false) {
    if (clearMemory) {
      clearVolvelleCompletionMemory();
      setVolvelleMemory(null);
      setSealedFiles((files) => files.filter((file) => file.id !== ORIGIN_STORY_FILE_ID));
    }
    setOriginHits([]);
    setOriginAttemptCount(0);
    setOriginPremiseOpen(false);
    lastOriginHitRef.current = "";
    pushEvent("warn", message);
  }

  function retryVolvellePuzzle() {
    setOffsets(initialOffsets);
    resetOriginChain(`Retry opened. ${VOLVELLE_SOLVE_WORD} remembrance cleared and the Volvelle is ready again.`, true);
  }

  function useVolvelleHint() {
    if (!activeVolvellePhase) {
      pushEvent("ok", `${VOLVELLE_SOLVE_WORD} is already sealed. No further hint is needed.`);
      return;
    }

    const hintKey = phaseHintKey(activeVolvellePhase.unlockAt);
    const normalized = normalizeVolvelleHintWallet(volvelleHintWallet);

    if (normalized.revealed.includes(hintKey)) {
      setVolvelleHintWallet(normalized);
      writeVolvelleHintWallet(normalized);
      pushEvent("warn", `Phase ${activeVolvellePhase.unlockAt + 1} hint is already revealed.`);
      return;
    }

    if (normalized.tokens <= 0) {
      setVolvelleHintWallet(normalized);
      writeVolvelleHintWallet(normalized);
      pushEvent("error", `No hint tokens remain; ${formatHintRefresh(normalized)}.`);
      return;
    }

    const now = Date.now();
    const next: VolvelleHintWallet = {
      tokens: normalized.tokens - 1,
      refreshedAt: normalized.tokens === VOLVELLE_HINT_MAX_TOKENS ? now : normalized.refreshedAt,
      revealed: [...normalized.revealed, hintKey],
    };
    setVolvelleHintWallet(next);
    writeVolvelleHintWallet(next);
    pushEvent("ok", `Hint token spent on phase ${activeVolvellePhase.unlockAt + 1}. ${next.tokens}/5 remain.`);
  }

  function checkOriginAttempt() {
    if (!originNextLetter) {
      setOriginPremiseOpen(true);
      void archiveOriginStoryline(false);
      pushEvent("ok", `${VOLVELLE_SOLVE_WORD} is already sealed. Premise record reopened.`);
      return;
    }

    if (activeVolvellePhase && volvellePhaseMatched) {
      const nextHits = [...originHits, activeVolvellePhase.target];
      setOriginHits(nextHits);
      setOriginAttemptCount(0);
      lastOriginHitRef.current = `${nextHits.length}:${activeVolvellePhase.target}:${offsets.outer}-${offsets.middle}-${offsets.inner}`;
      pushEvent(
        "ok",
        `TRUE validation: ${activeVolvellePhase.hour} witnessed ${activeVolvellePhase.target} at the final sight and stamped sequence ${offsets.outer}/${offsets.middle}/${offsets.inner}.`,
      );

      if (nextHits.length === ORIGIN_SOLVE_LETTERS.length) {
        const memory = writeVolvelleCompletionMemory(nextHits);
        setVolvelleMemory(memory);
        pushEvent(
          "ok",
          `${VOLVELLE_SOLVE_WORD} sequence complete. Completion remembered for ${VOLVELLE_REMEMBRANCE_DAYS} days.`,
        );
        setOriginPremiseOpen(true);
        void archiveOriginStoryline(true);
      }

      return;
    }

    const nextAttemptCount = originAttemptCount + 1;

    if (nextAttemptCount >= ORIGIN_ATTEMPT_LIMIT) {
      resetOriginChain(
        `Six false final-sight validations exhausted the chain. ${VOLVELLE_SOLVE_WORD} progress reset; begin again at ${ORIGIN_SOLVE_LETTERS[0]}.`,
      );
      return;
    }

    setOriginAttemptCount(nextAttemptCount);
    pushEvent(
      "warn",
      `FALSE validation: the hour is not yet witnessed; seek ${originNextLetter}. False check ${nextAttemptCount}/${ORIGIN_ATTEMPT_LIMIT}.`,
    );
  }

  function autoAlign() {
    setOffsets(SOLUTION_OFFSETS);
    pushEvent("ok", "Wheel aligned to H / 4 / ᚨ. Red needles stabilized.");
  }

  function resetWheel() {
    setOffsets(initialOffsets);
    if (volvelleMemory) {
      pushEvent("warn", `Wheel reset. ${VOLVELLE_SOLVE_WORD} completion remains remembered; use Retry Puzzle to clear it.`);
      return;
    }
    resetOriginChain(`Wheel reset. ${VOLVELLE_SOLVE_WORD} chain and alignment cache cleared.`);
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
          <a href="/Skyrim-Quest-Interactive/download/davinci-web-archive.zip" download>
            Download Archive
          </a>
        </div>
      ) : null}
      <DossierPanel
        session={authSession}
        onSignOut={signOut}
        steps={dossierSteps}
        inventory={inventory}
        progressRows={dossierProgressRows}
      />

      <section className="workbench" aria-label="The Story Begins workbench">
        <header className="workbench-header">
          <div>
            <h1>The Story Begins…</h1>
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
          <CipherWheel offsets={offsets} rotateRing={rotateRing} answerSymbol={volvelleAnswerSymbol} />
          <div className="geometry-mark geometry-left" />
          <div className="geometry-mark geometry-right" />
          <div className="origin-stamp-ledger" aria-label="Validated final sight symbol stamps">
            <span>Final Sight Stamps</span>
            <ol>
              {ZONE_A3_STAMP_LETTERS.map((letter, index) => {
                const found = originHits[index];
                const stampSrc = found ? scriptSymbolSrc(letter) : null;

                return (
                  <li className={found ? "found" : ""} key={`origin-stamp-${letter}-${index}`}>
                    {stampSrc ? (
                      <img src={stampSrc} alt={`${letter} final sight stamp from ${found} validation`} draggable={false} />
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
          <span>Coded Fragment</span>
          <strong>{codedFragment.text}</strong>
          <em>{codedFragment.status}</em>
        </div>

        <section className="origin-riddle" aria-label="Origin volvelle riddle">
          <div className="origin-guide-intro">
            <span>Origin Method</span>
            <p>
              Discover six sequences, one for each letter of {VOLVELLE_SOLVE_WORD}. A candidate does not count until
              the final sight returns TRUE. Each proven letter stamps the hidden glyph clue.
            </p>
            <ol className="origin-discovery-loop">
              <li>Read the current target letter.</li>
              <li>Use the Volvelle Ledger to translate clue descriptions into symbols.</li>
              <li>Place the Star Ledger pair in Zone C.</li>
              <li>Match the Hour Gate and split the Horizon Atlas pair.</li>
              <li>Validate the final sight, then follow the next phase clue.</li>
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
              <strong>{originNextLetter ? `Seek ${originNextLetter}` : `${VOLVELLE_SOLVE_WORD} sealed`}</strong>
              <small>
                {originNextLetter
                  ? `${originAttemptCount}/${ORIGIN_ATTEMPT_LIMIT} false validations - ${originAttemptsRemaining} remain`
                  : volvelleRememberedUntil
                    ? `Remembered until ${volvelleRememberedUntil}`
                    : "Premise record unlocked"}
              </small>
              <div className="origin-attempt-actions">
                <button type="button" onClick={checkOriginAttempt}>
                  {originNextLetter ? "Validate Final Sight" : "Open Premise"}
                </button>
                {!originNextLetter ? (
                  <button type="button" className="retry-puzzle" onClick={retryVolvellePuzzle}>
                    Retry Puzzle
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="origin-hint-panel" aria-label="Volvelle hint tokens">
            <div>
              <strong>Hint Tokens</strong>
              <span>
                {volvelleHintWallet.tokens}/{VOLVELLE_HINT_MAX_TOKENS}
              </span>
              <small>{hintRefreshLabel}</small>
            </div>
            <button
              type="button"
              onClick={useVolvelleHint}
              disabled={!originNextLetter || Boolean(activeVolvelleHint) || volvelleHintWallet.tokens <= 0}
            >
              {activeVolvelleHint ? "Hint Revealed" : "Use Hint"}
            </button>
            <p>{activeVolvelleHint || "Spend one token to reveal a phase-specific nudge."}</p>
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
          <div className="volvelle-ledger" aria-label="Volvelle symbol value ledger">
            <article className="volvelle-ledger-panel horizon">
              <strong>Horizon Atlas</strong>
              <p>Outer ring values. Match the requested letter pair inside the twin horizon.</p>
              <ol>
                {VOLVELLE_HORIZON_LEDGER.map((entry) => (
                  <li key={`horizon-${entry.letter}`}>
                    <b>{entry.letter}</b>
                    <span>
                      {entry.letter}:{entry.value}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
            <article className="volvelle-ledger-panel hours">
              <strong>Hour Gate</strong>
              <p>Middle ring values. Each clue points toward one hour gate.</p>
              <ol>
                {VOLVELLE_HOUR_LEDGER.map((entry) => (
                  <li key={`hour-${entry.hour}`}>
                    <b>{entry.symbol}</b>
                    <span>{entry.hour}</span>
                    <em>{entry.meaning}</em>
                  </li>
                ))}
              </ol>
            </article>
            <article className="volvelle-ledger-panel stars">
              <strong>Star Ledger</strong>
              <p>Inner ring values. Match the clue descriptions to these rows; Zone C must hold the two matching runes.</p>
              <ol>
                {VOLVELLE_STAR_LEDGER.map((entry) => (
                  <li key={`star-${entry.value}`}>
                    <b>{entry.symbol}</b>
                    <span>
                      {entry.value}. {entry.epithet}
                    </span>
                    <em>{entry.meaning}</em>
                  </li>
                ))}
              </ol>
            </article>
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
          {authSession?.role !== "guest" ? (
            <button type="button" className="seal-button primary" onClick={testWheel}>
              <ShieldCheck size={16} />
              Test Decrypt
            </button>
          ) : null}
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

      <aside className={activeTab === "places" ? "vault-column places-mode" : "vault-column"} aria-label="The Reliquary">
        <VaultPanel
          session={authSession}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          files={sealedFiles}
          folders={displayedEncryptedFolders}
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
        {activeTab !== "places" && authSession?.role !== "guest" ? (
          <NoteForge
            session={authSession}
            draft={draft}
            folders={displayedEncryptedFolders}
            setDraft={setDraft}
            onSeal={sealCustomNote}
            busy={busy}
          />
        ) : null}
      </aside>

      {activeTab !== "archivists" && authSession?.role !== "guest" ? (
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
