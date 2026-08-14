import { ALPHABET, GLYPH_RING, SYMBOL_RING } from "./wheel";

export const VOLVELLE_SOLVE_WORD = "ORIGIN";
export const VOLVELLE_SOLVE_LETTERS = VOLVELLE_SOLVE_WORD.split("");
export const VOLVELLE_ATTEMPT_LIMIT = 6;

export type VolvelleZoneValue = {
  symbol: string;
  value: number;
};

export type VolvelleSignature = {
  zoneC: [VolvelleZoneValue, VolvelleZoneValue];
  zoneB: VolvelleZoneValue;
  zoneA1: VolvelleZoneValue;
  zoneA2: VolvelleZoneValue;
};

export type VolvellePhase = {
  unlockAt: number;
  target: string;
  hour: string;
  title: string;
  clue: string;
  lookupCue: string;
  reward: string;
  signature: VolvelleSignature;
  offsets: {
    outer: number;
    middle: number;
    inner: number;
  };
};

export type VolvelleStarLedgerEntry = {
  value: number;
  symbol: string;
  epithet: string;
  meaning: string;
};

export type VolvelleHourLedgerEntry = {
  value: number;
  symbol: string;
  hour: string;
  meaning: string;
};

export type VolvelleHorizonLedgerEntry = {
  value: number;
  letter: string;
};

export const VOLVELLE_STAR_LEDGER: VolvelleStarLedgerEntry[] = [
  { value: 1, symbol: "ᚠ", epithet: "First Ember", meaning: "the first waking mark" },
  { value: 2, symbol: "ᚢ", epithet: "Dragon Breath", meaning: "the return of dragons" },
  { value: 3, symbol: "ᚦ", epithet: "Barrow Thorn", meaning: "Nordic ruin danger" },
  { value: 4, symbol: "ᚨ", epithet: "Grey Voice", meaning: "the Greybeards' call" },
  { value: 5, symbol: "ᚱ", epithet: "Mountain Road", meaning: "the climb to High Hrothgar" },
  { value: 6, symbol: "ᚲ", epithet: "Deep Key", meaning: "the way into hidden depths" },
  { value: 7, symbol: "ᚷ", epithet: "Blackreach Glow", meaning: "the false sun below Skyrim" },
  { value: 8, symbol: "ᚹ", epithet: "Elder Witness", meaning: "the scroll that remembers" },
  { value: 9, symbol: "ᚺ", epithet: "Time Wound", meaning: "the wound at the throat of the world" },
  { value: 10, symbol: "ᚾ", epithet: "Frost Need", meaning: "the cold necessity of fate" },
  { value: 11, symbol: "ᛁ", epithet: "Nordic Song", meaning: "Sovngarde's remembered song" },
  { value: 12, symbol: "ᛃ", epithet: "Hall Echo", meaning: "the echo inside Shor's hall" },
  { value: 13, symbol: "ᛇ", epithet: "Hidden Yew", meaning: "a concealed old path" },
  { value: 14, symbol: "ᛈ", epithet: "Scroll Lot", meaning: "the reading of a sealed fate" },
  { value: 15, symbol: "ᛉ", epithet: "Watcher Fork", meaning: "a forked guard-mark" },
  { value: 16, symbol: "ᛊ", epithet: "Snow Serpent", meaning: "a winding Skyrim trail" },
  { value: 17, symbol: "ᛏ", epithet: "Tower Spear", meaning: "the upright tower sign" },
  { value: 18, symbol: "ᛒ", epithet: "Red Betrayal", meaning: "the judgment of Lorkhan" },
  { value: 19, symbol: "ᛖ", epithet: "Ash March", meaning: "the road toward Red Mountain" },
  { value: 20, symbol: "ᛗ", epithet: "Mundus Stone", meaning: "the mortal world's fixed weight" },
  { value: 21, symbol: "ᛚ", epithet: "Lorkhan Spark", meaning: "the heart-wound principle" },
  { value: 22, symbol: "ᛜ", epithet: "Origin Seal", meaning: "the closing sign" },
];

export const VOLVELLE_HOUR_LEDGER: VolvelleHourLedgerEntry[] = [
  { value: 1, symbol: "1", hour: "Dawn", meaning: "first light / beginning" },
  { value: 2, symbol: "2", hour: "Prime", meaning: "disciplined voice" },
  { value: 3, symbol: "3", hour: "Return", meaning: "first fixed point" },
  { value: 4, symbol: "4", hour: "Watch", meaning: "patient observation" },
  { value: 5, symbol: "5", hour: "Zenith", meaning: "hidden sun" },
  { value: 6, symbol: "6", hour: "Ash", meaning: "Red Mountain omen" },
  { value: 7, symbol: "7", hour: "Dusk", meaning: "time turning back on itself" },
  { value: 8, symbol: "8", hour: "Deep", meaning: "underground witness" },
  { value: 9, symbol: "9", hour: "Midnight", meaning: "Sovngarde and the dead" },
];

export const VOLVELLE_HORIZON_LEDGER: VolvelleHorizonLedgerEntry[] = ALPHABET.map((letter, index) => ({
  value: index + 1,
  letter,
}));

function zone(symbol: string, value: number): VolvelleZoneValue {
  return { symbol, value };
}

function signature(
  zoneC: [string, string],
  zoneB: string,
  zoneA1: string,
  zoneA2: string,
): VolvelleSignature {
  const firstInner = GLYPH_RING.indexOf(zoneC[0]);
  const secondInner = GLYPH_RING.indexOf(zoneC[1]);
  const middle = SYMBOL_RING.indexOf(zoneB);
  const outerA1 = ALPHABET.indexOf(zoneA1);
  const outerA2 = ALPHABET.indexOf(zoneA2);

  if ([firstInner, secondInner, middle, outerA1, outerA2].some((index) => index < 0)) {
    throw new Error(`Invalid Volvelle signature: ${zoneC.join("+")} / ${zoneB} / ${zoneA1}+${zoneA2}`);
  }

  return {
    zoneC: [zone(zoneC[0], firstInner + 1), zone(zoneC[1], secondInner + 1)],
    zoneB: zone(zoneB, middle + 1),
    zoneA1: zone(zoneA1, outerA1 + 1),
    zoneA2: zone(zoneA2, outerA2 + 1),
  };
}

export const VOLVELLE_PHASES: VolvellePhase[] = [
  {
    unlockAt: 0,
    target: "O",
    hour: "Dawn",
    title: "1. O - Dawn / Dragonstone",
    clue:
      "Where the dragon-map first lay under Nordic stone, set the first hour. In the Star Ledger, wake First Ember beside Dragon Breath; split the Horizon Atlas at the Dragonborn's beginning after C.",
    lookupCue: "Star Ledger 1-2: First Ember + Dragon Breath. Hour Gate: Dawn = 1. Horizon Atlas: D + E.",
    reward: "Dawn names the answer box: only A^3 speaks. The next road climbs to the mountain of the Voice.",
    signature: signature(["ᚠ", "ᚢ"], "1", "D", "E"),
    offsets: { outer: 5, middle: 3, inner: 7 },
  },
  {
    unlockAt: 1,
    target: "R",
    hour: "Prime",
    title: "2. R - Prime / High Hrothgar",
    clue:
      "At High Hrothgar, breath is counted before it is shouted. Take Grey Voice beside Mountain Road, set the Prime gate, and split the horizon at the initials of High Hrothgar's climb.",
    lookupCue: "Star Ledger 4-5: Grey Voice + Mountain Road. Hour Gate: Prime = 2. Horizon Atlas: H + I.",
    reward: "Prime teaches the hour gate. Numbers do not solve the lock; they choose which hour may be heard.",
    signature: signature(["ᚨ", "ᚱ"], "2", "H", "I"),
    offsets: { outer: 1, middle: 2, inner: 4 },
  },
  {
    unlockAt: 2,
    target: "I",
    hour: "Zenith",
    title: "3. I - Zenith / Blackreach",
    clue:
      "Below Skyrim, the false sun of Blackreach crowns the deep. Join Deep Key to Blackreach Glow, set Zenith, and let the cavern's first two letters form the horizon.",
    lookupCue: "Star Ledger 6-7: Deep Key + Blackreach Glow. Hour Gate: Zenith = 5. Horizon Atlas: B + C.",
    reward: "Zenith teaches the star pair. Two inner signs must sit together before the lens has memory.",
    signature: signature(["ᚲ", "ᚷ"], "5", "B", "C"),
    offsets: { outer: 7, middle: 8, inner: 2 },
  },
  {
    unlockAt: 3,
    target: "G",
    hour: "Dusk",
    title: "4. G - Dusk / Time-Wound",
    clue:
      "At the Time-Wound, old battle and present breath overlap. Pair Time Wound with Frost Need, set Dusk, and split the horizon where the throat's storm turns.",
    lookupCue: "Star Ledger 9-10: Time Wound + Frost Need. Hour Gate: Dusk = 7. Horizon Atlas: S + T.",
    reward: "Dusk teaches the split horizon. A^1 and A^2 are two halves of the same sightline.",
    signature: signature(["ᚺ", "ᚾ"], "7", "S", "T"),
    offsets: { outer: 16, middle: 6, inner: 21 },
  },
  {
    unlockAt: 4,
    target: "I",
    hour: "Midnight",
    title: "5. I - Midnight / Sovngarde",
    clue:
      "In Sovngarde, the dead do not count years; they keep the song. Take Nordic Song beside Hall Echo, set Midnight, and split the horizon at the two letters that begin the Nordic oath.",
    lookupCue: "Star Ledger 11-12: Nordic Song + Hall Echo. Hour Gate: Midnight = 9. Horizon Atlas: N + O.",
    reward: "Midnight proves recurrence. The same answer may return, but only from a new alignment.",
    signature: signature(["ᛁ", "ᛃ"], "9", "N", "O"),
    offsets: { outer: 21, middle: 4, inner: 19 },
  },
  {
    unlockAt: 5,
    target: "N",
    hour: "Return",
    title: "6. N - Return / First Tower",
    clue:
      "When the path leaves Skyrim, seek the first fixed point. Bring Mundus Stone beside Lorkhan Spark, set Return, and split the horizon at the first two letters before any road.",
    lookupCue: "Star Ledger 20-21: Mundus Stone + Lorkhan Spark. Hour Gate: Return = 3. Horizon Atlas: A + B.",
    reward: "Return seals ORIGIN and opens the premise record.",
    signature: signature(["ᛗ", "ᛚ"], "3", "A", "B"),
    offsets: { outer: 8, middle: 1, inner: 10 },
  },
];
