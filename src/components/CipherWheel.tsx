import { ALPHABET, GLYPH_RING, SYMBOL_RING } from "../wheel";
import type { RingName, RingOffsets } from "../types";

const LOWERCASE_GUIDE = "abcdefghijklmnopqrstuvwxyz".split("");
const ALIGNMENT_MARKERS = [
  { glyph: "▚", angle: -90 },
  { glyph: "▛", angle: -30 },
  { glyph: "▜", angle: 30 },
  { glyph: "▞", angle: 90 },
  { glyph: "▟", angle: 150 },
  { glyph: "▙", angle: 210 },
];

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

function AlignmentMarkers() {
  return (
    <div className="alignment-markers" aria-hidden="true">
      {ALIGNMENT_MARKERS.map((marker) => (
        <span
          className="alignment-marker"
          key={`${marker.glyph}-${marker.angle}`}
          style={{
            transform: `rotate(${marker.angle}deg) translate(268px) rotate(${-marker.angle}deg)`,
          }}
        >
          {marker.glyph}
        </span>
      ))}
    </div>
  );
}

export function CipherWheel({ offsets, rotateRing }: CipherWheelProps) {
  return (
    <div className="cipher-wheel-shell">
      <LowercaseGuide />
      <AlignmentMarkers />
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
