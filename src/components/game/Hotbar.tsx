import { useEffect } from "react";
import { Backpack, Coins, Loader2 } from "lucide-react";
import { useGameStore } from "@/hooks/useGameStore";
import { useInventoryStore } from "@/hooks/useInventoryStore";
import { useProfileStore } from "@/hooks/useProfileStore";
import { getFishData, mutationFor, priceFor, rodOrDefault } from "@/lib/fishRules";
import { useRodStore } from "@/hooks/useRodStore";
import { useBaitStore } from "@/hooks/useBaitStore";
import { useBoatStore } from "@/hooks/useBoatStore";
import { baitOrDefault } from "@/lib/fishRules";
import type { Rarity } from "@/lib/fishRules";
import { useFishThumbnail } from "@/hooks/useFishThumbnail";

function speciesInfo(id: string) {
  const s = getFishData().species.find((sp) => sp.id === id);
  return {
    name: s?.name ?? id,
    color: s?.color ?? "#93c5fd",
    rarity: (s?.rarity ?? "common") as Rarity,
  };
}

/**
 * Roblox-style bottom-center hotbar.
 * Slot 1 = fishing rod (click / press 1 to equip or stow on the back).
 * Slot 2 = bag (click / press 2 to open the caught-fish list).
 * The bag list is the server-side bucket — the same one Marlo sells from.
 */
export function Hotbar() {
  const rodStowed = useGameStore((s) => s.rodStowed);
  const bagOpen = useGameStore((s) => s.bagOpen);
  const phase = useGameStore((s) => s.phase);
  const items = useInventoryStore((s) => s.items);
  const loading = useInventoryStore((s) => s.loading);
  const refresh = useInventoryStore((s) => s.refresh);
  const proof = useProfileStore((s) => s.proof);
  const equippedId = useRodStore((s) => s.equippedId);
  const refreshRods = useRodStore((s) => s.refresh);
  const equippedBaitId = useBaitStore((s) => s.equippedId);
  const refreshBaits = useBaitStore((s) => s.refresh);
  const refreshBoats = useBoatStore((s) => s.refresh);
  const rod = rodOrDefault(equippedId);
  const bait = baitOrDefault(equippedBaitId);

  const toggleRod = () => {
    const st = useGameStore.getState();
    if (st.phase !== "idle") return;
    const next = !st.rodStowed;
    st.setRodStowed(next);
    st.setMessage(
      next
        ? "Rod stowed on your back. Click slot 1 to equip it again."
        : "Rod equipped. ENTER / left click to cast.",
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Digit1") toggleRod();
      if (e.code === "Digit2") useGameStore.getState().toggleBag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the bag in sync: on sign-in and every time it is opened.
  useEffect(() => {
    if (!proof) return;
    void refresh();
    void refreshRods();
    void refreshBaits();
    void refreshBoats();
  }, [proof, refresh, refreshRods, refreshBaits, refreshBoats]);

  useEffect(() => {
    if (!bagOpen || !proof) return;
    void refresh();
  }, [bagOpen, proof, refresh]);

  const totalKg = items.reduce((a, b) => a + b.weight_kg, 0);
  const totalValue = items.reduce(
    (a, b) => a + priceFor(b.species_id, b.weight_kg, b.mutation_key),
    0,
  );

  return (
    <>
      {bagOpen && (
        <div className="pointer-events-auto absolute bottom-32 left-1/2 z-30 w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border border-white/25 bg-slate-900/85 p-4 text-slate-50 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-base font-bold tracking-tight">Bag</p>
            <p className="flex items-center gap-2 text-xs text-slate-300">
              <span>{items.length} item · {totalKg.toFixed(2)} kg</span>
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200">
                <Coins size={12} />
                {totalValue.toLocaleString()}
              </span>
            </p>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {!proof && (
              <p className="py-6 text-center text-xs text-slate-400">
                Connect your wallet to see your catch.
              </p>
            )}
            {proof && loading && items.length === 0 && (
              <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your catch…
              </p>
            )}
            {proof && !loading && items.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                Bag is empty. Catch some fish!
              </p>
            )}
            {items.map((item) => {
              const info = speciesInfo(item.species_id);
              const mutation = mutationFor(item.mutation_key);
              const value = priceFor(item.species_id, item.weight_kg, item.mutation_key);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950/40"
                    style={{ color: info.color }}
                  >
                    <FishThumbnail color={info.color} rarity={info.rarity} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">
                      {mutation && mutation.key !== "none" ? (
                        <>
                          <span className="text-slate-300">{mutation.label}</span> {info.name}
                        </>
                      ) : (
                        info.name
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">{item.weight_kg.toFixed(2)} kg</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="flex items-center gap-1 text-sm font-bold text-amber-200">
                      <Coins size={13} />
                      {value.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      <div className="pointer-events-none absolute bottom-[104px] left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-slate-900/65 px-3 py-1 text-[11px] font-semibold text-slate-200 shadow-lg backdrop-blur-md">
        <span className="text-amber-200">{rod.name}</span>
        <span className="ml-2 text-slate-400">
          Luck {rod.luck_percent}% · Speed {rod.speed_percent}% · Max{" "}
          {rod.max_catch_weight_kg.toLocaleString()} kg
        </span>
        <span className="ml-2 border-l border-white/15 pl-2 text-emerald-300">
          {bait.name} · Luck {bait.luck_percent}%
        </span>
      </div>

      <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-2xl border border-white/20 bg-slate-900/55 p-2 shadow-2xl backdrop-blur-md">
        <HotSlot
          index={1}
          label={rod.name.replace(/ Rod$/, "")}
          active={!rodStowed}
          disabled={phase !== "idle"}
          onClick={toggleRod}
        >
          <div className="h-8 w-1 rotate-[35deg] rounded-full bg-gradient-to-b from-amber-200 to-amber-700" />
        </HotSlot>
        <HotSlot
          index={2}
          label="Bag"
          active={bagOpen}
          badge={items.length || undefined}
          onClick={() => useGameStore.getState().toggleBag()}
        >
          <Backpack size={26} className="text-amber-200" />
        </HotSlot>
      </div>
    </>
  );
}

function HotSlot({
  index,
  label,
  active,
  disabled,
  badge,
  onClick,
  children,
}: {
  index: number;
  label: string;
  active?: boolean | undefined;
  disabled?: boolean | undefined;
  badge?: number | undefined;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-[74px] w-[74px] flex-col items-center justify-center gap-1 rounded-xl border-2 transition ${
        active
          ? "border-amber-300 bg-amber-400/15 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
          : "border-white/25 bg-slate-950/50 hover:border-white/50"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="absolute left-1.5 top-1 text-[11px] font-bold text-white/70">{index}</span>
      {badge !== undefined && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
      <span className="flex h-8 items-center justify-center">{children}</span>
      <span className="text-[11px] font-bold text-slate-100">{label}</span>
    </button>
  );
}

/** Bag icon: the real GLB model, falling back to the stylised fish while it renders. */
function FishThumbnail({ color, rarity }: { color: string; rarity: Rarity }) {
  const src = useFishThumbnail(rarity);
  if (src) {
    return <img src={src} alt="" className="h-10 w-10 object-contain" loading="lazy" />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 animate-fish-swim"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M2 12c2.5-3 6.5-4 10-4s7.5 1 10 4c-2.5 3-6.5 4-10 4S4.5 15 2 12z"
        fill={color}
        opacity="0.92"
      />
      <path d="M22 12c-2-1.5-4.5-2.5-7-3" />
      <circle cx="6.5" cy="11" r="1" fill="#12161c" stroke="none" />
      <path d="M2 12l-1-2v4l1-2z" fill={color} />
    </svg>
  );
}
