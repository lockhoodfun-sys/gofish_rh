import { useEffect, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { useInventoryStore } from "@/hooks/useInventoryStore";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useRodStore } from "@/hooks/useRodStore";
import { useBaitStore } from "@/hooks/useBaitStore";
import { useBoatStore } from "@/hooks/useBoatStore";
import { useFishThumbnail } from "@/hooks/useFishThumbnail";
import { useBoatThumbnail } from "@/hooks/useBoatThumbnail";
import { getFishData, mutationFor, priceFor } from "@/lib/fishRules";
import type { Rarity } from "@/lib/fishRules";
import { rodLook } from "@/lib/rodLooks";
import { baitLook } from "@/lib/baitLooks";
import { BOAT_LOOKS, DEFAULT_BOAT_ID } from "@/lib/boatModels";
import { RodIllustration } from "./RodShop";
import { BaitOrb } from "./BaitShop";
import { BoatIllustration } from "./BoatShop";

type BagTab = "fish" | "rod" | "bait" | "boat";

const TABS: { id: BagTab; label: string }[] = [
  { id: "fish", label: "Fish" },
  { id: "rod", label: "Rod" },
  { id: "bait", label: "Bait" },
  { id: "boat", label: "Boat" },
];

function speciesInfo(id: string) {
  const s = getFishData().species.find((sp) => sp.id === id);
  return {
    name: s?.name ?? id,
    color: s?.color ?? "#93c5fd",
    rarity: (s?.rarity ?? "common") as Rarity,
  };
}

/** Shared card chrome for a purchasable/equippable gear tile (rod/bait/boat). */
function GearCard({
  name,
  owned,
  equipped,
  priceCoins,
  busy,
  affordable,
  onBuy,
  onEquip,
  statLines,
  children,
}: {
  name: string;
  owned: boolean;
  equipped: boolean;
  priceCoins: number;
  busy: boolean;
  affordable: boolean;
  onBuy: () => void;
  onEquip: () => void;
  statLines: { label: string; value: string; className?: string }[];
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border-2 p-2.5 ${
        equipped
          ? "border-amber-300/80 bg-amber-300/10"
          : owned
            ? "border-white/25 bg-white/[0.05]"
            : "border-white/15 bg-white/[0.03]"
      }`}
    >
      <p className="text-center text-sm font-bold text-slate-100">{name}</p>
      {owned ? (
        <p className="text-center text-[11px] font-extrabold uppercase tracking-wide text-emerald-400">
          {equipped ? "In use" : "Owned"}
        </p>
      ) : (
        <p className="flex items-center justify-center gap-1 text-[12px] font-bold text-amber-300">
          <Coins className="h-3.5 w-3.5" aria-hidden />
          {priceCoins.toLocaleString()}
        </p>
      )}

      <div className="my-2 flex h-24 items-center justify-center rounded-lg bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.15),rgba(0,0,0,0.35)_70%)]">
        {children}
      </div>

      <div className="space-y-0.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-[11px] font-semibold leading-5 text-slate-200">
        {statLines.map((line) => (
          <p key={line.label}>
            {line.label}: <span className={line.className ?? "text-emerald-400"}>{line.value}</span>
          </p>
        ))}
      </div>

      {owned ? (
        <button
          type="button"
          disabled={busy || equipped}
          onClick={onEquip}
          className="mt-2 w-full rounded-lg bg-emerald-500 py-1.5 text-xs font-extrabold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
        >
          {equipped ? "Equipped" : busy ? "Switching…" : "Use"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || !affordable}
          onClick={onBuy}
          className="mt-2 w-full rounded-lg bg-emerald-500 py-1.5 text-xs font-extrabold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
        >
          {busy ? "Buying…" : affordable ? "Buy" : "Not enough coins"}
        </button>
      )}
    </div>
  );
}

function FishTab() {
  const items = useInventoryStore((s) => s.items);
  const loading = useInventoryStore((s) => s.loading);
  const proof = useProfileStore((s) => s.proof);
  const totalKg = items.reduce((a, b) => a + b.weight_kg, 0);
  const totalValue = items.reduce(
    (a, b) => a + priceFor(b.species_id, b.weight_kg, b.mutation_key),
    0,
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-300">
          {items.length} item · {totalKg.toFixed(2)} kg
        </p>
        <p className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
          <Coins size={12} />
          {totalValue.toLocaleString()}
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
          <p className="py-6 text-center text-xs text-slate-400">Bag is empty. Catch some fish!</p>
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
    </>
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

function RodTab() {
  const proof = useProfileStore((s) => s.proof);
  const coins = Math.round(Number(useProfileStore((s) => s.profile?.coins) ?? 0));
  const rods = useRodStore((s) => s.rods);
  const loading = useRodStore((s) => s.loading);
  const busyId = useRodStore((s) => s.busyId);
  const error = useRodStore((s) => s.error);
  const refresh = useRodStore((s) => s.refresh);
  const buy = useRodStore((s) => s.buy);
  const equip = useRodStore((s) => s.equip);

  useEffect(() => {
    if (proof) void refresh();
  }, [proof, refresh]);

  if (!proof) {
    return <p className="py-6 text-center text-xs text-slate-400">Connect your wallet to manage rods.</p>;
  }
  if (loading && rods.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading rods…
      </p>
    );
  }

  return (
    <div>
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {rods.map((rod) => {
          const look = rodLook(rod.rod_id);
          return (
            <GearCard
              key={rod.rod_id}
              name={rod.name}
              owned={rod.owned}
              equipped={rod.equipped}
              priceCoins={rod.price_coins}
              busy={busyId === rod.rod_id}
              affordable={coins >= rod.price_coins}
              onBuy={() => void buy(rod.rod_id)}
              onEquip={() => void equip(rod.rod_id)}
              statLines={[
                { label: "Luck", value: `${rod.luck_percent}%` },
                { label: "Speed", value: `${rod.speed_percent}%` },
                { label: "Max", value: `${rod.max_catch_weight_kg.toLocaleString()}kg`, className: "text-sky-400" },
              ]}
            >
              <RodIllustration rodId={rod.rod_id} glow={look.glow} />
            </GearCard>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function BaitTab() {
  const proof = useProfileStore((s) => s.proof);
  const coins = Math.round(Number(useProfileStore((s) => s.profile?.coins) ?? 0));
  const baits = useBaitStore((s) => s.baits);
  const loading = useBaitStore((s) => s.loading);
  const busyId = useBaitStore((s) => s.busyId);
  const error = useBaitStore((s) => s.error);
  const refresh = useBaitStore((s) => s.refresh);
  const buy = useBaitStore((s) => s.buy);
  const equip = useBaitStore((s) => s.equip);

  useEffect(() => {
    if (proof) void refresh();
  }, [proof, refresh]);

  if (!proof) {
    return <p className="py-6 text-center text-xs text-slate-400">Connect your wallet to manage bait.</p>;
  }
  if (loading && baits.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading bait…
      </p>
    );
  }

  return (
    <div>
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {baits.map((bait) => {
          void baitLook(bait.bait_id); // ensures a look exists for this tier (styling lives in BaitOrb itself)
          return (
            <GearCard
              key={bait.bait_id}
              name={bait.name}
              owned={bait.owned}
              equipped={bait.equipped}
              priceCoins={bait.price_coins}
              busy={busyId === bait.bait_id}
              affordable={coins >= bait.price_coins}
              onBuy={() => void buy(bait.bait_id)}
              onEquip={() => void equip(bait.bait_id)}
              statLines={[{ label: "Luck", value: `${bait.luck_percent}%` }]}
            >
              <div className="h-16 w-16">
                <BaitOrb baitId={bait.bait_id} />
              </div>
            </GearCard>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

/** Boat tile image: the real hull GLB, falling back to the 2D silhouette while it renders. */
function BoatThumb({ boatId, speedPercent }: { boatId: string; speedPercent: number }) {
  const url = (BOAT_LOOKS[boatId] ?? BOAT_LOOKS[DEFAULT_BOAT_ID])!.url;
  const src = useBoatThumbnail(boatId, url);
  if (src) {
    return <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />;
  }
  return <BoatIllustration speed={speedPercent} />;
}

function BoatTab() {
  const proof = useProfileStore((s) => s.proof);
  const coins = Math.round(Number(useProfileStore((s) => s.profile?.coins) ?? 0));
  const boats = useBoatStore((s) => s.boats);
  const loading = useBoatStore((s) => s.loading);
  const busyId = useBoatStore((s) => s.busyId);
  const error = useBoatStore((s) => s.error);
  const refresh = useBoatStore((s) => s.refresh);
  const buy = useBoatStore((s) => s.buy);
  const equip = useBoatStore((s) => s.equip);

  useEffect(() => {
    if (proof) void refresh();
  }, [proof, refresh]);

  if (!proof) {
    return <p className="py-6 text-center text-xs text-slate-400">Connect your wallet to manage boats.</p>;
  }
  if (loading && boats.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading boats…
      </p>
    );
  }

  return (
    <div>
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {boats.map((b) => (
          <GearCard
            key={b.boat_id}
            name={b.name}
            owned={b.owned}
            equipped={b.equipped}
            priceCoins={b.price_coins}
            busy={busyId === b.boat_id}
            affordable={coins >= b.price_coins}
            onBuy={() => void buy(b.boat_id)}
            onEquip={() => void equip(b.boat_id)}
            statLines={[{ label: "Speed", value: `${b.speed_percent}%` }]}
          >
            <BoatThumb boatId={b.boat_id} speedPercent={b.speed_percent} />
          </GearCard>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

/**
 * The bag, now a 4-tab inventory/loadout screen: caught fish, plus every
 * owned rod/bait/boat with buy + equip right here — no trip to the NPC
 * shops required to switch gear mid-session.
 */
export function BagPanel() {
  const [tab, setTab] = useState<BagTab>("fish");
  const items = useInventoryStore((s) => s.items);

  return (
    <div className="pointer-events-auto absolute bottom-32 left-1/2 z-30 w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-white/25 bg-slate-900/85 p-4 text-slate-50 shadow-2xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-base font-bold tracking-tight">Bag</p>
      </div>

      <div className="mb-3 flex gap-1 rounded-full border border-white/10 bg-black/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-colors ${
              tab === t.id
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            {t.label}
            {t.id === "fish" && items.length > 0 ? ` (${items.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "fish" && <FishTab />}
      {tab === "rod" && <RodTab />}
      {tab === "bait" && <BaitTab />}
      {tab === "boat" && <BoatTab />}
    </div>
  );
}