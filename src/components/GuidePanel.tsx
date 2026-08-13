import { ChangeEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Lock, ScrollText, Upload } from "lucide-react";
import {
  GuidePdfSlot,
  importStoredGuidePdf,
  readStoredGuidePdf,
  StoredGuidePdfMeta,
  storedGuidePdfMeta,
} from "../guideArchive";
import type { AuthSession } from "../types";

type GuideSource = {
  id: GuidePdfSlot;
  label: string;
  defaultPage: string;
  openLabel: string;
  quickLinks: {
    label: string;
    page: string;
  }[];
};

const archiveEmbedSrc = "https://archive.org/embed/skyrim-legendary-edition-prima-official-game-guide-shortcut";
const archiveShortcode =
  "[archiveorg skyrim-legendary-edition-prima-official-game-guide-shortcut width=560 height=384 frameborder=0 webkitallowfullscreen=true mozallowfullscreen=true]";

const guideSources: GuideSource[] = [
  {
    id: "prima",
    label: "Prima PDF",
    defaultPage: "Skyrim Legendary Edition Prima Official Game Guide.pdf",
    openLabel: "Open Prima PDF",
    quickLinks: [
      { label: "Cover", page: "Skyrim Legendary Edition Prima Official Game Guide.pdf" },
      { label: "Index", page: "Skyrim Legendary Edition Prima Official Game Guide.pdf#page=6" },
      { label: "Main Quest", page: "Skyrim Legendary Edition Prima Official Game Guide.pdf#page=86" },
      { label: "Cities", page: "Skyrim Legendary Edition Prima Official Game Guide.pdf#page=276" },
    ],
  },
  {
    id: "strategy",
    label: "Guide PDF",
    defaultPage: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf",
    openLabel: "Open Guide PDF",
    quickLinks: [
      { label: "Cover", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf" },
      { label: "Contents", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf#page=5" },
      { label: "Quests", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf#page=76" },
      { label: "Maps", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf#page=512" },
    ],
  },
];

const guideSourceById = guideSources.reduce<Record<GuidePdfSlot, GuideSource>>(
  (sources, source) => ({ ...sources, [source.id]: source }),
  {} as Record<GuidePdfSlot, GuideSource>,
);

function pageHash(page: string) {
  const hashIndex = page.indexOf("#");
  return hashIndex >= 0 ? page.slice(hashIndex) : "";
}

function pdfFrameUrl(page: string, objectUrl?: string) {
  return objectUrl ? `${objectUrl}${pageHash(page)}` : "";
}

type GuidePanelProps = {
  session: AuthSession | null;
};

export function GuidePanel({ session }: GuidePanelProps) {
  const [sourceId, setSourceId] = useState<GuidePdfSlot>("prima");
  const source = guideSourceById[sourceId];
  const [targetPage, setTargetPage] = useState(source.defaultPage);
  const [pdfObjectUrls, setPdfObjectUrls] = useState<Partial<Record<GuidePdfSlot, string>>>({});
  const [pdfMeta, setPdfMeta] = useState<Partial<Record<GuidePdfSlot, StoredGuidePdfMeta>>>({});
  const [pdfStatus, setPdfStatus] = useState("Guide archive sealed.");
  const pdfObjectUrlsRef = useRef(pdfObjectUrls);
  const activePdfUrl = pdfObjectUrls[source.id];
  const activePdfMeta = pdfMeta[source.id];
  const targetUrl = pdfFrameUrl(targetPage, activePdfUrl);
  const pdfInputId = `guide-pdf-${source.id}`;
  const canImportPdf = session?.role === "admin";

  useEffect(() => {
    pdfObjectUrlsRef.current = pdfObjectUrls;
  }, [pdfObjectUrls]);

  useEffect(() => {
    let mounted = true;

    async function loadStoredPdfs() {
      const records = await Promise.all([readStoredGuidePdf("prima"), readStoredGuidePdf("strategy")]);
      if (!mounted) {
        return;
      }

      const nextUrls: Partial<Record<GuidePdfSlot, string>> = {};
      const nextMeta: Partial<Record<GuidePdfSlot, StoredGuidePdfMeta>> = {};
      records.forEach((record) => {
        if (!record) {
          return;
        }
        nextUrls[record.slot] = URL.createObjectURL(record.blob);
        nextMeta[record.slot] = storedGuidePdfMeta(record);
      });

      setPdfObjectUrls((currentUrls) => {
        Object.values(currentUrls).forEach((objectUrl) => {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        });
        return nextUrls;
      });
      setPdfMeta(nextMeta);
      setPdfStatus(Object.keys(nextMeta).length ? "Locked guide imports available." : "Guide archive awaiting ADMIN import.");
    }

    loadStoredPdfs().catch(() => {
      if (mounted) {
        setPdfStatus("Guide archive storage is unavailable.");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(pdfObjectUrlsRef.current).forEach((objectUrl) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      });
    },
    [],
  );

  function handleSourceChange(nextSource: GuideSource) {
    setSourceId(nextSource.id);
    setTargetPage(nextSource.defaultPage);
  }

  async function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!canImportPdf) {
      setPdfStatus("Only ADMIN can lock guide PDFs into the archive.");
      input.value = "";
      return;
    }

    if (pdfMeta[source.id]) {
      setPdfStatus(`${source.label} is already locked into the archive.`);
      input.value = "";
      return;
    }

    let record;
    try {
      record = await importStoredGuidePdf(source.id, file, session.username);
    } catch (error) {
      const isConstraintError = error instanceof DOMException && error.name === "ConstraintError";
      setPdfStatus(isConstraintError ? `${source.label} is already locked into the archive.` : "Guide import failed.");
      input.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(record.blob);
    setPdfObjectUrls((currentUrls) => {
      const previousObjectUrl = currentUrls[source.id];
      if (previousObjectUrl) {
        URL.revokeObjectURL(previousObjectUrl);
      }
      return { ...currentUrls, [source.id]: objectUrl };
    });
    setPdfMeta((currentMeta) => ({ ...currentMeta, [source.id]: storedGuidePdfMeta(record) }));
    setPdfStatus(`${source.label} imported and locked.`);
    setTargetPage(`${source.defaultPage}${pageHash(targetPage)}`);
    input.value = "";
  }

  return (
    <section className="guide-panel" aria-label="Skyrim guide archive viewer">
      <header className="places-header">
        <div>
          <h3>Guide Archive Viewer</h3>
          <p>Archive.org embed and locked local PDF import shelf.</p>
        </div>
        <ScrollText size={22} />
      </header>

      <div className="archive-org-embed">
        <iframe
          title="Archive.org Skyrim Legendary Edition Prima Official Game Guide"
          src={archiveEmbedSrc}
          width="560"
          height="384"
          frameBorder="0"
          allowFullScreen
        />
      </div>

      <code className="archive-shortcode">{archiveShortcode}</code>

      <div className="places-source-toggle" role="group" aria-label="Guide PDF source">
        {guideSources.map((nextSource) => (
          <button
            type="button"
            key={nextSource.id}
            className={sourceId === nextSource.id ? "active" : undefined}
            aria-pressed={sourceId === nextSource.id}
            onClick={() => handleSourceChange(nextSource)}
          >
            {nextSource.label}
          </button>
        ))}
      </div>

      <div className="places-quick-links" aria-label={`${source.label} quick links`}>
        {source.quickLinks.map((link) => (
          <button type="button" key={link.page} onClick={() => setTargetPage(link.page)}>
            {link.label}
          </button>
        ))}
      </div>

      <div className="places-frame-window guide-pdf-window">
        {canImportPdf && !activePdfMeta ? (
          <input id={pdfInputId} className="pdf-file-input" type="file" accept="application/pdf,.pdf" onChange={handlePdfFileChange} />
        ) : null}
        {targetUrl ? (
          <>
            <iframe title={`${source.label} local PDF guide`} src={targetUrl} referrerPolicy="no-referrer-when-downgrade" />
            <div className="pdf-lock-badge">
              <Lock size={14} />
              Locked Import
            </div>
          </>
        ) : (
          <div className="pdf-loader-panel">
            <div>
              <span>{source.label}</span>
              <strong>{canImportPdf ? "ADMIN Import Slot" : "Import Locked"}</strong>
            </div>
            {canImportPdf ? (
              <label className="pdf-loader-button" htmlFor={pdfInputId}>
                <Upload size={16} />
                Lock PDF Import
              </label>
            ) : (
              <div className="pdf-loader-note">
                <Lock size={16} />
                Waiting for ADMIN
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pdf-archive-status" aria-live="polite">
        {activePdfMeta ? <CheckCircle2 size={15} /> : <Lock size={15} />}
        <span>{activePdfMeta ? `${activePdfMeta.name} locked by ${activePdfMeta.importedBy}` : pdfStatus}</span>
      </div>

      {targetUrl ? (
        <a className="places-open" href={targetUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          {source.openLabel}
        </a>
      ) : (
        <button className="places-open" type="button" disabled>
          <ExternalLink size={15} />
          {source.openLabel}
        </button>
      )}
    </section>
  );
}
