import { create } from "zustand";
import {
  getFishData,
  mult,
  rollMutation,
  type FishSpecies,
  type Rarity,
} from "@/lib/fishRules";
import { equippedRod } from "@/hooks/useRodStore";
import { equippedBait } from "@/hooks/useBaitStore";

export type Phase = "idle" | "cast" | "waiting" | "bite" | "reel" | "caught";

export interface FishCatch {
  speciesId: string;
  name: string;
  mutationKey: string;
  mutationLabel: string;
  weight: number;
  color: string;
  rarity?: Rarity | null;
  isMonster?: boolean;
}

function rollWeight(s: FishSpecies) {
  return Number((s.min_weight_kg + Math.random() * (s.max_weight_kg - s.min_weight_kg)).toFixed(2));
}

function toCatch(s: FishSpecies): FishCatch {
  const m = rollMutation();
  return {
    speciesId: s.id,
    name: s.name,
    mutationKey: m.key,
    mutationLabel: m.label,
    color: s.color,
    weight: rollWeight(s),
    rarity: s.rarity,
    ...(s.is_monster ? { isMonster: true } : {}),
  };
}

/**
 * Data-driven roll: monster chance from game_config, pool filtered by the
 * active rod's weight cap, then weighted by rarity × bait × weather.
 */
export function rollFish(weatherKind = "cerah"): FishCatch {
  const data = getFishData();
  const monster = data.species.find((s) => s.is_monster);
  const chance = data.config["monster_catch_chance"] ?? 0;
  if (monster && Math.random() < chance) return toCatch(monster);

  const rod = equippedRod();
  const cap = rod.max_catch_weight_kg;
  const bait = equippedBait();
  // Luck raises the odds of the better rarities, it never guarantees them:
  // weather, species pool and base weights still scale the same numbers.
  const luck =
    (1 + Math.max(0, rod.luck_percent) / 100) * (1 + Math.max(0, bait.luck_percent) / 100);
  const weather = data.weather[weatherKind];

  const pool = data.species.filter((s) => !s.is_monster && s.min_weight_kg <= cap);
  if (pool.length === 0) return toCatch(data.species[0] ?? (monster as FishSpecies));

  const weights = pool.map((s) => {
    const r = s.rarity ?? "common";
    const base = data.rarityWeights[r] ?? 1;
    const luckBonus = r === "common" ? 1 : luck;
    return Math.max(
      0,
      base * luckBonus * mult(bait?.rarity_multiplier, r) * mult(weather?.rarity_multiplier, r),
    );
  });
  const total = weights.reduce((a, b) => a + b, 0);

  let pick = pool[pool.length - 1]!;
  if (total > 0) {
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i]!;
      if (roll <= 0) {
        pick = pool[i]!;
        break;
      }
    }
  }

  return toCatch(pick);
}

/** Fire-and-forget profile counter sync. Never blocks or breaks gameplay. */
function syncCatchToProfile(f: FishCatch) {
  const rarity: Rarity = f.isMonster ? "mythic" : ((f.rarity ?? "common") as Rarity);
  void (async () => {
    try {
      const { useProfileStore } = await import("@/hooks/useProfileStore");
      const proof = useProfileStore.getState().proof;
      if (!proof) {
        const { toast } = await import("sonner");
        toast.error("Catch not saved — connect your wallet and sign to sync your profile.");
        return;
      }
      const { recordCatch } = await import("@/lib/profile.functions");
      const profile = await recordCatch({
        data: {
          proof,
          rarity,
          speciesId: f.speciesId,
          weightKg: f.weight,
          mutationKey: f.mutationKey,
        },
      });
      if (profile) useProfileStore.getState().setProfile(profile);
      const { useInventoryStore } = await import("@/hooks/useInventoryStore");
      await useInventoryStore.getState().refresh();
    } catch (error) {
      const { toast } = await import("sonner");
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not save your catch: ${message}`);
    }
  })();
}

interface GameStore {
  phase: Phase;
  message: string;
  score: number;
  totalWeight: number;
  last: FishCatch | null;
  /** true = rod stowed on back */
  rodStowed: boolean;
  bagOpen: boolean;
  setPhase: (p: Phase) => void;
  setMessage: (m: string) => void;
  setRodStowed: (v: boolean) => void;
  toggleRodStowed: () => void;
  setBagOpen: (v: boolean) => void;
  toggleBag: () => void;
  landFish: (f: FishCatch) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  phase: "idle",
  message: "Press SPACE to cast your line",
  score: 0,
  totalWeight: 0,
  last: null,
  rodStowed: false,
  bagOpen: false,
  setPhase: (phase) => set({ phase }),
  setMessage: (message) => set({ message }),
  setRodStowed: (rodStowed) => set({ rodStowed }),
  toggleRodStowed: () => set((s) => ({ rodStowed: !s.rodStowed })),
  setBagOpen: (bagOpen) => set({ bagOpen }),
  toggleBag: () => set((s) => ({ bagOpen: !s.bagOpen })),
  landFish: (f) => {
    syncCatchToProfile(f);
    set((s) => ({
      score: s.score + 1,
      totalWeight: Number((s.totalWeight + f.weight).toFixed(2)),
      last: f,
    }));
  },
}));



