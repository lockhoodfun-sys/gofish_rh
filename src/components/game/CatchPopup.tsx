import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/hooks/useGameStore";
import { useHookedFish } from "@/hooks/useHookedFish";
import { FishMesh } from "./Fish";
import { MonsterFishMesh } from "./MonsterFish";
import type { Rarity } from "@/lib/fishRules";

const RARITY_GLOW: Record<Rarity, string> = {
  common: "#cbd5e1",
  rare: "#38bdf8",
  epic: "#a78bfa",
  legendary: "#fb923c",
  mythic: "#fbbf24",
};

/** Slow trophy-shot spin, independent of FishModel's own little swim wiggle. */
function Spinner({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  return <group ref={g}>{children}</group>;
}

/** World-unit body length FishModel normalises each rarity's GLB to (see
 *  SIZE_MULTIPLIER in fishModels.ts) — mythic (~45) is ~5x common (~9), so a
 *  fixed `scale` would either clip the big ones or shrink the small ones to
 *  a dot. Dividing the target on-screen length by this neutralises that. */
const MONSTER_LENGTH = 4;
const TARGET_LEN = 2.0;
const TARGET_LEN_MONSTER = 3.2;

/** Mini self-contained 3D viewport that renders the caught species as a
 *  floating "product shot" portrait — reuses the exact same GLB loader/
 *  normaliser as the rest of the game (FishMesh / MonsterFishMesh), just
 *  without any hook-position math since it's a screen-space UI card now. */
function FishPortrait({ isMonster }: { isMonster: boolean }) {
  const modelLength = useHookedFish((s) => s.model?.length);
  const scale = isMonster
    ? TARGET_LEN_MONSTER / MONSTER_LENGTH
    : TARGET_LEN / (modelLength ?? 9);

  return (
    <Canvas
      camera={{ position: [0, 0.3, isMonster ? 7 : 4.2], fov: 32 }}
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} />
      <Suspense fallback={null}>
        <Spinner>
          {isMonster ? (
            <MonsterFishMesh scale={scale} wagSpeed={1.4} />
          ) : (
            <FishMesh scale={scale} wagSpeed={10} />
          )}
        </Spinner>
      </Suspense>
    </Canvas>
  );
}

/**
 * Catch-reveal overlay. Replaces the old 3D fish-on-hook dangling near the
 * bobber (see git history on Angler.tsx) with a 2D-anchored card: GLB
 * portrait + light rays + odds/name/weight text, shown from the moment a
 * fish bites all the way through the reel, mirroring how many mobile
 * fishing games (e.g. Fish It) reveal the catch immediately instead of
 * relying on a physically-attached model.
 */
export function CatchPopup() {
  const phase = useGameStore((s) => s.phase);
  const current = useGameStore((s) => s.current);
  const [burstKey, setBurstKey] = useState(0);

  // Re-trigger the glow burst every time reeling starts.
  useEffect(() => {
    if (phase === "reel") setBurstKey((k) => k + 1);
  }, [phase]);

  const visible = !!current && (phase === "bite" || phase === "reel" || phase === "caught");
  if (!current) return null;

  const rarity = (current.isMonster ? "mythic" : current.rarity) as Rarity | undefined;
  const glow = rarity ? RARITY_GLOW[rarity] : "#facc15";
  const reeling = phase === "reel";

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[9%] z-30 flex -translate-x-1/2 flex-col items-center transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* diagonal light beam — only while actively reeling */}
      <div
        className="absolute -z-10 h-[140vh] w-24 transition-opacity duration-500"
        style={{
          top: "-40vh",
          left: "60%",
          background: `linear-gradient(180deg, transparent, ${glow}55, transparent)`,
          transform: "rotate(18deg)",
          opacity: reeling ? 0.9 : 0,
          filter: "blur(6px)",
          animation: reeling ? "catchBeam 1.6s ease-in-out infinite" : undefined,
        }}
      />

      {/* radial rays behind the portrait, always on while visible */}
      <div
        className="absolute -z-10 h-[420px] w-[420px] rounded-full"
        style={{
          top: "-90px",
          background: `conic-gradient(from 0deg, transparent, ${glow}33, transparent 25%, transparent 50%, ${glow}33, transparent 75%)`,
          animation: "catchRaysSpin 9s linear infinite",
        }}
      />

      {/* glow burst pulse, re-keyed whenever reeling starts */}
      <div
        key={burstKey}
        className="absolute -z-10 h-72 w-72 rounded-full"
        style={{
          top: "-60px",
          background: `radial-gradient(circle, ${glow}66 0%, transparent 70%)`,
          animation: reeling ? "catchBurst 0.7s ease-out" : undefined,
        }}
      />

      <div className="h-[220px] w-[260px]">
        <FishPortrait isMonster={!!current.isMonster} />
      </div>

      {current.oddsOneIn && (
        <p
          className="-mt-3 text-2xl font-extrabold text-lime-400"
          style={{ WebkitTextStroke: "2px black", textShadow: "0 2px 0 rgba(0,0,0,0.6)" }}
        >
          1 in {current.oddsOneIn}
        </p>
      )}
      <p
        className="text-xl font-extrabold text-white"
        style={{ WebkitTextStroke: "1.5px black", textShadow: "0 2px 0 rgba(0,0,0,0.6)" }}
      >
        {current.name} ({current.weight}kg)
      </p>

      <style>{`
        @keyframes catchRaysSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes catchBurst {
          0% { transform: scale(0.3); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes catchBeam {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}