import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/hooks/useGameStore";
import { useHookedFish } from "@/hooks/useHookedFish";
import { playCatchSuccessSound } from "@/lib/weatherAudio";
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

/** Slightly brighter chime for the rarer tiers — presentational only,
 *  never touches the actual roll/odds. */
const RARITY_BOOST: Record<Rarity, number> = {
  common: 1,
  rare: 1.1,
  epic: 1.25,
  legendary: 1.45,
  mythic: 1.6,
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

// ---- catch-impact timeline (all values in ms, relative to the instant
// phase becomes "caught") -------------------------------------------------
// PULL (t=0, handled in Angler.tsx as a brief rod-tip glow) -> DELAY ->
// GLOW -> FLASH -> FISH POP -> "1 in X" -> NAME + WEIGHT -> FADE OUT.
const T_DELAY = 200; // nothing shown yet
const T_GLOW_START = T_DELAY; // 200
const T_GLOW_GROW = 200; // glow builds for 200ms
const T_FLASH_START = T_GLOW_START + T_GLOW_GROW; // 400
const T_FLASH_DUR = 70;
const T_RAYS_START = T_FLASH_START; // rays shoot out with the flash
const T_RAYS_DUR = 380;
const T_FISH_START = T_FLASH_START + 30; // fish pops right as the flash hits
const T_FISH_DUR = 280;
const T_ODDS_START = T_FISH_START + 150; // "1 in X", 150ms after the fish
const T_ODDS_DUR = 250;
const T_NAME_START = T_ODDS_START + 80; // name+weight, 80ms after that
const T_NAME_DUR = 250;
const T_GLOW_FADE_DUR = 1300; // glow's own build+hold+fade, from T_GLOW_START
// Impact-layer DOM (glow/flash/rays/sparkles) is torn down after this —
// comfortably past every animation above, safely before Angler.tsx flips
// the phase back to "idle" at t=1.9s (which fades the whole popup out).
const IMPACT_FX_LIFETIME_MS = 1650;

const RAY_COUNT = 12;
const SPARKLE_COUNT = 16;

interface Ray {
  angle: number;
  length: number;
  width: number;
  jitter: number;
}

interface Sparkle {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  duration: number;
  star: boolean;
}

/** Tiny deterministic PRNG so a given catch's burst is stable across
 *  re-renders within its lifetime, without needing to store the arrays. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRays(seed: number): Ray[] {
  const rand = mulberry32(seed);
  return Array.from({ length: RAY_COUNT }, (_, i) => ({
    angle: (360 / RAY_COUNT) * i + (rand() - 0.5) * 12,
    length: 110 + rand() * 100,
    width: 3 + rand() * 3,
    jitter: rand() * 40,
  }));
}

function makeSparkles(seed: number): Sparkle[] {
  const rand = mulberry32(seed + 1);
  return Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
    angle: (360 / SPARKLE_COUNT) * i + (rand() - 0.5) * 26,
    distance: 45 + rand() * 85,
    size: rand() < 0.3 ? 9 + rand() * 5 : 3 + rand() * 3,
    // spread sparkle spawns across the glow build-up window so they trickle
    // out rather than all popping at once
    delay: T_GLOW_START + rand() * 260,
    duration: 700 + rand() * 500,
    star: rand() < 0.35,
  }));
}

/**
 * Catch-reveal overlay, screen-anchored above the character. Unlike the
 * old version, nothing here is shown during "bite"/"reel" — the fish and
 * its stats are the reward for landing the catch, so they only appear once
 * `phase` actually reaches "caught", and even then not all at once: a
 * short delay, then a small glow, a quick flash + radial rays, the fish
 * popping in, and finally the odds/name text staggered in behind it.
 */
export function CatchPopup() {
  const phase = useGameStore((s) => s.phase);
  const current = useGameStore((s) => s.current);
  const [catchKey, setCatchKey] = useState(0);
  const [impactAlive, setImpactAlive] = useState(false);
  const prevPhase = useRef(phase);
  const cleanupTimer = useRef<number | null>(null);
  const soundTimer = useRef<number | null>(null);

  // Fire the whole sequence exactly on the reel -> caught transition.
  // Re-keying restarts every CSS animation below from frame zero, including
  // on back-to-back catches.
  useEffect(() => {
    if (prevPhase.current !== "caught" && phase === "caught") {
      setCatchKey((k) => k + 1);
      setImpactAlive(true);

      if (cleanupTimer.current) window.clearTimeout(cleanupTimer.current);
      cleanupTimer.current = window.setTimeout(() => {
        setImpactAlive(false);
      }, IMPACT_FX_LIFETIME_MS);

      // Sync the chime to the actual impact (the flash), not the moment
      // the fish leaves the water.
      if (soundTimer.current) window.clearTimeout(soundTimer.current);
      const rarity = (current?.isMonster ? "mythic" : current?.rarity) as Rarity | undefined;
      soundTimer.current = window.setTimeout(() => {
        playCatchSuccessSound(rarity ? RARITY_BOOST[rarity] : 1);
      }, T_FLASH_START);
    }
    prevPhase.current = phase;
  }, [phase, current]);

  useEffect(() => {
    return () => {
      if (cleanupTimer.current) window.clearTimeout(cleanupTimer.current);
      if (soundTimer.current) window.clearTimeout(soundTimer.current);
    };
  }, []);

  const rays = useMemo(() => makeRays(catchKey), [catchKey]);
  const sparkles = useMemo(() => makeSparkles(catchKey), [catchKey]);

  // Only "caught" shows anything — no early reveal during bite/reel
  // anymore, so the notification can't feel like it "just appears".
  const visible = !!current && phase === "caught";
  if (!current) return null;

  const rarity = (current.isMonster ? "mythic" : current.rarity) as Rarity | undefined;
  const glow = rarity ? RARITY_GLOW[rarity] : "#facc15";

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[9%] z-30 flex -translate-x-1/2 flex-col items-center transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* very subtle full-screen flash — barely there, timed to the impact */}
      {impactAlive && (
        <div
          key={`flash-${catchKey}`}
          className="pointer-events-none fixed inset-0 -z-20"
          style={{
            background: "#ffffff",
            opacity: 0,
            animation: `catchGlobalFlash ${T_FLASH_DUR + 20}ms ease-out ${T_FLASH_START}ms both`,
          }}
        />
      )}

      {/* micro screen-punch, timed to the impact rather than the pull */}
      <div
        className="absolute -z-10"
        style={{
          animation: impactAlive
            ? `catchScreenPunch 150ms ease-out ${T_FLASH_START}ms both`
            : undefined,
        }}
      />

      {/* ===== impact layer: glow / flash / rays / sparkles, all timed off catchKey ===== */}
      {impactAlive && (
        <div key={`impact-${catchKey}`} className="absolute -z-10 top-[20px]" aria-hidden="true">
          {/* small soft glow behind the fish, growing in then holding/fading */}
          <div
            className="absolute rounded-full"
            style={{
              left: "50%",
              top: "50%",
              width: 200,
              height: 200,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, #ffffff 0%, ${glow}99 40%, transparent 72%)`,
              opacity: 0,
              animation: `catchGlowBuild ${T_GLOW_FADE_DUR}ms ease-out ${T_GLOW_START}ms both`,
            }}
          />
          {/* localized flash, brighter + much shorter than the soft glow */}
          <div
            className="absolute rounded-full"
            style={{
              left: "50%",
              top: "50%",
              width: 150,
              height: 150,
              transform: "translate(-50%, -50%)",
              background: "#ffffff",
              filter: "blur(2px)",
              opacity: 0,
              animation: `catchLocalFlash ${T_FLASH_DUR}ms ease-out ${T_FLASH_START}ms both`,
            }}
          />
          {/* radial rays, spreading out from behind the fish then gone */}
          {rays.map((r, i) => (
            <div
              key={i}
              className="absolute origin-bottom"
              style={
                {
                  left: "50%",
                  top: "50%",
                  width: r.width,
                  height: r.length,
                  background: `linear-gradient(180deg, ${glow}ee, ${glow}00)`,
                  transform: `translate(-50%, -100%) rotate(${r.angle}deg) scaleY(0.3)`,
                  opacity: 0,
                  animation: `catchRayShoot ${T_RAYS_DUR}ms ease-out ${T_RAYS_START + r.jitter}ms both`,
                } as React.CSSProperties
              }
            />
          ))}
          {/* sparkles trickling out during the glow build-up, then a brief
              linger before fading — kept few and small, not a shower */}
          {sparkles.map((p, i) => {
            const rad = (p.angle * Math.PI) / 180;
            const dx = Math.cos(rad) * p.distance;
            const dy = Math.sin(rad) * p.distance;
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={
                  {
                    left: "50%",
                    top: "50%",
                    width: p.size,
                    height: p.size,
                    opacity: 0,
                    color: p.star ? glow : undefined,
                    fontSize: p.star ? p.size * 2.2 : undefined,
                    lineHeight: p.star ? 1 : undefined,
                    borderRadius: p.star ? undefined : "9999px",
                    background: p.star ? undefined : "#ffffff",
                    boxShadow: p.star ? undefined : `0 0 5px 1px ${glow}aa`,
                    animation: `catchSparkle ${p.duration}ms ease-out ${p.delay}ms both`,
                    "--px": `${dx}px`,
                    "--py": `${dy}px`,
                  } as React.CSSProperties
                }
              >
                {p.star ? "✦" : null}
              </div>
            );
          })}
        </div>
      )}

      {/* fish portrait — the hero element, stays hidden until its pop */}
      <div
        key={`portrait-${catchKey}`}
        className="h-[220px] w-[260px]"
        style={{
          opacity: visible ? undefined : 0,
          animation: visible
            ? `catchFishPop ${T_FISH_DUR}ms cubic-bezier(0.22, 1.2, 0.36, 1) ${T_FISH_START}ms both`
            : undefined,
        }}
      >
        <FishPortrait isMonster={!!current.isMonster} />
      </div>

      {current.oddsOneIn && (
        <p
          key={`odds-${catchKey}`}
          className="-mt-3 text-2xl font-extrabold text-lime-400"
          style={{
            WebkitTextStroke: "2px black",
            textShadow: "0 2px 0 rgba(0,0,0,0.6)",
            opacity: visible ? undefined : 0,
            animation: visible
              ? `catchTextReveal ${T_ODDS_DUR}ms ease-out ${T_ODDS_START}ms both`
              : undefined,
          }}
        >
          1 in {current.oddsOneIn}
        </p>
      )}
      <p
        key={`name-${catchKey}`}
        className="text-xl font-extrabold text-white"
        style={{
          WebkitTextStroke: "1.5px black",
          textShadow: "0 2px 0 rgba(0,0,0,0.6)",
          opacity: visible ? undefined : 0,
          animation: visible
            ? `catchTextReveal ${T_NAME_DUR}ms ease-out ${T_NAME_START}ms both`
            : undefined,
        }}
      >
        {current.name} ({current.weight}kg)
      </p>

      <style>{`
        @keyframes catchScreenPunch {
          0% { transform: translateX(-50%) scale(1); }
          40% { transform: translateX(-50%) scale(1.012); }
          100% { transform: translateX(-50%) scale(1); }
        }
        @keyframes catchGlobalFlash {
          0% { opacity: 0; }
          30% { opacity: 0.09; }
          100% { opacity: 0; }
        }
        @keyframes catchGlowBuild {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          15% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
          55% { opacity: 0.55; transform: translate(-50%, -50%) scale(1.05); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes catchLocalFlash {
          0% { opacity: 0; }
          40% { opacity: 0.95; }
          100% { opacity: 0; }
        }
        @keyframes catchRayShoot {
          0% { opacity: 0; transform: translate(-50%, -100%) scaleY(0.3); }
          25% { opacity: 0.8; }
          100% { opacity: 0; transform: translate(-50%, -100%) scaleY(1); }
        }
        @keyframes catchSparkle {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          15% { opacity: 1; transform: translate(calc(-50% + var(--px) * 0.6), calc(-50% + var(--py) * 0.6)) scale(1); }
          70% { opacity: 0.9; transform: translate(calc(-50% + var(--px)), calc(-50% + var(--py))) scale(0.9); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--px) * 1.1), calc(-50% + var(--py) * 1.1)) scale(0.6); }
        }
        @keyframes catchFishPop {
          0% { opacity: 0; transform: scale(0.7); }
          70% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes catchTextReveal {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}