import { useEffect } from "react";
import { toast } from "sonner";
import { Fish, Loader2, Sparkles } from "lucide-react";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useQuestStore } from "@/hooks/useQuestStore";

/** Always-on quest HUD docked top-right (Fisch-style tracker) — shows the
 * active quest's progress bar without requiring a click to open anything.
 * Clicking the title still opens QuestPanel for the full claim flow, but
 * the claim button is also available right here so most play sessions never
 * need the modal at all. */
export function QuestTracker() {
  const profile = useProfileStore((s) => s.profile);
  const proof = useProfileStore((s) => s.proof);
  const quest = useQuestStore((s) => s.quest);
  const loaded = useQuestStore((s) => s.loaded);
  const claiming = useQuestStore((s) => s.claiming);
  const refresh = useQuestStore((s) => s.refresh);
  const claim = useQuestStore((s) => s.claim);
  const setPanelOpen = useQuestStore((s) => s.setPanelOpen);

  useEffect(() => {
    if (proof) void refresh();
  }, [proof, refresh]);

  if (!profile) return null;
  // Nothing to render until the first load resolves — avoids a flash of an
  // empty/undefined card while `refresh()` is in flight.
  if (!loaded && !quest) return null;

  const allDone = loaded && quest?.status === "claimed" && quest.orderIndex === 10;
  const claimable = quest?.status === "completed_unclaimed";
  const percent = quest
    ? Math.min(100, (quest.progressValue / quest.requirement.qty) * 100)
    : 100;

  const onClaim = async () => {
    if (!quest) return;
    const wasLastQuest = quest.orderIndex === 10;
    const ok = await claim();
    if (ok) {
      toast.success(
        wasLastQuest
          ? `Claimed +${quest.rewardCoins.toLocaleString()} coins — that was the last quest!`
          : `Claimed +${quest.rewardCoins.toLocaleString()} coins. Next quest unlocked.`,
      );
    } else {
      toast.error(useQuestStore.getState().error ?? "Could not claim the reward.");
    }
  };

  return (
    <div className="pointer-events-auto mt-24 w-40 [text-shadow:0_2px_4px_rgba(0,0,0,0.95)]">
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="flex w-full items-center gap-1.5 text-left text-xs font-bold uppercase tracking-wide text-amber-300 drop-shadow-md hover:text-amber-200"
        title="Open quest details"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 drop-shadow-md" aria-hidden />
        {allDone ? "All quests complete!" : `Quest ${quest?.orderIndex}/10`}
      </button>

      {allDone ? (
        <p className="mt-1.5 text-xs font-semibold text-white">
          You've claimed every quest reward. Nice work, angler.
        </p>
      ) : quest ? (
        <>
          <p className="mt-1.5 text-sm font-bold leading-snug text-white">
            {quest.title}
          </p>

          <div className="relative mt-2.5">
            <div className="h-3 overflow-hidden rounded-full bg-slate-950/70 ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 via-sky-400 to-cyan-300 shadow-[0_0_10px_3px_rgba(56,189,248,0.7)] transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 flex h-5 w-5 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full bg-sky-400 ring-2 ring-white/50 shadow-[0_0_10px_4px_rgba(56,189,248,0.9)] transition-[left] duration-500"
              style={{ left: `${percent}%` }}
            >
              <Fish className="h-3 w-3 text-slate-900" aria-hidden />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-bold tabular-nums text-white">
            <span>
              {Math.min(quest.progressValue, quest.requirement.qty)} / {quest.requirement.qty}
            </span>
            <span className="font-bold text-amber-300">
              +{quest.rewardCoins.toLocaleString()}
            </span>
          </div>

          {claimable && (
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/90 px-2 py-1.5 text-xs font-semibold text-slate-900 shadow-md transition-colors hover:bg-emerald-400 disabled:opacity-60 [text-shadow:none]"
            >
              {claiming && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Claim reward
            </button>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-xs font-semibold text-white">No quest data available right now.</p>
      )}
    </div>
  );
}