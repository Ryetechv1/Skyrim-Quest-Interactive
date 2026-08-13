import { FormEvent, useState } from "react";
import { ExternalLink, Landmark, Search } from "lucide-react";

const UESP_WIKI_ROOT = "https://en.uesp.net/wiki/";
const DEFAULT_PAGE = "Skyrim:Places";

const quickLinks = [
  { label: "Places", page: "Skyrim:Places" },
  { label: "Cities", page: "Skyrim:Cities" },
  { label: "Holds", page: "Skyrim:Holds" },
  { label: "Settlements", page: "Skyrim:Settlements" },
  { label: "Dungeons", page: "Skyrim:Dungeons" },
  { label: "Caves", page: "Skyrim:Caves" },
  { label: "Forts", page: "Skyrim:Forts" },
  { label: "Nordic Ruins", page: "Skyrim:Nordic_Ruins" },
];

function wikiPageUrl(page: string) {
  return `${UESP_WIKI_ROOT}${encodeURI(page.trim().replace(/\s+/g, "_"))}`;
}

function searchPageUrl(query: string) {
  const cleaned = query.trim();
  if (!cleaned) {
    return wikiPageUrl(DEFAULT_PAGE);
  }

  return wikiPageUrl(/^[^:]+:/.test(cleaned) ? cleaned : `Skyrim:${cleaned}`);
}

export function PlacesPanel() {
  const [query, setQuery] = useState("");
  const [targetUrl, setTargetUrl] = useState(wikiPageUrl(DEFAULT_PAGE));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTargetUrl(searchPageUrl(query));
  }

  return (
    <section className="places-panel" aria-label="UESP Skyrim places browser">
      <header className="places-header">
        <div>
          <h3>Skyrim Places Index</h3>
          <p>Live UESP lookup for towns, ruins, holds, dungeons, and field notes.</p>
        </div>
        <Landmark size={22} />
      </header>

      <form className="places-search" onSubmit={handleSubmit}>
        <label htmlFor="places-search-input">
          <Search size={15} />
          <input
            id="places-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Whiterun, Blackreach, Riverwood..."
          />
        </label>
        <button type="submit" aria-label="Search UESP">
          <Search size={16} />
        </button>
      </form>

      <div className="places-quick-links" aria-label="UESP quick links">
        {quickLinks.map((link) => (
          <button type="button" key={link.page} onClick={() => setTargetUrl(wikiPageUrl(link.page))}>
            {link.label}
          </button>
        ))}
      </div>

      <div className="places-frame-window">
        <iframe title="UESP Skyrim Places" src={targetUrl} referrerPolicy="no-referrer-when-downgrade" />
      </div>

      <a className="places-open" href={targetUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={15} />
        Open UESP Page
      </a>
    </section>
  );
}
