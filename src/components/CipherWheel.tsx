import { useRef } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import { ALPHABET, GLYPH_RING, SYMBOL_RING, RING_LENGTHS, normalizeOffset } from "../wheel";
import type { RingName, RingOffsets } from "../types";
import type { VolvelleSignature, VolvelleZoneValue } from "../volvelle";

const SCRIPT_SYMBOLS = import.meta.glob("../assets/script-symbols/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

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
const MIDDLE_SYMBOL_LOCK_ANGLE = 30;
const PROBE_ANGLES = {
  start: MIDDLE_SYMBOL_LOCK_ANGLE - 14,
  middle: MIDDLE_SYMBOL_LOCK_ANGLE,
  end: MIDDLE_SYMBOL_LOCK_ANGLE + 14,
} as const;
const OUTER_ZONE_SAMPLE_ANGLES = {
  a1: (PROBE_ANGLES.start + PROBE_ANGLES.middle) / 2,
  a2: (PROBE_ANGLES.middle + PROBE_ANGLES.end) / 2,
} as const;
const ZONE_DETECTION_ANGLES = {
  inner: [OUTER_ZONE_SAMPLE_ANGLES.a1, OUTER_ZONE_SAMPLE_ANGLES.a2],
  middle: PROBE_ANGLES.middle,
  outerA1: OUTER_ZONE_SAMPLE_ANGLES.a1,
  outerA2: OUTER_ZONE_SAMPLE_ANGLES.a2,
} as const;

const PROBE_FRAME = {
  startAngle: PROBE_ANGLES.start,
  splitAngle: PROBE_ANGLES.middle,
  endAngle: PROBE_ANGLES.end,
  radii: {
    core: 42,
    inner: 124,
    middle: 184,
    outer: 250,
  },
  result: {
    radius: 320,
    halfLength: 42,
    halfHeight: 38,
  },
} as const;

type CipherWheelProps = {
  offsets: RingOffsets;
  rotateRing: (ring: RingName, delta: number) => void;
  answerSymbol?: string | null;
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

function detectZoneSymbol(items: string[], offset: number, angle: number): VolvelleZoneValue {
  const step = FULL_TURN / items.length;
  const index = normalizeOffset(Math.round((angle + 90) / step - offset), items.length);

  return {
    symbol: items[index],
    value: index + 1,
  };
}

function detectInnerZone(offset: number): [VolvelleZoneValue, VolvelleZoneValue] {
  const detected = ZONE_DETECTION_ANGLES.inner.map((angle) => detectZoneSymbol(GLYPH_RING, offset, angle));

  if (detected[0].symbol !== detected[1].symbol) {
    return detected as [VolvelleZoneValue, VolvelleZoneValue];
  }

  const nextIndex = normalizeOffset(detected[0].value, GLYPH_RING.length);
  return [detected[0], { symbol: GLYPH_RING[nextIndex], value: nextIndex + 1 }];
}

function roundCoord(value: number) {
  return Number(value.toFixed(2));
}

function polarPoint(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: roundCoord(Math.cos(radians) * radius),
    y: roundCoord(Math.sin(radians) * radius),
  };
}

function pointString(point: { x: number; y: number }) {
  return `${point.x} ${point.y}`;
}

function arcPath(radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(radius, startAngle);
  const end = polarPoint(radius, endAngle);

  return `M ${pointString(start)} A ${radius} ${radius} 0 0 1 ${pointString(end)}`;
}

function radialPath(innerRadius: number, outerRadius: number, angle: number) {
  return `M ${pointString(polarPoint(innerRadius, angle))} L ${pointString(polarPoint(outerRadius, angle))}`;
}

function ringSectorPath(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const outerStart = polarPoint(outerRadius, startAngle);
  const outerEnd = polarPoint(outerRadius, endAngle);
  const innerEnd = polarPoint(innerRadius, endAngle);
  const innerStart = polarPoint(innerRadius, startAngle);

  return [
    `M ${pointString(outerStart)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${pointString(outerEnd)}`,
    `L ${pointString(innerEnd)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${pointString(innerStart)}`,
    "Z",
  ].join(" ");
}

function offsetPoint(point: { x: number; y: number }, x: number, y: number, amount: number) {
  return {
    x: roundCoord(point.x + x * amount),
    y: roundCoord(point.y + y * amount),
  };
}

function resultBoxPoints() {
  const angle = PROBE_FRAME.splitAngle;
  const radians = (angle * Math.PI) / 180;
  const direction = {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
  const normal = {
    x: -Math.sin(radians),
    y: Math.cos(radians),
  };
  const center = polarPoint(PROBE_FRAME.result.radius, angle);
  const start = offsetPoint(center, direction.x, direction.y, -PROBE_FRAME.result.halfLength);
  const end = offsetPoint(center, direction.x, direction.y, PROBE_FRAME.result.halfLength);

  return {
    topLeft: offsetPoint(start, normal.x, normal.y, -PROBE_FRAME.result.halfHeight),
    topRight: offsetPoint(end, normal.x, normal.y, -PROBE_FRAME.result.halfHeight),
    bottomRight: offsetPoint(end, normal.x, normal.y, PROBE_FRAME.result.halfHeight),
    bottomLeft: offsetPoint(start, normal.x, normal.y, PROBE_FRAME.result.halfHeight),
  };
}

function polygonPath(points: Array<{ x: number; y: number }>) {
  return `M ${points.map(pointString).join(" L ")} Z`;
}

export function scriptSymbolSrc(symbol: string) {
  return SCRIPT_SYMBOLS[`../assets/script-symbols/${symbol}.png`];
}

export function detectProbeSignature(offsets: RingOffsets): VolvelleSignature {
  return {
    zoneC: detectInnerZone(offsets.inner),
    zoneB: detectZoneSymbol(SYMBOL_RING, offsets.middle, ZONE_DETECTION_ANGLES.middle),
    zoneA1: detectZoneSymbol(ALPHABET, offsets.outer, ZONE_DETECTION_ANGLES.outerA1),
    zoneA2: detectZoneSymbol(ALPHABET, offsets.outer, ZONE_DETECTION_ANGLES.outerA2),
  };
}

export function probeSignatureMatches(current: VolvelleSignature, expected: VolvelleSignature) {
  return (
    current.zoneC[0].symbol === expected.zoneC[0].symbol &&
    current.zoneC[1].symbol === expected.zoneC[1].symbol &&
    current.zoneB.symbol === expected.zoneB.symbol &&
    current.zoneA1.symbol === expected.zoneA1.symbol &&
    current.zoneA2.symbol === expected.zoneA2.symbol
  );
}

function ZoneProbeOverlay({ answerSymbol }: { answerSymbol?: string | null }) {
  const answerSymbolImage = answerSymbol ? scriptSymbolSrc(answerSymbol) : null;
  const { radii, startAngle, splitAngle, endAngle } = PROBE_FRAME;
  const answerCenter = polarPoint(PROBE_FRAME.result.radius, splitAngle);
  const resultBox = resultBoxPoints();
  const resultConnector = polygonPath([
    polarPoint(radii.outer, startAngle),
    resultBox.topLeft,
    resultBox.bottomLeft,
    polarPoint(radii.outer, endAngle),
  ]);
  const resultZone = polygonPath([resultBox.topLeft, resultBox.topRight, resultBox.bottomRight, resultBox.bottomLeft]);
  const answerZoneStyle = {
    left: `${answerCenter.x - PROBE_FRAME.result.halfLength}px`,
    top: `${answerCenter.y - PROBE_FRAME.result.halfHeight}px`,
    width: `${PROBE_FRAME.result.halfLength * 2}px`,
    height: `${PROBE_FRAME.result.halfHeight * 2}px`,
    transform: `rotate(${splitAngle}deg)`,
  };

  return (
    <span className="zone-probe-anchor" aria-hidden="true">
      <svg className="zone-probe-frame" viewBox="-32 -36 470 210" focusable="false" aria-hidden="true">
        <defs>
          <radialGradient id="zone-probe-region-fade">
            <stop offset="0%" stopColor="#d7d5ca" stopOpacity="0.08" />
            <stop offset="62%" stopColor="#b9b7ae" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#9b9990" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <g className="zone-probe-shading">
          <path d={ringSectorPath(radii.core, radii.inner, startAngle, endAngle)} />
          <path d={ringSectorPath(radii.inner, radii.middle, startAngle, endAngle)} />
          <path d={ringSectorPath(radii.middle, radii.outer, startAngle, splitAngle)} />
          <path d={ringSectorPath(radii.middle, radii.outer, splitAngle, endAngle)} />
          <path d={resultConnector} />
          <path d={resultZone} />
        </g>
        <g className="zone-probe-ink">
          <circle cx="0" cy="0" r="8.5" />
          <path d={radialPath(8.5, radii.outer, startAngle)} />
          <path d={radialPath(8.5, radii.outer, endAngle)} />
          <path d={radialPath(radii.middle, radii.outer, splitAngle)} />
          <path d={arcPath(radii.core, startAngle, endAngle)} />
          <path d={arcPath(radii.inner, startAngle, endAngle)} />
          <path d={arcPath(radii.middle, startAngle, endAngle)} />
          <path d={arcPath(radii.outer, startAngle, endAngle)} />
          <path d={`M ${pointString(polarPoint(radii.outer, startAngle))} L ${pointString(resultBox.topLeft)}`} />
          <path d={`M ${pointString(polarPoint(radii.outer, endAngle))} L ${pointString(resultBox.bottomLeft)}`} />
          <path d={`M ${pointString(resultBox.topLeft)} L ${pointString(resultBox.bottomLeft)}`} />
          <path d={`M ${pointString(resultBox.topRight)} L ${pointString(resultBox.bottomRight)}`} />
          <path d={`M ${pointString(resultBox.topLeft)} L ${pointString(resultBox.topRight)}`} />
          <path d={`M ${pointString(resultBox.bottomLeft)} L ${pointString(resultBox.bottomRight)}`} />
        </g>
      </svg>
      <span className="zone-probe-answer-zone" style={answerZoneStyle}>
        {answerSymbolImage ? (
          <img className="zone-probe-result-symbol" src={answerSymbolImage} alt="" draggable={false} />
        ) : (
          <strong className="zone-probe-unsettled">?</strong>
        )}
      </span>
    </span>
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

export function CipherWheel({ offsets, rotateRing, answerSymbol = null }: CipherWheelProps) {
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
      <ZoneProbeOverlay answerSymbol={answerSymbol} />
      <div className="wheel-caption">
        <span>Outer: Daedric A-Z</span>
        <span>Middle: 1-9</span>
        <span>Inner: Glyphs</span>
      </div>
    </div>
  );
}
