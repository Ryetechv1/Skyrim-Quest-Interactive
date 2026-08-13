import { FormEvent, useState } from "react";
import { ExternalLink, Landmark, Search } from "lucide-react";

type PlaceSourceId = "uesp" | "fandom";

type PlaceLink = {
  label: string;
  page: string;
};

type PlaceSource = {
  id: PlaceSourceId;
  label: string;
  root: string;
  defaultPage: string;
  placeholder: string;
  openLabel: string;
  quickLinks: PlaceLink[];
};

const placeSources: PlaceSource[] = [
  {
    id: "uesp",
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
  const trimmedPage = page.trim();
  const hashIndex = trimmedPage.indexOf("#");
  const pagePath = hashIndex >= 0 ? trimmedPage.slice(0, hashIndex) : trimmedPage;
  const hash = hashIndex >= 0 ? trimmedPage.slice(hashIndex) : "";
  const normalizedPath = pagePath.replace(/\s+/g, "_");
  return `${source.root}${encodeURI(normalizedPath)}${hash}`;
}

function searchPage(source: PlaceSource, query: string) {
  const cleaned = query.trim();
  if (!cleaned) {
    return source.defaultPage;
  }

  if (source.id === "uesp") {
    return /^[^:]+:/.test(cleaned) ? cleaned : `Skyrim:${cleaned}`;
  }

  return cleaned;
}

export function PlacesPanel() {
  const [sourceId, setSourceId] = useState<PlaceSourceId>("uesp");
  const [query, setQuery] = useState("");
  const source = sourceById[sourceId];
  const [targetPage, setTargetPage] = useState(sourceById.uesp.defaultPage);
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
          <h3>Skyrim Places Index</h3>
          <p>Live wiki, map, and field-note lookup.</p>
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
