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
import type { Profile } from "@/hooks/useProfileStore";

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
 *
 * IMPORTANT: this runs client-side and is now PREVIEW-ONLY. It picks which
 * fish model bites, how long the bite window is, and drives the reel/fight
 * animation — but it is never trusted for scoring. The authoritative catch
 * (species/rarity/weight/mutation) is rolled independently on the server by
 * `record_catch` (see drizzle/migrations/0005_security_fixes.sql) and is
 * what actually gets saved. `landFish` reconciles the two once the server
 * responds — see the comment there.
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

/**
 * Records the catch server-side and reconciles the store with the
 * authoritative result. `onSettled` receives the true catch (or null if the
 * save failed, e.g. no wallet proof or cooldown rejection) so the caller can
 * correct anything it displayed optimistically (score/weight/toast message).
 * Never throws — errors are surfaced via toast, and `onSettled(null)` still
 * fires so the caller can roll back its optimistic UI update.
 */
function syncCatchToProfile(weatherKind: string, onSettled: (result: FishCatch | null) => void) {
  void (async () => {
    try {
      const { useProfileStore } = await import("@/hooks/useProfileStore");
      const proof = useProfileStore.getState().proof;
      if (!proof) {
        const { toast } = await import("sonner");
        toast.error("Catch not saved — connect your wallet and sign to sync your profile.");
        onSettled(null);
        return;
      }
      const { recordCatch } = await import("@/lib/profile.functions");
      const result = await recordCatch({ data: { proof, weatherKind } });
      if (result.profile) {
        useProfileStore.getState().setProfile(result.profile as Profile);
      }
      const { useInventoryStore } = await import("@/hooks/useInventoryStore");
      await useInventoryStore.getState().refresh();
      onSettled({
        speciesId: result.speciesId,
        name: result.speciesName,
        mutationKey: result.mutationKey,
        mutationLabel: result.mutationLabel,
        weight: result.weightKg,
        color: result.color,
        rarity: result.rarity,
        isMonster: result.isMonster,
      });
    } catch (error) {
      const { toast } = await import("sonner");
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not save your catch: ${message}`);
      onSettled(null);
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
  /**
   * `f` is the client's preview roll, used to update score/weight/last
   * immediately so the HUD feels instant. It is then reconciled against the
   * server's authoritative catch once `record_catch` responds — if the two
   * differ (independent rolls) or the save fails outright, the store is
   * corrected in place. `weatherKind` is advisory-only server-side.
   */
  landFish: (f: FishCatch, weatherKind?: string) => void;
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
  landFish: (f, weatherKind = "cerah") => {
    // Optimistic update from the client's preview roll — keeps the HUD
    // (score, weight, "Caught X" message) feeling instant.
    set((s) => ({
      score: s.score + 1,
      totalWeight: Number((s.totalWeight + f.weight).toFixed(2)),
      last: f,
    }));
    syncCatchToProfile(weatherKind, (result) => {
      if (result) {
        // Server truth may differ from the preview roll (independent RNG) —
        // swap the optimistic weight/last for the authoritative values.
        // Only fish actually persisted server-side ever affect the wallet
        // economy, so this is what must be shown as the "real" catch.
        set((s) => ({
          totalWeight: Number((s.totalWeight - f.weight + result.weight).toFixed(2)),
          last: result,
        }));
      } else {
        // Save failed (no proof, cooldown rejection, network error, etc.) —
        // roll back the optimistic score/weight bump entirely.
        set((s) => ({
          score: Math.max(0, s.score - 1),
          totalWeight: Number(Math.max(0, s.totalWeight - f.weight).toFixed(2)),
        }));
      }
    });
  },
}));