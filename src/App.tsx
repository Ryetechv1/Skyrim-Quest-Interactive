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
import { dossierSteps, inventory, vaultFiles } from "./data";
import { openText, sealText, sealVaultFiles } from "./crypto";
import {
  decodedFragment,
  isWheelSolved,
  progressTowardSolution,
  SOLUTION_OFFSETS,
  wheelChecksum,
} from "./wheel";
import type { NoteDraft, RingName, RingOffsets, SealedFile, TerminalEvent } from "./types";

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

function event(kind: TerminalEvent["kind"], text: string): TerminalEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    text,
  };
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
  const [selectedFileId, setSelectedFileId] = useState(vaultFiles[0].id);
  const [passphrase, setPassphrase] = useState("R3LIQU4RY-72");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [activeTab, setActiveTab] = useState("vault");
  const [accessGranted, setAccessGranted] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(defaultDraft);
  const [busy, setBusy] = useState(false);
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
      setSealedFiles(files);
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

  function rotateRing(ring: RingName, delta: number) {
    setOffsets((current) => ({
      ...current,
      [ring]: (current[ring] + delta + 26) % 26,
    }));
  }

  function autoAlign() {
    setOffsets(SOLUTION_OFFSETS);
    pushEvent("ok", "Wheel aligned to H / ✺ / ᚨ. Red needles stabilized.");
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

    setBusy(true);
    const normalizedTitle = draft.title.endsWith(".enc") ? draft.title : `${draft.title}.enc`;
    const sealed = await sealText(draft.body, draft.passphrase.trim());
    const file: SealedFile = {
      id: `custom-${Date.now()}`,
      name: normalizedTitle,
      type: "file",
      path: `Archive: MASK_OF_DESPAIR.mega/${draft.folder}`,
      keyLabel: "Custom Password",
      password: draft.passphrase.trim(),
      plainText: draft.body,
      clue: "A note sealed during this investigation.",
      size: `${Math.max(1, Math.ceil(draft.body.length / 128))}.${draft.body.length % 10} KB`,
      locked: true,
      ...sealed,
    };

    setSealedFiles((files) => [...files, file]);
    setSelectedFileId(file.id);
    setActiveTab("vault");
    pushEvent("ok", `${file.name} sealed into ${draft.folder}`);
    setBusy(false);
  }

  function downloadMegaArchive() {
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
        steps={dossierSteps}
        inventory={inventory.map((item) => ({
          ...item,
          acquired:
            item.acquired ||
            (item.id === "seal-ring" && knownKeys.includes("VERITAS")) ||
            (item.id === "folding-key" && knownKeys.includes("OCCULTA")) ||
            (item.id === "wax" && sealedFiles.some((file) => file.id.startsWith("custom-"))),
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          files={sealedFiles}
          selectedFileId={selectedFileId}
          setSelectedFileId={setSelectedFileId}
          terminalEvents={terminalEvents}
          knownKeys={knownKeys}
          busy={busy}
        />
        <NoteForge draft={draft} setDraft={setDraft} onSeal={sealCustomNote} busy={busy} />
      </aside>

      <button type="button" className="floating-add" onClick={() => setActiveTab("notes")} aria-label="Open note forge">
        <Plus size={20} />
      </button>

      {!accessGranted ? (
        <AccessGate
          onUnlock={() => {
            setAccessGranted(true);
            pushEvent("ok", "GUI password access accepted: YOU MAY NOW ENTER");
          }}
        />
      ) : null}
    </main>
  );
}
