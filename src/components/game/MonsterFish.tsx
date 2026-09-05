import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { SEA_CX, SEA_CZ } from "./worldConfig";
import { isOverLand } from "@/lib/worldPhysics";
import { waterHeight } from "./Ocean";

/** GLB model used for the giant monster (Ancient Leviathan). */
const MONSTER_URL = "/models/fish_mythic_3.glb";
/** Body length in world units at scale = 1. */
const MONSTER_LENGTH = 4;

function MonsterModel({ scale, wagSpeed }: { scale: number; wagSpeed: number }) {
  const { scene } = useGLTF(MONSTER_URL, "/draco/");
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(root);
    const dim = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    const longest = Math.max(dim.x, dim.y, dim.z) || 1;
    const wrap = new THREE.Group();
    wrap.add(root);
    if (dim.z > dim.x && dim.z >= dim.y) wrap.rotation.y = Math.PI / 2;
    wrap.scale.setScalar(MONSTER_LENGTH / longest);
    const holder = new THREE.Group();
    holder.add(wrap);
    return holder;
  }, [scene]);

  const swim = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (swim.current) {
      swim.current.rotation.z = Math.sin(t * wagSpeed) * 0.16;
      swim.current.rotation.y = Math.sin(t * wagSpeed * 0.7) * 0.12;
    }
  });

  return (
    <group ref={swim} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

/** Sea monster rendered from the mythic GLB (no procedural geometry). */
export function MonsterFishMesh({
  scale = 1,
  wagSpeed = 1.6,
}: {
  scale?: number;
  wagSpeed?: number;
}) {
  return (
    <Suspense fallback={null}>
      <MonsterModel scale={scale} wagSpeed={wagSpeed} />
    </Suspense>
  );
}

useGLTF.preload(MONSTER_URL, "/draco/");

/** Monster berpatroli jauh dari pulau, sesekali melompat dramatis. */
export function MonsterSwimmer({
  radius = 40,
  speed = 0.07,
  phase = 0.8,
  scale = 9,
  leapEvery = 22,
}: {
  radius?: number;
  speed?: number;
  phase?: number;
  scale?: number;
  leapEvery?: number;
}) {
  const g = useRef<THREE.Group>(null);
  const leapRef = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const a = phase + t * speed;
    const x = SEA_CX + Math.cos(a) * radius;
    const z = SEA_CZ + Math.sin(a) * radius;
    const surface = waterHeight(x, z, t);

    const cycle = (t + phase * 5) % leapEvery;
    const dur = 3.2;
    const leaping = cycle < dur;
    const k = leaping ? cycle / dur : 0;
    const arc = leaping ? Math.sin(k * Math.PI) * scale * 1.5 : 0;
    leapRef.current = leaping ? Math.sin(k * Math.PI) : 0;

    if (!g.current) return;
    // Never let a fish surface over the island — hide it while the ring
    // passes over land (2 unit pad keeps it clear of the shoreline).
    const overLand = isOverLand(x, z);
    g.current.visible = leaping && !overLand;
    g.current.position.set(x, surface - scale * 0.8 + arc, z);
    g.current.rotation.y = -a + Math.PI;
    g.current.rotation.z = leaping ? Math.cos(k * Math.PI) * 0.75 : 0;
  });

  return (
    <group ref={g} visible={false}>
      <MonsterFishMesh scale={scale} wagSpeed={1.2} />
    </group>
  );
}
