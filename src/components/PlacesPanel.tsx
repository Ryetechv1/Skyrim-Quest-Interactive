import { FormEvent, useEffect, useState } from "react";
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
  quickLinks: PlaceLink[];
};

type FandomSearchResult = {
  title: string;
  pageid: number;
  wordcount: number;
  timestamp: string;
};

type FandomArticle = {
  title: string;
  body: string;
};

const placeSources: PlaceSource[] = [
  {
    id: "uesp",
    label: "UESP",
    root: "https://en.uesp.net/wiki/",
    defaultPage: "Skyrim:Places",
    placeholder: "Whiterun, Blackreach, Riverwood...",
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
  return `${source.root}${encodeURI(page.trim().replace(/\s+/g, "_"))}`;
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

function decodeHtml(value: string) {
  const parser = new DOMParser();
  return parser.parseFromString(value, "text/html").documentElement.textContent?.trim() ?? value;
}

function textFromHtml(value: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  doc.querySelectorAll("sup, table, style, script, .reference, .references").forEach((node) => node.remove());
  return decodeHtml(doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function fandomApiUrl(params: Record<string, string>) {
  const url = new URL("https://elderscrolls.fandom.com/api.php");
  Object.entries({
    format: "json",
    origin: "*",
    ...params,
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function loadFandomSearch(query: string): Promise<FandomSearchResult[]> {
  const response = await fetch(
    fandomApiUrl({
      action: "query",
      list: "search",
      srsearch: query || sourceById.fandom.defaultPage,
      srlimit: "8",
    }),
  );
  if (!response.ok) {
    throw new Error("Fandom search failed");
  }
  const payload = (await response.json()) as { query?: { search?: FandomSearchResult[] } };
  return payload.query?.search ?? [];
}

async function loadFandomArticle(page: string): Promise<FandomArticle> {
  const response = await fetch(
    fandomApiUrl({
      action: "parse",
      page,
      prop: "text|displaytitle",
      section: "0",
    }),
  );
  if (!response.ok) {
    throw new Error("Fandom article failed");
  }

  const payload = (await response.json()) as {
    parse?: {
      title?: string;
      displaytitle?: string;
      text?: { "*": string };
    };
  };
  const title = decodeHtml(payload.parse?.displaytitle ?? payload.parse?.title ?? page);
  const body = textFromHtml(payload.parse?.text?.["*"] ?? "").slice(0, 1200);
  return { title, body };
}

export function PlacesPanel() {
  const [sourceId, setSourceId] = useState<PlaceSourceId>("uesp");
  const [query, setQuery] = useState("");
  const source = sourceById[sourceId];
  const [targetPage, setTargetPage] = useState(sourceById.uesp.defaultPage);
  const [fandomResults, setFandomResults] = useState<FandomSearchResult[]>([]);
  const [fandomArticle, setFandomArticle] = useState<FandomArticle | null>(null);
  const [fandomStatus, setFandomStatus] = useState<"idle" | "loading" | "error">("idle");
  const targetUrl = wikiPageUrl(source, targetPage);

  useEffect(() => {
    if (sourceId !== "fandom") {
      return;
    }

    let active = true;
    setFandomStatus("loading");
    Promise.all([
      loadFandomSearch(targetPage.replace(/_/g, " ")),
      loadFandomArticle(targetPage),
    ])
      .then(([results, article]) => {
        if (!active) {
          return;
        }
        setFandomResults(results);
        setFandomArticle(article);
        setFandomStatus("idle");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setFandomResults([]);
        setFandomArticle(null);
        setFandomStatus("error");
      });

    return () => {
      active = false;
    };
  }, [sourceId, targetPage]);

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
          <p>Live wiki lookup for towns, ruins, holds, dungeons, and field notes.</p>
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
        {sourceId === "uesp" ? (
          <iframe title={`${source.label} Skyrim places`} src={targetUrl} referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <div className="fandom-browser" aria-live="polite">
            <section className="fandom-article">
              <span>{fandomStatus === "loading" ? "Indexing Fandom archive..." : "Elder Scrolls Fandom"}</span>
              <h4>{fandomArticle?.title ?? targetPage.replace(/_/g, " ")}</h4>
              <p>
                {fandomStatus === "error"
                  ? "Fandom archive lookup failed. External page link remains available."
                  : fandomArticle?.body || "Select a Fandom result or run a search to load a field entry."}
              </p>
            </section>
            <div className="fandom-results" aria-label="Fandom search results">
              {fandomResults.map((result) => (
                <button type="button" key={result.pageid} onClick={() => setTargetPage(result.title)}>
                  <strong>{result.title}</strong>
                  <span>
                    {result.wordcount.toLocaleString()} words - {new Date(result.timestamp).getFullYear()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <a className="places-open" href={targetUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={15} />
        Open {source.label} Page
      </a>
    </section>
  );
}
