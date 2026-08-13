import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Landmark, Lock, Search, Upload } from "lucide-react";
import {
  GuidePdfSlot,
  importStoredGuidePdf,
  readStoredGuidePdf,
  StoredGuidePdfMeta,
  storedGuidePdfMeta,
} from "../guideArchive";
import type { AuthSession } from "../types";

type PlaceSourceId = "prima" | "strategy" | "uesp" | "fandom";
type PdfSourceId = GuidePdfSlot;
type PlaceSourceKind = "wiki" | "pdf";

type PlaceLink = {
  label: string;
  page: string;
};

type PlaceSource = {
  id: PlaceSourceId;
  kind: PlaceSourceKind;
  label: string;
  root: string;
  defaultPage: string;
  placeholder: string;
  openLabel: string;
  quickLinks: PlaceLink[];
};

const placeSources: PlaceSource[] = [
  {
    id: "prima",
    kind: "pdf",
    label: "Prima PDF",
    root: `${import.meta.env.BASE_URL}guides/`,
    defaultPage: "Skyrim Legendary Edition Prima Official Game Guide.pdf",
    placeholder: "Prima page index, quests, maps...",
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
    kind: "pdf",
    label: "Guide PDF",
    root: `${import.meta.env.BASE_URL}guides/`,
    defaultPage: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf",
    placeholder: "Strategy guide page index...",
    openLabel: "Open Guide PDF",
    quickLinks: [
      { label: "Cover", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf" },
      { label: "Contents", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf#page=5" },
      { label: "Quests", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf#page=76" },
      { label: "Maps", page: "Elder_Scrolls_Skyrim_Official_Strategy_Guide.pdf#page=512" },
    ],
  },
  {
    id: "uesp",
    kind: "wiki",
    label: "UESP",
    root: "https://en.uesp.net/wiki/",
    defaultPage: "Skyrim:Places",
    placeholder: "Whiterun, Blackreach, Riverwood...",
    openLabel: "Open UESP Page",
    quickLinks: [
      { label: "Places", page: "Skyrim:Places" },
      { label: "Cities", page: "Skyrim:Cities" },
      { label: "Holds", page: "Skyrim:Holds" },
      { label: "Settlements", page: "Skyrim:Settlements" },
      { label: "Dungeons", page: "Skyrim:Dungeons" },
      { label: "Caves", page: "Skyrim:Caves" },
      { label: "Forts", page: "Skyrim:Forts" },
      { label: "Nordic Ruins", page: "Skyrim:Nordic_Ruins" },
    ],
  },
  {
    id: "fandom",
    kind: "wiki",
    label: "Fandom",
    root: "https://elderscrolls.fandom.com/wiki/",
    defaultPage: "The_Elder_Scrolls_Wiki",
    placeholder: "Whiterun, Dragonborn, Locations...",
    openLabel: "Open Fandom Page",
    quickLinks: [
      { label: "Wiki Home", page: "The_Elder_Scrolls_Wiki" },
      { label: "Skyrim", page: "The_Elder_Scrolls_V:_Skyrim" },
      { label: "Locations", page: "Locations_(Skyrim)" },
      { label: "Cities", page: "Cities_(Skyrim)" },
      { label: "Holds", page: "Holds" },
      { label: "Whiterun", page: "Whiterun_(Skyrim)" },
      { label: "Blackreach", page: "Blackreach_(Skyrim)" },
      { label: "Dungeons", page: "Dungeons_(Skyrim)" },
    ],
  },
];

const sourceById = placeSources.reduce<Record<PlaceSourceId, PlaceSource>>(
  (sources, source) => ({ ...sources, [source.id]: source }),
  {} as Record<PlaceSourceId, PlaceSource>,
);

function isPdfSourceId(sourceId: PlaceSourceId): sourceId is PdfSourceId {
  return sourceId === "prima" || sourceId === "strategy";
}

function pageHash(page: string) {
  const hashIndex = page.indexOf("#");
  return hashIndex >= 0 ? page.slice(hashIndex) : "";
}

function wikiPageUrl(source: PlaceSource, page: string) {
  const trimmedPage = page.trim();
  const hashIndex = trimmedPage.indexOf("#");
  const pagePath = hashIndex >= 0 ? trimmedPage.slice(0, hashIndex) : trimmedPage;
  const hash = hashIndex >= 0 ? trimmedPage.slice(hashIndex) : "";
  const normalizedPath = pagePath.replace(/\s+/g, "_");
  return `${source.root}${encodeURI(normalizedPath)}${hash}`;
}

function pdfFrameUrl(page: string, objectUrl?: string) {
  return objectUrl ? `${objectUrl}${pageHash(page)}` : "";
}

function searchPage(source: PlaceSource, query: string) {
  const cleaned = query.trim();
  if (!cleaned) {
    return source.defaultPage;
  }

  if (source.kind === "pdf") {
    return /^\d+$/.test(cleaned)
      ? `${source.defaultPage}#page=${cleaned}`
      : `${source.defaultPage}#search=${encodeURIComponent(cleaned)}`;
  }

  if (source.id === "uesp") {
    return /^[^:]+:/.test(cleaned) ? cleaned : `Skyrim:${cleaned}`;
  }

  return cleaned;
}

type PlacesPanelProps = {
  session: AuthSession | null;
};

export function PlacesPanel({ session }: PlacesPanelProps) {
  const [sourceId, setSourceId] = useState<PlaceSourceId>("prima");
  const [query, setQuery] = useState("");
  const source = sourceById[sourceId];
  const [targetPage, setTargetPage] = useState(sourceById.prima.defaultPage);
  const [pdfObjectUrls, setPdfObjectUrls] = useState<Partial<Record<PdfSourceId, string>>>({});
  const [pdfMeta, setPdfMeta] = useState<Partial<Record<PdfSourceId, StoredGuidePdfMeta>>>({});
  const [pdfStatus, setPdfStatus] = useState("Guide archive sealed.");
  const pdfObjectUrlsRef = useRef(pdfObjectUrls);
  const activePdfUrl = isPdfSourceId(source.id) ? pdfObjectUrls[source.id] : undefined;
  const activePdfMeta = isPdfSourceId(source.id) ? pdfMeta[source.id] : undefined;
  const targetUrl = source.kind === "pdf" ? pdfFrameUrl(targetPage, activePdfUrl) : wikiPageUrl(source, targetPage);
  const pdfInputId = `places-pdf-${source.id}`;
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

      const nextUrls: Partial<Record<PdfSourceId, string>> = {};
      const nextMeta: Partial<Record<PdfSourceId, StoredGuidePdfMeta>> = {};
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

  function handleSourceChange(nextSource: PlaceSource) {
    setSourceId(nextSource.id);
    setQuery("");
    setTargetPage(nextSource.defaultPage);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTargetPage(searchPage(source, query));
  }

  async function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const pdfSourceId = source.id;
    if (!file || !isPdfSourceId(pdfSourceId)) {
      return;
    }

    if (!canImportPdf) {
      setPdfStatus("Only ADMIN can lock guide PDFs into the archive.");
      input.value = "";
      return;
    }

    if (pdfMeta[pdfSourceId]) {
      setPdfStatus(`${source.label} is already locked into the archive.`);
      input.value = "";
      return;
    }

    let record;
    try {
      record = await importStoredGuidePdf(pdfSourceId, file, session.username);
    } catch (error) {
      const isConstraintError = error instanceof DOMException && error.name === "ConstraintError";
      setPdfStatus(isConstraintError ? `${source.label} is already locked into the archive.` : "Guide import failed.");
      input.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(record.blob);
    setPdfObjectUrls((currentUrls) => {
      const previousObjectUrl = currentUrls[pdfSourceId];
      if (previousObjectUrl) {
        URL.revokeObjectURL(previousObjectUrl);
      }
      return { ...currentUrls, [pdfSourceId]: objectUrl };
    });
    setPdfMeta((currentMeta) => ({ ...currentMeta, [pdfSourceId]: storedGuidePdfMeta(record) }));
    setPdfStatus(`${source.label} imported and locked.`);
    setTargetPage(`${source.defaultPage}${pageHash(targetPage)}`);
    input.value = "";
  }

  return (
    <section className="places-panel" aria-label="Skyrim places browser">
      <header className="places-header">
        <div>
          <h3>Skyrim Archive Index</h3>
          <p>Live guide, wiki, map, and field-note lookup.</p>
        </div>
        <Landmark size={22} />
      </header>

      <div className="places-source-toggle" role="group" aria-label="Wiki source">
        {placeSources.map((nextSource) => (
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

      <form className="places-search" onSubmit={handleSubmit}>
        <label htmlFor="places-search-input">
          <Search size={15} />
          <input
            id="places-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={source.placeholder}
          />
        </label>
        <button type="submit" aria-label={`Search ${source.label}`}>
          <Search size={16} />
        </button>
      </form>

      <div className="places-quick-links" aria-label={`${source.label} quick links`}>
        {source.quickLinks.map((link) => (
          <button type="button" key={link.page} onClick={() => setTargetPage(link.page)}>
            {link.label}
          </button>
        ))}
      </div>

      <div className="places-frame-window">
        {source.kind === "pdf" && canImportPdf && !activePdfMeta ? (
          <input id={pdfInputId} className="pdf-file-input" type="file" accept="application/pdf,.pdf" onChange={handlePdfFileChange} />
        ) : null}
        {targetUrl ? (
          <>
            <iframe title={`${source.label} Skyrim places`} src={targetUrl} referrerPolicy="no-referrer-when-downgrade" />
            {source.kind === "pdf" ? (
              <div className="pdf-lock-badge">
                <Lock size={14} />
                Locked Import
              </div>
            ) : null}
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

      {source.kind === "pdf" ? (
        <div className="pdf-archive-status" aria-live="polite">
          {activePdfMeta ? <CheckCircle2 size={15} /> : <Lock size={15} />}
          <span>{activePdfMeta ? `${activePdfMeta.name} locked by ${activePdfMeta.importedBy}` : pdfStatus}</span>
        </div>
      ) : null}

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
