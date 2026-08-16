import { Canvas, useFrame } from "@react-three/fiber";
import { ArrowLeft, GitBranch, Lock, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import * as THREE from "three";
import {
  BROKEN_PATH_FINAL_WORD,
  DEFAULT_BROKEN_PATH_STATE,
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
  const stageIds = solvedStageIds({ ...state, routeSelections: selections });

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

  function resetPuzzle() {
    onStateChange(DEFAULT_BROKEN_PATH_STATE);
    setMessage("The switchboard has been reset to its unstable pattern.");
    onLog?.("warn", "Broken Path switchboard reset.");
  }

  return (
    <main className="broken-path-page" aria-label="The Broken Path puzzle page">
      <BrokenPathAtmosphere solvedRatio={solvedRatio} />
      <div className="broken-path-scanlines" aria-hidden="true" />
      <header className="broken-path-page-header">
        <button type="button" className="broken-path-back" onClick={onBack}>
          <ArrowLeft size={16} />
          Reliquary
        </button>
        <div>
          <span>Next Puzzle Phase</span>
          <h1>The Broken Path</h1>
          <p>
            {unlocked
              ? "Tap a numbered channel to flip its alignment. Gold carries the active current; ash-gray shows dormant branches."
              : "Seal ORIGIN in Adventure Mode to wake this path, or switch to Moderation Mode for review."}
          </p>
        </div>
        <div className="broken-path-page-mode" aria-label="Puzzle access mode">
          <strong>{session?.username ?? "No Session"}</strong>
          {canReview ? (
            <div role="group" aria-label="Choose Broken Path review mode">
              <button type="button" className={mode === "adventure" ? "active" : ""} onClick={() => onModeChange("adventure")}>
                Adventure
              </button>
              <button type="button" className={mode === "moderation" ? "active" : ""} onClick={() => onModeChange("moderation")}>
                Moderation
              </button>
            </div>
          ) : (
            <span>{mode === "moderation" ? "Moderation" : "Adventure"}</span>
          )}
        </div>
      </header>

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
        <>
          <section className="broken-path-board-shell" aria-label="Broken Path switchboard">
            <div className="broken-path-board-status">
              <div>
                <span>Active current</span>
                <strong>{completed ? BROKEN_PATH_FINAL_WORD : `${correctCount}/${SWITCH_NODES.length} channels aligned`}</strong>
              </div>
              <p aria-live="polite">{message}</p>
            </div>

            <svg className="broken-path-board" viewBox="0 0 1280 560" role="img" aria-labelledby="broken-path-board-title">
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
              </defs>

              <rect x="22" y="20" width="1236" height="510" className="broken-path-board-frame" />
              <rect x="48" y="48" width="1184" height="446" className="broken-path-board-glass" />
              <g className="broken-path-map-noise" aria-hidden="true">
                <circle cx="216" cy="126" r="78" />
                <circle cx="620" cy="112" r="128" />
                <circle cx="1022" cy="328" r="116" />
                <path d="M102 438c90-20 134-86 212-118 102-42 145 60 245 32 138-38 151-214 316-203 98 7 143 75 255 40" />
              </g>

              {SWITCHBOARD_GROUPS.map((group, index) => (
                <g className="broken-path-column-title" key={group.id}>
                  <text x={index === 0 ? 380 : index === 1 ? 790 : 1116} y="70">
                    {group.title}
                  </text>
                  <text x={index === 0 ? 380 : index === 1 ? 790 : 1116} y="91">
                    {group.subtitle}
                  </text>
                </g>
              ))}

              <g className="broken-path-start" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <rect x={64 + item * 24} y="260" width="18" height="18" key={`starter-${item}`} />
                ))}
                <path d="M164 269h38" />
                <path d="M202 269c12-18 34-18 48 0-14 18-36 18-48 0Z" />
              </g>

              <g className="broken-path-static-lines" aria-hidden="true">
                <path d="M505 100h92l18 18h46" />
                <path d="M505 352h86l48-50h54" />
                <path d="M505 418h112l32-28h54" />
                <path d="M845 164h78l16 16h92" />
                <path d="M885 278h86l52 37h68" />
                <path d="M885 318h78l30 42h86" />
                <path d="M926 170h28" />
                <path d="M948 170v22" />
                <path d="M960 170v22" />
                <path d="M926 360h28" />
                <path d="M948 360v22" />
                <path d="M960 360v22" />
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
                {[170, 315, 405, 450].map((y, index) => (
                  <g className={routeComplete ? "lit" : ""} key={`flag-${y}`}>
                    <path d={`M1204 ${y - 18}v34`} />
                    <path d={`M1208 ${y - 16}l23 4-8 8 10 7-25-4Z`} />
                    <text x="1130" y={y + 6}>
                      {String(index + 1).padStart(2, "0")}
                    </text>
                  </g>
                ))}
              </g>
            </svg>

            <div className="broken-path-board-footer">
              <ol aria-label="Solved switchboard stages">
                {SWITCHBOARD_GROUPS.map((group) => (
                  <li className={stageIds.includes(group.id) ? "solved" : ""} key={group.id}>
                    <GitBranch size={14} />
                    <span>{group.title}</span>
                  </li>
                ))}
              </ol>
              <div>
                <button type="button" onClick={resetPuzzle}>
                  <RefreshCcw size={16} />
                  Reset
                </button>
                <button type="button" className="confirm" onClick={confirmPath}>
                  <ShieldCheck size={16} />
                  Confirm
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
