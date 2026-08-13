import { ALPHABET, GLYPH_RING, SYMBOL_RING } from "../wheel";
import type { RingName, RingOffsets } from "../types";

const LOWERCASE_GUIDE = "abcdefghijklmnopqrstuvwxyz".split("");

type CipherWheelProps = {
  offsets: RingOffsets;
  rotateRing: (ring: RingName, delta: number) => void;
};

type RingProps = {
  name: RingName;
  items: string[];
  radius: number;
  offset: number;
  className: string;
  rotateRing: (ring: RingName, delta: number) => void;
};

function Ring({ name, items, radius, offset, className, rotateRing }: RingProps) {
  const step = 360 / items.length;

  return (
    <div className={`cipher-ring ${className}`} aria-label={`${name} cipher ring`}>
      {items.map((item, index) => {
        const angle = index * step + offset * step - 90;
        return (
          <button
            className="cipher-cell"
            key={`${name}-${item}-${index}`}
            type="button"
            onClick={() => rotateRing(name, index - offset)}
            style={{
              transform: `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`,
            }}
            aria-label={`Set ${name} ring to ${item}`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

function LowercaseGuide() {
  const step = 360 / LOWERCASE_GUIDE.length;

  return (
    <div className="lowercase-guide" aria-label="Static lowercase alphabet guide">
      {LOWERCASE_GUIDE.map((letter, index) => {
        const angle = index * step - 90;

        return (
          <span
            className="lowercase-cell"
            key={letter}
            style={{
              transform: `rotate(${angle}deg) translate(292px) rotate(${-angle}deg)`,
            }}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}

export function CipherWheel({ offsets, rotateRing }: CipherWheelProps) {
  return (
    <div className="cipher-wheel-shell">
      <LowercaseGuide />
      <div className="alignment-needle needle-top" />
      <div className="alignment-needle needle-right" />
      <div className="alignment-needle needle-bottom" />
      <div className="alignment-needle needle-left" />
      <div className="cipher-wheel" aria-label="Three layer cipher wheel">
        <Ring
          name="outer"
          items={ALPHABET}
          radius={216}
          offset={offsets.outer}
          className="outer-ring"
          rotateRing={rotateRing}
        />
        <Ring
          name="middle"
          items={SYMBOL_RING}
          radius={152}
          offset={offsets.middle}
          className="middle-ring"
          rotateRing={rotateRing}
        />
        <Ring
          name="inner"
          items={GLYPH_RING}
          radius={95}
          offset={offsets.inner}
          className="inner-ring"
          rotateRing={rotateRing}
        />
        <div className="sunburst" aria-hidden="true">
          <div className="sunburst-core">
            <span />
          </div>
        </div>
      </div>
      <div className="wheel-caption">
        <span>Outer: Daedric A-Z</span>
        <span>Middle: 1-9</span>
        <span>Inner: Glyphs</span>
      </div>
    </div>
  );
}
