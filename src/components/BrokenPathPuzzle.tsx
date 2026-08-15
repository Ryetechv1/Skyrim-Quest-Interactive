import { GitBranch, Lock, RefreshCcw, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { scriptSymbolSrc } from "./CipherWheel";
import type { TerminalEvent } from "../types";

export const BROKEN_PATH_FINAL_WORD = "AURIEL";

export type BrokenPathState = {
  solvedPairIds: string[];
  routeSelections: Record<string, string>;
  completedAt?: string;
  finalWord?: string;
};

type Manuscript = {
  id: string;
  numeral: string;
  title: string;
  relic: string;
  hiddenLetter: string;
  excerpt: string;
};

type ManuscriptPair = {
  id: string;
  title: string;
  manuscriptIds: [string, string];
  segmentId: string;
  fragment: string;
  clue: string;
};

type MazeRoute = {
  id: string;
  fragment: string;
  label: string;
  clue: string;
};

type MazeSegment = {
  id: string;
  title: string;
  pairId: string;
  routes: MazeRoute[];
};

type BrokenPathPuzzleProps = {
  unlocked: boolean;
  state: BrokenPathState;
  onStateChange: (state: BrokenPathState) => void;
  onLog?: (kind: TerminalEvent["kind"], text: string) => void;
};

export const DEFAULT_BROKEN_PATH_STATE: BrokenPathState = {
  solvedPairIds: [],
  routeSelections: {},
};

const MANUSCRIPTS: Manuscript[] = [
  {
    id: "ada-mantia",
    numeral: "I",
    title: "The Mason at the Edge of the Unmade Sea",
    relic: "Ur-Tower",
    hiddenLetter: "A",
    excerpt:
      "Arenwe found no scaffolds, no roads, and no quarry scars. The world learned direction only because the white spike stood first, and in one cracked foundation line the first half-mark sleeps.",
  },
  {
    id: "zero-stone",
    numeral: "II",
    title: "The Number Before One",
    relic: "Zero Stone",
    hiddenLetter: "U",
    excerpt:
      "The scribe counts nothing, then bows. Beneath the eldest tower is the measure that precedes measurement, a hollow numeral hidden inside an astronomical seal.",
  },
  {
    id: "time-dragon",
    numeral: "III",
    title: "The Dragon Who Measured Dawn",
    relic: "Auri-El",
    hiddenLetter: "R",
    excerpt:
      "Not the world-eater, not the son of ending. This dragon weighs the first morning, crowns the first verdict, and leaves a talon-cut in the margin of the sun.",
  },
  {
    id: "east-arrow",
    numeral: "IV",
    title: "The Arrow Without a Bow",
    relic: "Judgment",
    hiddenLetter: "I",
    excerpt:
      "A bright line flies east from the council, though no hunter claims the shot. The path of judgment is thin enough to hide between two ink strokes.",
  },
  {
    id: "heart-wound",
    numeral: "V",
    title: "The Heart That Would Not Die",
    relic: "Lorkhan",
    hiddenLetter: "E",
    excerpt:
      "The accused loses what cannot be slain. Where the torn heart should leave silence, the manuscript stains itself with a living ember.",
  },
  {
    id: "red-mountain",
    numeral: "VI",
    title: "The Mountain That Learned to Burn",
    relic: "Red Tower",
    hiddenLetter: "L",
    excerpt:
      "Ash remembers impact better than stone. Fire rises around the fallen heart, and the second anchor marks itself in red geometry.",
  },
];

const PAIRS: ManuscriptPair[] = [
  {
    id: "convention",
    title: "Sigil of Convention",
    manuscriptIds: ["ada-mantia", "zero-stone"],
    segmentId: "first-gate",
    fragment: "AU",
    clue: "The first fixed place and the number beneath it must be overlaid before any route can begin.",
  },
  {
    id: "time-arrow",
    title: "Sigil of the Measured Arrow",
    manuscriptIds: ["time-dragon", "east-arrow"],
    segmentId: "middle-gate",
    fragment: "RI",
    clue: "The Dragon of beginning and the eastward judgment share one flight.",
  },
  {
    id: "red-heart",
    title: "Sigil of Red Consequence",
    manuscriptIds: ["heart-wound", "red-mountain"],
    segmentId: "final-gate",
    fragment: "EL",
    clue: "The unslain heart and the burning mountain complete the wound.",
  },
];

const MAZE_SEGMENTS: MazeSegment[] = [
  {
    id: "first-gate",
    title: "I. Balfiera Mouth",
    pairId: "convention",
    routes: [
      { id: "route-dr", fragment: "DR", label: "Broken coast", clue: "The storm begins too late." },
      { id: "route-au", fragment: "AU", label: "First standing", clue: "The route that begins before roads." },
      { id: "route-ao", fragment: "AO", label: "Hollow crown", clue: "A tempting tower without its stone." },
      { id: "route-ul", fragment: "UL", label: "Silent well", clue: "Nothing descends here." },
      { id: "route-ar", fragment: "AR", label: "White scar", clue: "Only half of the first witness." },
    ],
  },
  {
    id: "middle-gate",
    title: "II. Judgment Span",
    pairId: "time-arrow",
    routes: [
      { id: "route-ir", fragment: "IR", label: "Backward omen", clue: "The arrow returns to the hand." },
      { id: "route-ri", fragment: "RI", label: "Measured flight", clue: "The Time Dragon watches the cast line." },
      { id: "route-ak", fragment: "AK", label: "Eater shadow", clue: "This speaks too much of ending." },
    ],
  },
  {
    id: "final-gate",
    title: "III. Ash Gate",
    pairId: "red-heart",
    routes: [
      { id: "route-ht", fragment: "HT", label: "Dead ember", clue: "A heart without mountain." },
      { id: "route-el", fragment: "EL", label: "Red consequence", clue: "The wound and the tower burn together." },
      { id: "route-le", fragment: "LE", label: "Inverted wound", clue: "The mountain arrives before the fall." },
      { id: "route-lo", fragment: "LO", label: "Old accusation", clue: "The trial is not yet impact." },
    ],
  },
];

function sortedPair(ids: string[]) {
  return [...ids].sort().join("|");
}

function pairIsSolved(state: BrokenPathState, pairId: string) {
  return state.solvedPairIds.includes(pairId);
}

function correctRouteForSegment(segment: MazeSegment) {
  const pair = PAIRS.find((candidate) => candidate.id === segment.pairId);
  return segment.routes.find((route) => route.fragment === pair?.fragment);
}

export function brokenPathSolved(state: BrokenPathState) {
  return Boolean(state.completedAt && state.finalWord === BROKEN_PATH_FINAL_WORD);
}

export function brokenPathProgress(state: BrokenPathState) {
  const solvedPairs = new Set(state.solvedPairIds).size;
  const routeHits = MAZE_SEGMENTS.filter(
    (segment) => state.routeSelections[segment.id] === correctRouteForSegment(segment)?.id,
  ).length;
  const completion = brokenPathSolved(state) ? 1 : 0;

  return Math.round(((solvedPairs + routeHits + completion) / 7) * 100);
}

function FragmentSymbols({ fragment }: { fragment: string }) {
  return (
    <span className="broken-fragment-symbols" aria-label={`${fragment} sigil`}>
      {fragment.split("").map((letter) => {
        const symbol = scriptSymbolSrc(letter);
        return symbol ? <img key={letter} src={symbol} alt={letter} draggable={false} /> : <b key={letter}>{letter}</b>;
      })}
    </span>
  );
}

export function BrokenPathPuzzle({ unlocked, state, onStateChange, onLog }: BrokenPathPuzzleProps) {
  const [selectedManuscripts, setSelectedManuscripts] = useState<string[]>([]);
  const [message, setMessage] = useState("Overlay two manuscripts whose lore belongs to the same hidden event.");
  const solvedPairs = useMemo(() => new Set(state.solvedPairIds), [state.solvedPairIds]);
  const pairLookup = useMemo(
    () => new Map(PAIRS.map((pair) => [sortedPair(pair.manuscriptIds), pair])),
    [],
  );
  const completed = brokenPathSolved(state);
  const routeComplete = MAZE_SEGMENTS.every(
    (segment) => state.routeSelections[segment.id] === correctRouteForSegment(segment)?.id,
  );

  function updateState(next: BrokenPathState) {
    onStateChange({
      solvedPairIds: Array.from(new Set(next.solvedPairIds)),
      routeSelections: next.routeSelections,
      completedAt: next.completedAt,
      finalWord: next.finalWord,
    });
  }

  function toggleManuscript(id: string) {
    setSelectedManuscripts((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current.slice(-1), id];
    });
  }

  function overlaySelected() {
    if (selectedManuscripts.length !== 2) {
      setMessage("The overlay frame needs exactly two pages.");
      return;
    }

    const pair = pairLookup.get(sortedPair(selectedManuscripts));

    if (!pair) {
      setMessage("The ink refuses the pairing. Those witnesses describe different wounds.");
      onLog?.("warn", "Broken Path overlay rejected an incorrect manuscript pair.");
      return;
    }

    if (solvedPairs.has(pair.id)) {
      setMessage(`${pair.title} is already fixed in the connector maze.`);
      return;
    }

    updateState({
      ...state,
      solvedPairIds: [...state.solvedPairIds, pair.id],
    });
    setSelectedManuscripts([]);
    setMessage(`${pair.title} revealed a ${pair.fragment} route-sigil.`);
    onLog?.("ok", `${pair.title} restored route-sigil ${pair.fragment}.`);
  }

  function chooseRoute(segmentId: string, routeId: string) {
    updateState({
      ...state,
      routeSelections: {
        ...state.routeSelections,
        [segmentId]: routeId,
      },
    });
  }

  function validateRoute() {
    if (!routeComplete) {
      setMessage("The connector shudders. One or more route-sigils still cross the wrong branch.");
      onLog?.("error", "Broken Path route validation failed.");
      return;
    }

    const completedAt = new Date().toISOString();
    updateState({
      ...state,
      completedAt,
      finalWord: BROKEN_PATH_FINAL_WORD,
    });
    setMessage("The segmented path burns clean. The next name is revealed.");
    onLog?.("ok", `Broken Path solved. ${BROKEN_PATH_FINAL_WORD} recovered from the manuscript maze.`);
  }

  function resetPuzzle() {
    updateState(DEFAULT_BROKEN_PATH_STATE);
    setSelectedManuscripts([]);
    setMessage("The manuscript maze has been reset.");
    onLog?.("warn", "Broken Path puzzle reset.");
  }

  if (!unlocked) {
    return (
      <section className="broken-path-panel locked" aria-label="Broken Path locked">
        <div className="broken-path-lock">
          <Lock size={24} />
          <h3>The Broken Path</h3>
          <p>Seal ORIGIN in The Story Begins to wake the six manuscripts.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="broken-path-panel" aria-label="Broken Path manuscript maze">
      <header className="broken-path-header">
        <div>
          <span>Next Puzzle Phase</span>
          <h3>The Broken Path</h3>
          <p>Pair six lore manuscripts into three sigils, then trace the segmented connector route.</p>
        </div>
        <GitBranch size={24} />
      </header>

      <div className="broken-path-status" aria-live="polite">
        <strong>{completed ? `${BROKEN_PATH_FINAL_WORD} recovered` : "Manuscript Overlay Active"}</strong>
        <span>{message}</span>
      </div>

      <div className="manuscript-grid" aria-label="Six cryptic manuscripts">
        {MANUSCRIPTS.map((manuscript) => {
          const selected = selectedManuscripts.includes(manuscript.id);
          const solved = PAIRS.some((pair) => pair.manuscriptIds.includes(manuscript.id) && solvedPairs.has(pair.id));

          return (
            <button
              type="button"
              className={["manuscript-card", selected ? "selected" : "", solved ? "solved" : ""].filter(Boolean).join(" ")}
              key={manuscript.id}
              onClick={() => toggleManuscript(manuscript.id)}
            >
              <span className="manuscript-number">{manuscript.numeral}</span>
              <strong>{manuscript.title}</strong>
              <em>{manuscript.relic}</em>
              <p>{manuscript.excerpt}</p>
              <i>
                hidden mark
                <FragmentSymbols fragment={manuscript.hiddenLetter} />
              </i>
            </button>
          );
        })}
      </div>

      <div className="overlay-controls">
        <button type="button" onClick={overlaySelected}>
          <ScrollText size={15} />
          Overlay Pages
        </button>
        <button type="button" onClick={resetPuzzle}>
          <RefreshCcw size={15} />
          Reset
        </button>
      </div>

      <div className="restored-sigils" aria-label="Restored manuscript pair sigils">
        {PAIRS.map((pair) => (
          <article className={solvedPairs.has(pair.id) ? "restored" : ""} key={pair.id}>
            <FragmentSymbols fragment={pair.fragment} />
            <div>
              <strong>{pair.title}</strong>
              <p>{solvedPairs.has(pair.id) ? pair.clue : "Two matching manuscripts must be overlaid."}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="connector-maze" aria-label="Segmented connector route">
        {MAZE_SEGMENTS.map((segment) => {
          const segmentUnlocked = pairIsSolved(state, segment.pairId);
          const selectedRoute = state.routeSelections[segment.id];
          const correctRoute = correctRouteForSegment(segment);

          return (
            <article className={segmentUnlocked ? "maze-segment unlocked" : "maze-segment"} key={segment.id}>
              <header>
                <span>{segment.title}</span>
                {segmentUnlocked ? <Sparkles size={15} /> : <Lock size={15} />}
              </header>
              <div>
                {segment.routes.map((route) => (
                  <button
                    type="button"
                    className={[
                      selectedRoute === route.id ? "selected" : "",
                      completed && correctRoute?.id === route.id ? "correct" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={route.id}
                    onClick={() => chooseRoute(segment.id, route.id)}
                    disabled={!segmentUnlocked}
                    title={route.clue}
                  >
                    <FragmentSymbols fragment={route.fragment} />
                    <strong>{route.label}</strong>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <footer className="broken-path-footer">
        <button type="button" onClick={validateRoute}>
          <ShieldCheck size={15} />
          Validate Connector
        </button>
        <output>{completed ? BROKEN_PATH_FINAL_WORD : routeComplete ? "The route is ready for validation." : "The name remains sealed."}</output>
      </footer>
    </section>
  );
}
