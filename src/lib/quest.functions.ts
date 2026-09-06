import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rpc } from "./rpc";
import type { Tables } from "@/integrations/supabase/types";

const proofSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  issuedAt: z.string(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

type Profile = Tables<"profiles">;

export interface QuestProgressView {
  questId: string;
  orderIndex: number;
  title: string;
  description: string;
  requirement: { type: string; rarity: string; qty: number };
  rewardCoins: number;
  progressValue: number;
  status: "active" | "completed_unclaimed" | "claimed";
}

/** The caller's single active quest slot (auto-creates progress row on
 * first call). Quests are unrelated to level — pure natural-progress bonus. */
export const getQuestProgress = createServerFn({ method: "POST" })
  .validator((input: unknown) => proofSchema.parse(input))
  .handler(async ({ data }): Promise<QuestProgressView | null> => {
    const { verifyWalletProof } = await import("./walletProof.server");
    const wallet = await verifyWalletProof(data);

    const res = await rpc<
      Array<{
        quest_id: string;
        order_index: number;
        title: string;
        description: string;
        requirement: { type: string; rarity: string; qty: number };
        reward_coins: number;
        progress_value: number;
        status: string;
      }>
    >("get_quest_progress", { _wallet: wallet });
    if (res.error) throw new Error(res.error.message);
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!row) return null; // all 10 quests already claimed

    return {
      questId: row.quest_id,
      orderIndex: row.order_index,
      title: row.title,
      description: row.description,
      requirement: row.requirement,
      rewardCoins: Number(row.reward_coins),
      progressValue: Number(row.progress_value),
      status: row.status as QuestProgressView["status"],
    };
  });

/** Claims the active quest's coin reward (fails server-side if the
 * requirement isn't met yet) and advances to the next quest. */
export const claimQuestReward = createServerFn({ method: "POST" })
  .validator((input: unknown) => proofSchema.parse(input))
  .handler(async ({ data }): Promise<Profile> => {
    const { verifyWalletProof } = await import("./walletProof.server");
    const wallet = await verifyWalletProof(data);

    const res = await rpc<Profile>("claim_quest_reward", { _wallet: wallet });
    if (res.error) throw new Error(res.error.message);
    return res.data as Profile;
  });