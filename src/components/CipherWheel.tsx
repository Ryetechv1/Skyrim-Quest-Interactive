import { useRef } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import { ALPHABET, GLYPH_RING, SYMBOL_RING, RING_LENGTHS } from "../wheel";
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
      <div className="wheel-caption">
        <span>Outer: Daedric A-Z</span>
        <span>Middle: 1-9</span>
        <span>Inner: Glyphs</span>
      </div>
    </div>
  );
}
