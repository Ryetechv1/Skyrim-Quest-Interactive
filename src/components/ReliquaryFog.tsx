import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type FogWispConfig = {
  color: string;
  driftX: number;
  driftY: number;
  height: number;
  opacity: number;
  phase: number;
  rotation: number;
  speed: number;
  width: number;
  x: number;
  y: number;
  z: number;
};

const FOG_WISP_COUNT = 26;
const FOG_MOTE_COUNT = 260;
const FOG_PALETTE = ["#d9d0ba", "#b8b09c", "#87929a", "#c6b58c", "#efe1b9", "#9ca49d"];

function seeded(index: number, salt: number) {
  const value = Math.sin((index + 1) * (salt * 73.73)) * 10000;
  return value - Math.floor(value);
}

function makeFogTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const horizontal = context.createLinearGradient(0, 0, canvas.width, 0);
  horizontal.addColorStop(0, "rgba(255,255,255,0)");
  horizontal.addColorStop(0.14, "rgba(255,255,255,0.22)");
  horizontal.addColorStop(0.5, "rgba(255,255,255,0.72)");
  horizontal.addColorStop(0.86, "rgba(255,255,255,0.2)");
  horizontal.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = horizontal;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = "destination-in";
  const vertical = context.createLinearGradient(0, 0, 0, canvas.height);
  vertical.addColorStop(0, "rgba(255,255,255,0)");
  vertical.addColorStop(0.24, "rgba(255,255,255,0.45)");
  vertical.addColorStop(0.5, "rgba(255,255,255,0.9)");
  vertical.addColorStop(0.76, "rgba(255,255,255,0.45)");
  vertical.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = vertical;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = "source-over";
  for (let index = 0; index < 180; index += 1) {
    const x = seeded(index, 1.91) * canvas.width;
    const y = seeded(index, 2.73) * canvas.height;
    const length = 16 + seeded(index, 3.12) * 72;
    const alpha = 0.018 + seeded(index, 4.6) * 0.035;
    context.strokeStyle = `rgba(255,255,255,${alpha})`;
    context.lineWidth = 1 + seeded(index, 5.2) * 1.4;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + (seeded(index, 6.4) - 0.5) * 12);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(query.matches);
    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

function FogWisp({
  config,
  reducedMotion,
  texture,
}: {
  config: FogWispConfig;
  reducedMotion: boolean;
  texture: THREE.Texture;
}) {
  const ref = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);
  const viewport = useThree((state) => state.viewport);

  function applyTransform(elapsed: number) {
    if (!ref.current) {
      return;
    }

    const time = elapsed * config.speed + config.phase;
    const pulse = reducedMotion ? 0 : Math.sin(time * 1.12) * 0.18;
    const x = (config.x - 0.5) * viewport.width + Math.sin(time * 0.37) * config.driftX;
    const y = (config.y - 0.5) * viewport.height + Math.cos(time * 0.29) * config.driftY;

    ref.current.position.set(x, y, config.z);
    ref.current.rotation.z = config.rotation + (reducedMotion ? 0 : Math.sin(time * 0.21) * 0.07);
    ref.current.scale.set(
      viewport.width * config.width * (1 + pulse * 0.08),
      viewport.height * config.height * (1 - pulse * 0.05),
      1,
    );

    ref.current.material.opacity = config.opacity * (reducedMotion ? 0.74 : 0.82 + pulse);
  }

  useEffect(() => {
    applyTransform(0);
  });

  useFrame(({ clock }) => {
    if (!reducedMotion) {
      applyTransform(clock.elapsedTime);
    }
  });

  return (
    <mesh ref={ref} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={config.color}
        depthTest={false}
        depthWrite={false}
        map={texture}
        opacity={config.opacity}
        transparent
      />
    </mesh>
  );
}

function FogMotes({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>>(null);
  const viewport = useThree((state) => state.viewport);
  const geometry = useMemo(() => {
    const positions = new Float32Array(FOG_MOTE_COUNT * 3);

    for (let index = 0; index < FOG_MOTE_COUNT; index += 1) {
      positions[index * 3] = seeded(index, 14.2) - 0.5;
      positions[index * 3 + 1] = seeded(index, 15.7) - 0.5;
      positions[index * 3 + 2] = -1.1 - seeded(index, 16.4) * 1.4;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return nextGeometry;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) {
      return;
    }

    const time = clock.elapsedTime;
    ref.current.rotation.z = Math.sin(time * 0.045) * 0.035;
    ref.current.position.x = Math.sin(time * 0.09) * 0.12;
    ref.current.position.y = Math.cos(time * 0.07) * 0.08;
    ref.current.material.opacity = 0.22 + Math.sin(time * 0.5) * 0.04;
  });

  return (
    <points ref={ref} geometry={geometry} scale={[viewport.width * 1.12, viewport.height * 1.12, 1]}>
      <pointsMaterial
        color="#f0e1be"
        depthTest={false}
        depthWrite={false}
        opacity={0.2}
        size={1.8}
        sizeAttenuation={false}
        transparent
      />
    </points>
  );
}

function ReliquaryFogField({ reducedMotion }: { reducedMotion: boolean }) {
  const texture = useMemo(makeFogTexture, []);
  const veils = useMemo<FogWispConfig[]>(
    () => [
      {
        color: "#cbd1c8",
        driftX: 0.36,
        driftY: 0.18,
        height: 0.19,
        opacity: 0.24,
        phase: 0.3,
        rotation: -0.08,
        speed: 0.06,
        width: 1.12,
        x: 0.42,
        y: 0.24,
        z: -1.5,
      },
      {
        color: "#dfd1af",
        driftX: 0.52,
        driftY: 0.2,
        height: 0.16,
        opacity: 0.18,
        phase: 2.1,
        rotation: 0.11,
        speed: 0.045,
        width: 1.02,
        x: 0.62,
        y: 0.57,
        z: -1.7,
      },
      {
        color: "#8f9ca1",
        driftX: 0.42,
        driftY: 0.16,
        height: 0.13,
        opacity: 0.2,
        phase: 4.2,
        rotation: -0.18,
        speed: 0.052,
        width: 0.92,
        x: 0.2,
        y: 0.82,
        z: -1.6,
      },
    ],
    [],
  );
  const wisps = useMemo<FogWispConfig[]>(
    () =>
      Array.from({ length: FOG_WISP_COUNT }, (_, index) => ({
        color: FOG_PALETTE[index % FOG_PALETTE.length],
        driftX: 0.32 + seeded(index, 3.8) * 0.84,
        driftY: 0.12 + seeded(index, 4.1) * 0.46,
        height: 0.035 + seeded(index, 5.5) * 0.07,
        opacity: 0.11 + seeded(index, 8.6) * 0.13,
        phase: seeded(index, 7.2) * Math.PI * 2,
        rotation: -0.34 + seeded(index, 2.5) * 0.68,
        speed: 0.09 + seeded(index, 6.9) * 0.16,
        width: 0.42 + seeded(index, 1.2) * 0.48,
        x: seeded(index, 9.9),
        y: seeded(index, 10.4),
        z: -3.2 + seeded(index, 11.1) * 1.4,
      })),
    [],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <FogMotes reducedMotion={reducedMotion} />
      {veils.map((config, index) => (
        <FogWisp config={config} key={`reliquary-fog-veil-${index}`} reducedMotion={reducedMotion} texture={texture} />
      ))}
      {wisps.map((config, index) => (
        <FogWisp config={config} key={`reliquary-fog-${index}`} reducedMotion={reducedMotion} texture={texture} />
      ))}
    </>
  );
}

export function ReliquaryFog() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="reliquary-fog-layer" aria-hidden="true">
      <Canvas
        className="reliquary-fog-canvas"
        camera={{ position: [0, 0, 8], zoom: 100 }}
        dpr={[1, 1.35]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        orthographic
      >
        <ReliquaryFogField reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
