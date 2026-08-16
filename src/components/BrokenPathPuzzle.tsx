import { Canvas, useFrame } from "@react-three/fiber";
import { Lock, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import * as THREE from "three";
import {
  BROKEN_PATH_FINAL_WORD,
  SWITCHBOARD_GROUPS,
  SWITCH_NODES,
  brokenPathSolved,
  correctSwitchCount,
  normalizeSelections,
  solvedStageIds,
  type BrokenPathState,
  type PuzzleViewMode,
  type SwitchNode,
} from "../brokenPathModel";
import type { AuthSession, TerminalEvent } from "../types";

type BrokenPathPuzzleProps = {
  unlocked: boolean;
  canReview: boolean;
  mode: PuzzleViewMode;
  session: AuthSession | null;
  state: BrokenPathState;
  onStateChange: (state: BrokenPathState) => void;
  onModeChange: (mode: PuzzleViewMode) => void;
  onBack: () => void;
  onLog?: (kind: TerminalEvent["kind"], text: string) => void;
};

function SignalShard({ index, solvedRatio }: { index: number; solvedRatio: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = 0.18 + (index % 5) * 0.025;
  const radius = 1.6 + (index % 7) * 0.12;

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const t = clock.elapsedTime * speed + index * 0.74;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.83) * 0.82, -1.6 + Math.sin(t) * 0.2);
    ref.current.rotation.z = -t;
    const material = ref.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.08 + solvedRatio * 0.18 + Math.sin(t * 2) * 0.025;
  });

  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.035, 0.07, 5]} />
      <meshBasicMaterial color={solvedRatio > 0.7 ? "#ffe45d" : "#89b8c9"} transparent opacity={0.1} />
    </mesh>
  );
}

function SignalBeam({ solvedRatio }: { solvedRatio: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.2) * 0.08;
    const material = ref.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.08 + solvedRatio * 0.18;
  });

  return (
    <mesh ref={ref} position={[0, 0, -1.9]}>
      <planeGeometry args={[6.8, 0.08]} />
      <meshBasicMaterial color="#ffe45d" transparent opacity={0.12} />
    </mesh>
  );
}

function BrokenPathAtmosphere({ solvedRatio }: { solvedRatio: number }) {
  return (
    <Canvas
      className="broken-path-r3f"
      camera={{ position: [0, 0, 4.8], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.6} />
      <SignalBeam solvedRatio={solvedRatio} />
      {Array.from({ length: 38 }, (_, index) => (
        <SignalShard index={index} key={`signal-shard-${index}`} solvedRatio={solvedRatio} />
      ))}
    </Canvas>
  );
}

function getChoice(node: SwitchNode, selections: Record<string, string>) {
  return node.choices.find((choice) => choice.id === selections[node.id]) ?? node.choices[0];
}

function keyActivate(event: KeyboardEvent<SVGGElement>, callback: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
}

export function BrokenPathPuzzle({
  unlocked,
  canReview,
  mode,
  session,
  state,
  onStateChange,
  onModeChange,
  onBack,
  onLog,
}: BrokenPathPuzzleProps) {
  const [message, setMessage] = useState("Flip the broken channels until the gold current reaches all four tower flags.");
  const selections = useMemo(() => normalizeSelections(state.routeSelections), [state.routeSelections]);
  const completed = brokenPathSolved(state);
  const correctCount = correctSwitchCount({ ...state, routeSelections: selections });
  const solvedRatio = correctCount / SWITCH_NODES.length;
  const routeComplete = correctCount === SWITCH_NODES.length;

  function updateSelections(nextSelections: Record<string, string>, completedState?: Partial<BrokenPathState>) {
    onStateChange({
      solvedPairIds: solvedStageIds({ ...state, routeSelections: nextSelections }),
      routeSelections: nextSelections,
      completedAt: completedState?.completedAt,
      finalWord: completedState?.finalWord,
    });
  }

  function toggleSwitch(node: SwitchNode) {
    const current = getChoice(node, selections);
    const nextChoice = node.choices.find((choice) => choice.id !== current.id) ?? node.choices[0];
    const nextSelections = {
      ...selections,
      [node.id]: nextChoice.id,
    };
    updateSelections(nextSelections);
    setMessage(`${node.title} now follows the ${nextChoice.label} channel.`);
    onLog?.("info", `Broken Path ${node.label} flipped to ${nextChoice.label}.`);
  }

  function confirmPath() {
    if (!routeComplete) {
      setMessage(`The current breaks at ${SWITCH_NODES.length - correctCount} channel${SWITCH_NODES.length - correctCount === 1 ? "" : "s"}.`);
      onLog?.("warn", "Broken Path switchboard confirmation failed.");
      return;
    }

    const completedAt = new Date().toISOString();
    updateSelections(selections, {
      completedAt,
      finalWord: BROKEN_PATH_FINAL_WORD,
    });
    setMessage("All channels hold. The broken road speaks the next name.");
    onLog?.("ok", `Broken Path solved. ${BROKEN_PATH_FINAL_WORD} recovered from the switchboard.`);
  }

  return (
    <main className="broken-path-page" aria-label="The Broken Path puzzle page">
      <BrokenPathAtmosphere solvedRatio={solvedRatio} />
      <div className="broken-path-scanlines" aria-hidden="true" />

      {!unlocked ? (
        <section className="broken-path-page-lock" aria-label="Broken Path locked">
          <Lock size={42} />
          <h2>The channels sleep beneath the sealed first story.</h2>
          <p>Adventure Mode opens this page after ORIGIN. Archivists can use Moderation Mode to inspect and repair the mechanism.</p>
          {canReview ? (
            <button type="button" onClick={() => onModeChange("moderation")}>
              <Sparkles size={16} />
              Open Moderation View
            </button>
          ) : null}
        </section>
      ) : (
        <section className="broken-path-board-shell" aria-label="Broken Path switchboard">
            <svg className="broken-path-board" viewBox="0 0 1280 484" role="img" aria-labelledby="broken-path-board-title">
              <title id="broken-path-board-title">Interactive switchboard with twelve tappable connector channels</title>
              <defs>
                <filter id="broken-path-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="broken-path-panel-fill" x1="0" x2="1">
                  <stop offset="0%" stopColor="#142431" stopOpacity="0.74" />
                  <stop offset="55%" stopColor="#20303d" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#0b141d" stopOpacity="0.76" />
                </linearGradient>
                <radialGradient id="broken-path-thruster" cx="0%" cy="50%" r="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="34%" stopColor="#fff1a4" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#ffe45d" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect x="4" y="0" width="1272" height="484" className="broken-path-board-backdrop" />
              <rect x="23" y="4" width="1234" height="476" className="broken-path-board-frame" />
              <rect x="42" y="28" width="1196" height="428" className="broken-path-board-glass" />
              <g className="broken-path-map-noise" aria-hidden="true">
                <circle cx="212" cy="114" r="82" />
                <circle cx="650" cy="120" r="148" />
                <circle cx="1030" cy="310" r="126" />
                <path d="M92 440c88-20 128-88 208-118 106-40 152 58 258 28 132-38 148-210 312-200 96 6 154 78 262 38" />
                <path d="M145 90c120 14 170-70 264-34 76 30 112 92 224 64 122-30 176-122 310-88 72 18 128 64 244 42" />
              </g>

              {SWITCHBOARD_GROUPS.map((group, index) => (
                <g className="broken-path-column-title" key={group.id}>
                  <text x={index === 0 ? 390 : index === 1 ? 804 : 1126} y="62">
                    {group.title}
                  </text>
                </g>
              ))}

              <g className="broken-path-start" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <rect x={60 + item * 24} y="268" width="19" height="19" key={`starter-${item}`} />
                ))}
                <path d="M156 277h40" />
                <path d="M196 277c12-18 34-18 48 0-14 18-36 18-48 0Z" />
                <ellipse cx="150" cy="277" rx="35" ry="18" fill="url(#broken-path-thruster)" />
              </g>

              <g className="broken-path-static-lines" aria-hidden="true">
                <path d="M292 228h143" />
                <path d="M280 323l66 37h90" />
                <path d="M300 420l98 36h198" />
                <path d="M506 205h90l88 71" />
                <path d="M506 350h91l86-74" />
                <path d="M596 205h31" />
                <path d="M618 190v31" />
                <path d="M630 190v31" />
                <path d="M594 350h32" />
                <path d="M616 334v32" />
                <path d="M628 334v32" />
                <path d="M752 205h169" />
                <path d="M752 276h170" />
                <path d="M852 164h72" />
                <path d="M852 276h72" />
                <path d="M922 164h94" />
                <path d="M922 276h94" />
                <path d="M922 350h94" />
                <path d="M952 164v28" />
                <path d="M965 164v28" />
                <path d="M952 350v28" />
                <path d="M965 350v28" />
              </g>

              {SWITCH_NODES.flatMap((node) =>
                node.choices.map((choice) => (
                  <polyline
                    className={selections[node.id] === choice.id ? "switch-route active" : "switch-route dormant"}
                    filter={selections[node.id] === choice.id ? "url(#broken-path-glow)" : undefined}
                    key={`${node.id}-${choice.id}`}
                    points={choice.points}
                  />
                )),
              )}

              {SWITCH_NODES.map((node) => {
                const selected = getChoice(node, selections);
                const correct = selected.id === node.correct;

                return (
                  <g
                    className={["switch-node", correct ? "correct" : "", completed ? "completed" : ""].filter(Boolean).join(" ")}
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.title}, channel ${node.label}, currently ${selected.label}. Tap to flip.`}
                    onClick={() => toggleSwitch(node)}
                    onKeyDown={(event) => keyActivate(event, () => toggleSwitch(node))}
                  >
                    <rect x={node.x} y={node.y} width="64" height="44" rx="1" />
                    <line x1={node.x - 10} y1={node.y + 44} x2={node.x + 74} y2={node.y + 44} />
                    <text x={node.x + 32} y={node.y + 28}>
                      {node.label}
                    </text>
                    <circle cx={node.x + (selected.id === "upper" ? 82 : -12)} cy={node.y + 22} r="8" />
                  </g>
                );
              })}

              <g className="broken-path-flags" aria-hidden="true">
                {[164, 276, 350, 424].map((y, index) => (
                  <g className={routeComplete ? "lit" : ""} key={`flag-${y}`}>
                    <path d={`M1202 ${y - 18}v34`} />
                    <path d={`M1207 ${y - 16}l20 4-7 8 9 7-22-4Z`} />
                  </g>
                ))}
              </g>
            </svg>

            <div className="broken-path-board-footer">
              <button type="button" className="confirm" onClick={confirmPath}>
                  Confirm
              </button>
              <p aria-live="polite">{completed ? BROKEN_PATH_FINAL_WORD : message}</p>
            </div>
          </section>
      )}
    </main>
  );
}
