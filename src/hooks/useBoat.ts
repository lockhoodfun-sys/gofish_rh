import * as THREE from "three";

/**
 * Shared, mutable boat transform. Lives outside React (like `player`) so the
 * scene, the angler and the wake effect can all read it every frame without
 * re-rendering.
 */
export const BOAT_MOORING = new THREE.Vector3(22.6, 0, 73.2);

export const boat = {
  pos: BOAT_MOORING.clone(),
  yaw: 1.4,
  /** forward speed along the hull axis (units/s) */
  speed: 0,
  /** turn rate, used to bank the hull into the turn */
  turn: 0,
  /** true while the character is aboard (walking the deck or steering) */
  riding: false,
  /** true only while the character actually holds the helm */
  driving: false,
  /** true when the player stands close enough to press E */
  near: false,
  /** speed multiplier of the equipped hull (1 = wooden dinghy) */
  speedFactor: 1,
  /**
   * Walkable deck box in hull-local units (before BOAT_SCALE), measured from
   * the model bounding box once it loads.
   */
  deck: { halfX: 1.0, halfZ: 2.4, y: 0.02 },
  /** Character position on the deck, in hull-local units. */
  offset: new THREE.Vector3(0, 0.02, -0.9),
};

/** Return the hull to its fixed berth beside the boardwalk. */
export function returnBoatToMooring() {
  boat.pos.copy(BOAT_MOORING);
  boat.yaw = 1.4;
  boat.speed = 0;
  boat.turn = 0;
  boat.riding = false;
  boat.driving = false;
  boat.near = false;
  resetDeckOffset();
}

/** Seat position in hull-local space (character sits just behind the mast). */
export const BOAT_SEAT = new THREE.Vector3(0, 0.02, -0.9);

/** Uniform scale of the hull model so the dinghy reads bigger than the angler. */
export const BOAT_SCALE = 1.85;

/** Convert a hull-local offset into world space, written into `out`. */
export function boatLocalToWorld(local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const s = Math.sin(boat.yaw);
  const c = Math.cos(boat.yaw);
  const x = local.x * BOAT_SCALE;
  const z = local.z * BOAT_SCALE;
  return out.set(
    boat.pos.x + x * c + z * s,
    boat.pos.y + local.y * BOAT_SCALE,
    boat.pos.z - x * s + z * c,
  );
}

/** World position of the helm seat, written into `out`. */
export function boatSeatWorld(out: THREE.Vector3): THREE.Vector3 {
  return boatLocalToWorld(BOAT_SEAT, out);
}

/** World position of the character's current spot on the deck. */
export function boatDeckWorld(out: THREE.Vector3): THREE.Vector3 {
  return boatLocalToWorld(boat.offset, out);
}

/** Put the character back on the deck at the helm. */
export function resetDeckOffset() {
  boat.offset.set(BOAT_SEAT.x, boat.deck.y, BOAT_SEAT.z);
}

/**
 * Walk on the deck: a world-space step is converted into hull-local space and
 * clamped to the deck box, so the character moves with the hull instead of
 * sliding off it.
 */
export function moveOnDeck(dxWorld: number, dzWorld: number) {
  const s = Math.sin(boat.yaw);
  const c = Math.cos(boat.yaw);
  const lx = (dxWorld * c - dzWorld * s) / BOAT_SCALE;
  const lz = (dxWorld * s + dzWorld * c) / BOAT_SCALE;
  boat.offset.x = THREE.MathUtils.clamp(boat.offset.x + lx, -boat.deck.halfX, boat.deck.halfX);
  boat.offset.z = THREE.MathUtils.clamp(boat.offset.z + lz, -boat.deck.halfZ, boat.deck.halfZ);
  boat.offset.y = boat.deck.y;
}

/** True when the character stands close enough to the helm to take the wheel. */
export function nearHelm(): boolean {
  return Math.hypot(boat.offset.x - BOAT_SEAT.x, boat.offset.z - BOAT_SEAT.z) < 1.1;
}

// Dev aid: expose the live boat state for quick inspection in the console.
if (typeof window !== "undefined") {
  (window as unknown as { __boat?: typeof boat }).__boat = boat;
}
