import { useRef } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import { ALPHABET, GLYPH_RING, SYMBOL_RING, RING_LENGTHS, normalizeOffset } from "../wheel";
import type { RingName, RingOffsets } from "../types";

const LOWERCASE_GUIDE = "abcdefghijklmnopqrstuvwxyz".split("");

function lowercaseAngle(letter: string) {
  return LOWERCASE_GUIDE.indexOf(letter) * (360 / LOWERCASE_GUIDE.length) - 90;
}

const ALIGNMENT_MARKERS = [
  { glyph: "▚", angle: -90 },
  { glyph: "▛", angle: lowercaseAngle("e") },
  { glyph: "▜", angle: lowercaseAngle("j") },
  { glyph: "▞", angle: 90 },
  { glyph: "▟", angle: lowercaseAngle("r") },
  { glyph: "▙", angle: lowercaseAngle("w") },
];

const RING_DRAG_ZONES = [
  { ring: "inner", min: 52, max: 124 },
  { ring: "middle", min: 125, max: 185 },
  { ring: "outer", min: 186, max: 262 },
] satisfies Array<{ ring: RingName; min: number; max: number }>;

const FULL_TURN = 360;
const ZONE_SAMPLE_ANGLES = {
  innerStart: 10,
  innerEnd: 24,
  middle: 18,
  outerA1: -3,
  outerA2: 22,
} as const;

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
  dragMovedRef: MutableRefObject<boolean>;
};

type DragSession = {
  pointerId: number;
  ring: RingName;
  startAngle: number;
  appliedDelta: number;
};

type ZoneSymbol = {
  symbol: string;
  value: number;
};

function pointerMetrics(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const x = event.clientX - centerX;
  const y = event.clientY - centerY;
  const scale = rect.width / 520;

  return {
    angle: Math.atan2(y, x) * (180 / Math.PI),
    radius: Math.hypot(x, y) / scale,
  };
}

function shortestAngleDelta(current: number, start: number) {
  return ((current - start + 540) % FULL_TURN) - 180;
}

function readRingSymbol(items: string[], offset: number, angle: number): ZoneSymbol {
  const step = FULL_TURN / items.length;
  const index = normalizeOffset(Math.round((angle + 90) / step - offset), items.length);

  return {
    symbol: items[index],
    value: index + 1,
  };
}

function readInnerZone(offset: number): ZoneSymbol[] {
  const first = readRingSymbol(GLYPH_RING, offset, ZONE_SAMPLE_ANGLES.innerStart);
  const second = readRingSymbol(GLYPH_RING, offset, ZONE_SAMPLE_ANGLES.innerEnd);

  if (first.symbol !== second.symbol) {
    return [first, second];
  }

  const nextIndex = normalizeOffset(first.value, GLYPH_RING.length);
  return [first, { symbol: GLYPH_RING[nextIndex], value: nextIndex + 1 }];
}

function zoneLetter(value: number) {
  const index = normalizeOffset(value - 1, ALPHABET.length);

  return {
    symbol: ALPHABET[index],
    value: index + 1,
  };
}

function ZoneProbeOverlay({ offsets }: { offsets: RingOffsets }) {
  const zoneC = readInnerZone(offsets.inner);
  const zoneB = readRingSymbol(SYMBOL_RING, offsets.middle, ZONE_SAMPLE_ANGLES.middle);
  const zoneA1 = readRingSymbol(ALPHABET, offsets.outer, ZONE_SAMPLE_ANGLES.outerA1);
  const zoneA2 = readRingSymbol(ALPHABET, offsets.outer, ZONE_SAMPLE_ANGLES.outerA2);
  const zoneCWeight = zoneC.reduce((total, item) => total + item.value, 0);
  const zoneA1Weight = zoneA1.value + zoneCWeight;
  const zoneA2Weight = zoneA2.value + zoneB.value;
  const rawA3 = Math.round((zoneA1Weight + zoneA2Weight) / Math.max(zoneB.value, 1) + zoneCWeight);
  const zoneA3 = zoneLetter(rawA3);
  const ariaLabel = `Fixed cipher probe. Zone C reads ${zoneC.map((item) => item.symbol).join(" ")} for ${zoneCWeight}. Zone B reads ${zoneB.symbol} for ${zoneB.value}. Zone A one reads ${zoneA1.symbol} for ${zoneA1Weight}. Zone A two reads ${zoneA2.symbol} for ${zoneA2Weight}. Zone A three answer is ${zoneA3.symbol}, ${zoneA3.value}.`;

  return (
    <svg className="zone-probe" viewBox="0 0 690 520" role="img" aria-label={ariaLabel}>
      <g className="zone-probe-tilt" transform="rotate(13 260 260)">
        <circle className="zone-probe-joint" cx="260" cy="260" r="11" />
        <path className="zone-probe-spine" d="M270 254 L430 231 L654 263" />
        <path className="zone-probe-spine" d="M270 266 L396 339 L632 386" />
        <path className="zone-probe-cell zone-probe-cell-c" d="M292 257 L378 236 L411 253 L364 318 Z" />
        <path className="zone-probe-cell zone-probe-cell-b" d="M411 253 L466 265 L434 342 L364 318 Z" />
        <path className="zone-probe-cell zone-probe-cell-a" d="M430 231 L558 249 L544 304 L416 284 Z" />
        <path className="zone-probe-cell zone-probe-cell-a" d="M416 284 L544 304 L526 371 L396 339 Z" />
        <path className="zone-probe-cell zone-probe-cell-result" d="M558 249 L654 263 L632 386 L526 371 L544 304 Z" />

        <text className="zone-probe-label zone-probe-label-c" x="321" y="266">
          <tspan x="321" dy="0">INNER RING</tspan>
          <tspan x="321" dy="12">Zone C</tspan>
        </text>
        <text className="zone-probe-symbol zone-probe-symbol-inner" x="322" y="301">
          {zoneC.map((item) => item.symbol).join(" ")}
        </text>
        <text className="zone-probe-value" x="322" y="316">
          C={zoneCWeight}
        </text>

        <text className="zone-probe-label zone-probe-label-b" x="393" y="300">
          <tspan x="393" dy="0">MIDDLE</tspan>
          <tspan x="393" dy="12">Zone B</tspan>
        </text>
        <text className="zone-probe-symbol zone-probe-symbol-middle" x="402" y="330">
          {zoneB.symbol}
        </text>
        <text className="zone-probe-value" x="432" y="330">
          B={zoneB.value}
        </text>

        <text className="zone-probe-label" x="458" y="259">
          OUTER RING
        </text>
        <text className="zone-probe-symbol zone-probe-symbol-outer" x="453" y="287">
          {zoneA1.symbol}
        </text>
        <text className="zone-probe-value" x="490" y="284">
          A¹={zoneA1.value}+C={zoneA1Weight}
        </text>

        <text className="zone-probe-label" x="447" y="318">
          OUTER RING
        </text>
        <text className="zone-probe-symbol zone-probe-symbol-outer" x="439" y="350">
          {zoneA2.symbol}
        </text>
        <text className="zone-probe-value" x="482" y="347">
          A²={zoneA2.value}+B={zoneA2Weight}
        </text>

        <text className="zone-probe-result-label" x="571" y="291">
          RESULT
        </text>
        <text className="zone-probe-formula" x="568" y="311">
          <tspan x="568" dy="0">A³=((A¹+A²)/B)+C</tspan>
          <tspan x="568" dy="13">raw {rawA3}</tspan>
        </text>
        <text className="zone-probe-answer" x="579" y="355">
          {zoneA3.symbol}
        </text>
        <text className="zone-probe-value zone-probe-answer-value" x="615" y="355">
          {zoneA3.value}
        </text>
      </g>
    </svg>
  );
}

function Ring({ name, items, radius, offset, className, rotateRing, dragMovedRef }: RingProps) {
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
            onClick={() => {
              if (dragMovedRef.current) {
                return;
              }

              rotateRing(name, index - offset);
            }}
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
  const dragSessionRef = useRef<DragSession | null>(null);
  const dragMovedRef = useRef(false);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const metrics = pointerMetrics(event);
    const dragZone = RING_DRAG_ZONES.find(({ min, max }) => metrics.radius >= min && metrics.radius <= max);

    if (!dragZone) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragMovedRef.current = false;
    dragSessionRef.current = {
      pointerId: event.pointerId,
      ring: dragZone.ring,
      startAngle: metrics.angle,
      appliedDelta: 0,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const session = dragSessionRef.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const { angle } = pointerMetrics(event);
    const step = FULL_TURN / RING_LENGTHS[session.ring];
    const nextDelta = Math.round(shortestAngleDelta(angle, session.startAngle) / step);

    if (nextDelta === session.appliedDelta) {
      return;
    }

    dragMovedRef.current = true;
    rotateRing(session.ring, nextDelta - session.appliedDelta);
    session.appliedDelta = nextDelta;
    event.preventDefault();
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const session = dragSessionRef.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragSessionRef.current = null;
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  }

  return (
    <div className="cipher-wheel-shell">
      <LowercaseGuide />
      <AlignmentMarkers />
      <div
        className="cipher-wheel"
        aria-label="Three layer cipher wheel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <Ring
          name="outer"
          items={ALPHABET}
          radius={216}
          offset={offsets.outer}
          className="outer-ring"
          rotateRing={rotateRing}
          dragMovedRef={dragMovedRef}
        />
        <Ring
          name="middle"
          items={SYMBOL_RING}
          radius={152}
          offset={offsets.middle}
          className="middle-ring"
          rotateRing={rotateRing}
          dragMovedRef={dragMovedRef}
        />
        <Ring
          name="inner"
          items={GLYPH_RING}
          radius={95}
          offset={offsets.inner}
          className="inner-ring"
          rotateRing={rotateRing}
          dragMovedRef={dragMovedRef}
        />
        <div className="sunburst" aria-hidden="true">
          <div className="sunburst-core">
            <span />
          </div>
        </div>
      </div>
      <ZoneProbeOverlay offsets={offsets} />
      <div className="wheel-caption">
        <span>Outer: Daedric A-Z</span>
        <span>Middle: 1-9</span>
        <span>Inner: Glyphs</span>
      </div>
    </div>
  );
}
