export interface BoatLook {
  id: string;
  /** GLB url. */
  url: string;
  /** Target hull length in local units before BOAT_SCALE. */
  targetLength: number;
}

export const DEFAULT_BOAT_ID = "wooden_dinghy";

export const BOAT_LOOKS: Record<string, BoatLook> = {
  wooden_dinghy: { id: "wooden_dinghy", url: "/models/boat-starter.glb", targetLength: 7.4 },
  minnow: { id: "minnow", url: "/models/boat-minnow.glb", targetLength: 8.2 },
  reef_runner: { id: "reef_runner", url: "/models/boat-reef-runner.glb", targetLength: 8.8 },
  bow_raider: { id: "bow_raider", url: "/models/boat-bow-raider.glb", targetLength: 9.6 },
  sea_marshal: { id: "sea_marshal", url: "/models/boat-sea-marshal.glb", targetLength: 10.4 },
  vex_yacht: { id: "vex_yacht", url: "/models/boat-vex-yacht.glb", targetLength: 12.5 },
};

export function boatLook(id: string | null | undefined): BoatLook {
  return BOAT_LOOKS[id ?? ""] ?? BOAT_LOOKS[DEFAULT_BOAT_ID]!;
}
