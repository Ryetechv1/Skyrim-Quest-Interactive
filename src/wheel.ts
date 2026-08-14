import type { RingOffsets } from "./types";

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const SYMBOL_RING = "123456789".split("");

export const GLYPH_RING = [
  "ᚠ",
  "ᚢ",
  "ᚦ",
  "ᚨ",
  "ᚱ",
  "ᚲ",
  "ᚷ",
  "ᚹ",
  "ᚺ",
  "ᚾ",
  "ᛁ",
  "ᛃ",
  "ᛇ",
  "ᛈ",
  "ᛉ",
  "ᛊ",
  "ᛏ",
  "ᛒ",
  "ᛖ",
  "ᛗ",
  "ᛚ",
  "ᛜ",
];

export const SOLUTION_OFFSETS: RingOffsets = {
  outer: 7,
  middle: 3,
  inner: 3,
};

export const RING_LENGTHS = {
  outer: ALPHABET.length,
  middle: SYMBOL_RING.length,
  inner: GLYPH_RING.length,
} satisfies Record<keyof RingOffsets, number>;

const encryptedFragments = [
  "QEVTKA CWMEX AVDQFEMZK",
  "JMXTIB GFNKX IADKTQXUH",
  "PZMCSD ZQYLZ CZKZDRKMT",
  "HIDDEN INK AWAITS ALIGN",
];

export function normalizeOffset(value: number, length = ALPHABET.length) {
  return ((value % length) + length) % length;
}

export function rotateOffset(current: number, delta: number, length = ALPHABET.length) {
  return normalizeOffset(current + delta, length);
}

export function isWheelSolved(offsets: RingOffsets) {
  return (
    normalizeOffset(offsets.outer, RING_LENGTHS.outer) === SOLUTION_OFFSETS.outer &&
    normalizeOffset(offsets.middle, RING_LENGTHS.middle) === SOLUTION_OFFSETS.middle &&
    normalizeOffset(offsets.inner, RING_LENGTHS.inner) === SOLUTION_OFFSETS.inner
  );
}

export function decodedFragment(offsets: RingOffsets) {
  if (isWheelSolved(offsets)) {
    return "VERITAS OCCULTA REVELATUR";
  }

  const index = normalizeOffset(offsets.outer + offsets.middle + offsets.inner) % encryptedFragments.length;
  return encryptedFragments[index];
}

export function wheelChecksum(offsets: RingOffsets) {
  return `${ALPHABET[normalizeOffset(offsets.outer, RING_LENGTHS.outer)]}-${SYMBOL_RING[normalizeOffset(offsets.middle, RING_LENGTHS.middle)]}-${GLYPH_RING[normalizeOffset(offsets.inner, RING_LENGTHS.inner)]}`;
}

export function progressTowardSolution(offsets: RingOffsets) {
  const rings = Object.keys(SOLUTION_OFFSETS) as Array<keyof RingOffsets>;
  return rings.reduce(
    (score, ring) =>
      score + (normalizeOffset(offsets[ring], RING_LENGTHS[ring]) === SOLUTION_OFFSETS[ring] ? 1 : 0),
    0,
  );
}
