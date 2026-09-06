// Server-only. Never import from a *.functions.ts or route file that ships to
// the client bundle — this touches an RPC endpoint and an external price API.
//
// Resolves a wallet's "hold value" in USD for the placeholder $FISH-style
// token on the Robinhood chain, then maps that value to a row in
// fish_hold_tiers. This is the ONLY place on-chain state or GeckoTerminal
// pricing is read; Postgres functions never talk to the chain themselves —
// they take the resolved tier id as a parameter.
import { createPublicClient, http, formatUnits } from "viem";
import { robinhoodChain } from "./chains";

// Placeholder token (per approved plan, §0.2) — not the real $FISH, which
// hasn't launched yet. Swap this constant when the real token goes live.
const HOLD_TOKEN_ADDRESS = "0x39dBED3a2bd333467115dE45665cC57F813C4571" as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

let _client: ReturnType<typeof createPublicClient> | undefined;
function getClient() {
  if (!_client) {
    _client = createPublicClient({ chain: robinhoodChain, transport: http() });
  }
  return _client;
}

/** In-memory price cache — GeckoTerminal has real rate limits and the price
 * doesn't need sub-minute freshness for a hold-value gate. */
let _priceCache: { value: number; fetchedAt: number } | undefined;
const PRICE_CACHE_MS = 60_000;

async function fetchTokenPriceUsd(): Promise<number> {
  if (_priceCache && Date.now() - _priceCache.fetchedAt < PRICE_CACHE_MS) {
    return _priceCache.value;
  }

  const url = `https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/${HOLD_TOKEN_ADDRESS}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GeckoTerminal price lookup failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: { attributes?: { price_usd?: string | number | null } };
  };
  const raw = json.data?.attributes?.price_usd;
  const price = raw == null ? 0 : Number(raw);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("GeckoTerminal returned an invalid price");
  }

  _priceCache = { value: price, fetchedAt: Date.now() };
  return price;
}

async function fetchTokenBalance(walletAddress: string): Promise<number> {
  const client = getClient();
  const [rawBalance, decimals] = await Promise.all([
    client.readContract({
      address: HOLD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    }),
    client.readContract({
      address: HOLD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);
  return Number(formatUnits(rawBalance, decimals));
}

export interface HoldTier {
  id: string;
  min_usd_value: number;
  generation_cap_gold: number | null;
  wd_min: number | null;
  wd_max: number | null;
  wd_per_day: number;
}

export interface HoldStatus {
  usdValue: number;
  tier: HoldTier | null; // null = below the lowest tier, no NPC access at all
}

/** Reads the wallet's live token balance + price, and resolves it against
 * fish_hold_tiers (ordered highest-first so the first match wins). */
export async function resolveHoldStatus(walletAddress: string): Promise<HoldStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [balance, priceUsd, tiersRes] = await Promise.all([
    fetchTokenBalance(walletAddress),
    fetchTokenPriceUsd(),
    supabaseAdmin
      .from("fish_hold_tiers")
      .select("*")
      .order("sort_order", { ascending: false }),
  ]);

  if (tiersRes.error) throw new Error(tiersRes.error.message);
  const tiers = (tiersRes.data ?? []) as HoldTier[];

  const usdValue = balance * priceUsd;
  const tier = tiers.find((t) => usdValue >= t.min_usd_value) ?? null;

  return { usdValue, tier };
}