import type { RingOffsets } from "./types";

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const SYMBOL_RING = [
  "☉",
  "☽",
  "☿",
  "♀",
  "♁",
  "♂",
  "♃",
  "♄",
  "♆",
  "♇",
  "△",
  "□",
  "◇",
  "✶",
  "✦",
  "✧",
  "✣",
  "✥",
  "✷",
  "✹",
  "✺",
  "✻",
  "✼",
  "✽",
  "✾",
  "✿",
];

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
  "ᛞ",
  "ᛟ",
  "ᛠ",
  "ᛡ",
];

export const SOLUTION_OFFSETS: RingOffsets = {
  outer: 7,
  middle: 14,
  inner: 3,
};

const encryptedFragments = [
  "QEVTKA CWMEX AVDQFEMZK",
  "JMXTIB GFNKX IADKTQXUH",
  "PZMCSD ZQYLZ CZKZDRKMT",
  "HIDDEN INK AWAITS ALIGN",
];

export function normalizeOffset(value: number) {
  return ((value % 26) + 26) % 26;
}

export function rotateOffset(current: number, delta: number) {
  return normalizeOffset(current + delta);
}

export function isWheelSolved(offsets: RingOffsets) {
  return (
    normalizeOffset(offsets.outer) === SOLUTION_OFFSETS.outer &&
    normalizeOffset(offsets.middle) === SOLUTION_OFFSETS.middle &&
    normalizeOffset(offsets.inner) === SOLUTION_OFFSETS.inner
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
  return `${ALPHABET[offsets.outer]}-${SYMBOL_RING[offsets.middle]}-${GLYPH_RING[offsets.inner]}`;
}

export function progressTowardSolution(offsets: RingOffsets) {
  const rings = Object.keys(SOLUTION_OFFSETS) as Array<keyof RingOffsets>;
  return rings.reduce((score, ring) => score + (offsets[ring] === SOLUTION_OFFSETS[ring] ? 1 : 0), 0);
}
