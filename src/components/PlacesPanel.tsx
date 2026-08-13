import { FormEvent, useState } from "react";
import { ExternalLink, Landmark, Search } from "lucide-react";

type PlaceSourceId = "prima" | "strategy" | "uesp" | "fandom";
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

function wikiPageUrl(source: PlaceSource, page: string) {
  const [pagePath, hash] = page.trim().split("#");
  const normalizedPath = source.kind === "pdf" ? pagePath : pagePath.replace(/\s+/g, "_");
  return `${source.root}${encodeURI(normalizedPath)}${hash ? `#${hash}` : ""}`;
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

export function PlacesPanel() {
  const [sourceId, setSourceId] = useState<PlaceSourceId>("prima");
  const [query, setQuery] = useState("");
  const source = sourceById[sourceId];
  const [targetPage, setTargetPage] = useState(sourceById.prima.defaultPage);
  const targetUrl = wikiPageUrl(source, targetPage);

  function handleSourceChange(nextSource: PlaceSource) {
    setSourceId(nextSource.id);
    setQuery("");
    setTargetPage(nextSource.defaultPage);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTargetPage(searchPage(source, query));
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
        <iframe title={`${source.label} Skyrim places`} src={targetUrl} referrerPolicy="no-referrer-when-downgrade" />
      </div>

      <a className="places-open" href={targetUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={15} />
        {source.openLabel}
      </a>
    </section>
  );
}
