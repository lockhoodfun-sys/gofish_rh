import type { Rarity } from "@/lib/fishRules";

export interface FishModelDef {
  /** public/ URL of the Draco-compressed GLB. */
  url: string;
  /** Target body length in world units once auto-normalised. */
  length: number;
}

/**
 * Caught-fish models per rarity. Sizes follow the design brief:
 * mythic is huge, legendary slightly smaller, epic/rare medium, common small.
 * Every model is auto-centred and auto-scaled at runtime (see FishMesh), so
 * `length` is the only tuning knob needed here.
 */
/** Base body length before the per-rarity size multiplier below. */
const BASE_LENGTH = 0.9;

/** Requested size ladder: common 10x, epic 15x, rare 20x, legendary 30x, mythic 50x. */
export const SIZE_MULTIPLIER: Record<Rarity, number> = {
  common: 10,
  rare: 20,
  epic: 15,
  legendary: 30,
  mythic: 50,
};

const len = (rarity: Rarity) => BASE_LENGTH * SIZE_MULTIPLIER[rarity];

export const FISH_MODELS: Record<Rarity, FishModelDef[]> = {
  common: [{ url: "/models/fish_common.glb", length: len("common") }],
  rare: [{ url: "/models/fish_rare.glb", length: len("rare") }],
  epic: [{ url: "/models/fish_epic.glb", length: len("epic") }],
  legendary: [
    { url: "/models/fish_legendary_1.glb", length: len("legendary") },
    { url: "/models/fish_legendary_2.glb", length: len("legendary") },
  ],
  mythic: [
    { url: "/models/fish_mythic_1.glb", length: len("mythic") },
    { url: "/models/fish_mythic_2.glb", length: len("mythic") },
    { url: "/models/fish_mythic_3.glb", length: len("mythic") },
  ],
};

export const ALL_FISH_MODEL_URLS = Object.values(FISH_MODELS)
  .flat()
  .map((m) => m.url);

/** Pick one variant for a rarity (legendary/mythic have several). */
export function pickFishModel(rarity: Rarity | null | undefined): FishModelDef {
  const list = FISH_MODELS[(rarity ?? "common") as Rarity] ?? FISH_MODELS.common;
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}

/** Extra size nudge so a heavy fish reads bigger than a light one. */
export function weightScale(weightKg: number, rarity: Rarity | null | undefined): number {
  const bands: Record<Rarity, [number, number]> = {
    common: [5, 40],
    rare: [35, 120],
    epic: [100, 300],
    legendary: [280, 650],
    mythic: [600, 1300],
  };
  const [lo, hi] = bands[(rarity ?? "common") as Rarity] ?? bands.common;
  const k = Math.max(0, Math.min(1, (weightKg - lo) / Math.max(1, hi - lo)));
  return 0.88 + k * 0.32;
}
