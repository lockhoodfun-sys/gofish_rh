import { useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useLeaderboardStore } from "@/hooks/useLeaderboardStore";
import type { LeaderboardEntry, LeaderboardSort } from "@/lib/leaderboard.functions";
import { resolveAvatarUrl } from "@/lib/avatarUrl";

function statFor(entry: LeaderboardEntry, sortBy: LeaderboardSort) {
  if (sortBy === "coins") return `${Math.round(entry.coins).toLocaleString()} coins`;
  if (sortBy === "fish") return `${entry.total_fish.toLocaleString()} fish`;
  return `Lv. ${entry.level} · ${entry.xp.toLocaleString()} XP`;
}

function rankTone(rank: number) {
  if (rank === 1) return "text-amber-300";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-orange-400";
  return "text-slate-400";
}

function Row({
  entry,
  sortBy,
  highlight,
  avatarUrl,
}: {
  entry: LeaderboardEntry;
  sortBy: LeaderboardSort;
  highlight: boolean;
  avatarUrl: string | null | undefined;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
        highlight ? "bg-sky-500/15 ring-1 ring-sky-400/40" : "hover:bg-white/5"
      }`}
    >
      <span
        className={`w-6 shrink-0 text-center text-sm font-bold tabular-nums ${rankTone(entry.rank)}`}
      >
        {entry.rank}
      </span>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs">
          {(entry.display_name || entry.username).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-50">
          {entry.display_name || entry.username}
        </p>
        <p className="truncate text-xs text-slate-400">@{entry.username}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-slate-200">
        {statFor(entry, sortBy)}
      </span>
    </div>
  );
}

export function LeaderboardPanel() {
  const proof = useProfileStore((s) => s.proof);
  const walletAddress = useProfileStore((s) => s.address);
  const panelOpen = useLeaderboardStore((s) => s.panelOpen);
  const setPanelOpen = useLeaderboardStore((s) => s.setPanelOpen);
  const sortBy = useLeaderboardStore((s) => s.sortBy);
  const setSortBy = useLeaderboardStore((s) => s.setSortBy);
  const entries = useLeaderboardStore((s) => s.entries);
  const me = useLeaderboardStore((s) => s.me);
  const loading = useLeaderboardStore((s) => s.loading);
  const error = useLeaderboardStore((s) => s.error);
  const refresh = useLeaderboardStore((s) => s.refresh);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (panelOpen && proof) void refresh();
  }, [panelOpen, proof, refresh]);

  useEffect(() => {
    let cancelled = false;
    const paths = new Map<string, string>();
    for (const e of entries) {
      if (e.avatar_url) paths.set(e.wallet_address, e.avatar_url);
    }
    if (me?.avatar_url) paths.set(me.wallet_address, me.avatar_url);
    void Promise.all(
      [...paths.entries()].map(async ([wallet, path]) => {
        const url = await resolveAvatarUrl(path);
        if (!cancelled) setAvatars((prev) => ({ ...prev, [wallet]: url }));
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [entries, me]);

  const meInTop = !!me && entries.some((e) => e.wallet_address === me.wallet_address);

  return (
    <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
            Leaderboard
          </DialogTitle>
          <DialogDescription>
            See how you rank against every angler on Koleo Island.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as LeaderboardSort)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="xp">Level</TabsTrigger>
            <TabsTrigger value="coins">Coins</TabsTrigger>
            <TabsTrigger value="fish">Fish</TabsTrigger>
          </TabsList>
        </Tabs>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : (
          <ScrollArea className="h-80 pr-2">
            <div className="space-y-1">
              {entries.map((entry) => (
                <Row
                  key={entry.wallet_address}
                  entry={entry}
                  sortBy={sortBy}
                  highlight={entry.wallet_address === walletAddress}
                  avatarUrl={avatars[entry.wallet_address]}
                />
              ))}
              {entries.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">No anglers ranked yet.</p>
              )}
            </div>
          </ScrollArea>
        )}

        {me && !meInTop && (
          <div className="border-t border-white/10 pt-2">
            <Row entry={me} sortBy={sortBy} highlight avatarUrl={avatars[me.wallet_address]} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
