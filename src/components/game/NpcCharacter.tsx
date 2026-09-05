import { useMemo } from "react";
import * as THREE from "three";
import type { FaceKind, NpcOutfit } from "./npcs";

/** Roblox-like faces drawn on a transparent canvas texture. */
function makeFace(kind: FaceKind) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#1b1b1b";
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineCap = "round";

  const eye = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const shine = (cx: number, cy: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
  };

  if (kind === "smile") {
    eye(88, 100);
    eye(168, 100);
    shine(83, 92);
    shine(163, 92);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(128, 140, 46, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
  } else if (kind === "squint") {
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(68, 104);
    ctx.lineTo(110, 96);
    ctx.moveTo(146, 96);
    ctx.lineTo(188, 104);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(128, 136, 40, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
    // freckles
    ctx.beginPath();
    ctx.arc(78, 140, 4, 0, Math.PI * 2);
    ctx.arc(178, 140, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "stern") {
    eye(88, 106);
    eye(168, 106);
    // heavy brows
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(62, 70);
    ctx.lineTo(112, 84);
    ctx.moveTo(144, 84);
    ctx.lineTo(194, 70);
    ctx.stroke();
    // flat mouth
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(92, 168);
    ctx.lineTo(164, 168);
    ctx.stroke();
  } else {
    // wink
    eye(88, 100);
    shine(83, 92);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(168, 104, 22, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(120, 138, 44, 0.1 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function NpcCharacter({
  face,
  outfit,
}: {
  face: FaceKind;
  outfit: NpcOutfit;
}) {
  const faceTex = useMemo(() => makeFace(face), [face]);
  const { skin, shirt, pants, accent, hat, hatColor, extra } = outfit;

  return (
    <group>
      {/* legs */}
      <mesh position={[-0.14, 0.32, 0]} castShadow>
        <boxGeometry args={[0.22, 0.64, 0.24]} />
        <meshStandardMaterial color={pants} roughness={0.9} />
      </mesh>
      <mesh position={[0.14, 0.32, 0]} castShadow>
        <boxGeometry args={[0.22, 0.64, 0.24]} />
        <meshStandardMaterial color={pants} roughness={0.9} />
      </mesh>

      {/* torso */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[0.52, 0.6, 0.28]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>

      {/* clothing variations */}
      {extra === "apron" && (
        <>
          <mesh position={[0, 0.9, 0.155]} castShadow>
            <boxGeometry args={[0.42, 0.5, 0.04]} />
            <meshStandardMaterial color={accent} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.78, 0.185]}>
            <boxGeometry args={[0.26, 0.14, 0.02]} />
            <meshStandardMaterial color="#c9bfa6" roughness={0.95} />
          </mesh>
        </>
      )}
      {extra === "vest" && (
        <>
          <mesh position={[-0.2, 1.02, 0.15]}>
            <boxGeometry args={[0.12, 0.52, 0.04]} />
            <meshStandardMaterial color={accent} roughness={0.85} />
          </mesh>
          <mesh position={[0.2, 1.02, 0.15]}>
            <boxGeometry args={[0.12, 0.52, 0.04]} />
            <meshStandardMaterial color={accent} roughness={0.85} />
          </mesh>
        </>
      )}
      {extra === "belt" && (
        <>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[0.55, 0.1, 0.31]} />
            <meshStandardMaterial color={accent} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.72, 0.16]}>
            <boxGeometry args={[0.1, 0.09, 0.03]} />
            <meshStandardMaterial color="#d9c56a" metalness={0.5} roughness={0.4} />
          </mesh>
        </>
      )}
      {extra === "jacket" && (
        <>
          <mesh position={[-0.28, 0.98, 0]} castShadow>
            <boxGeometry args={[0.06, 0.62, 0.3]} />
            <meshStandardMaterial color={accent} roughness={0.8} />
          </mesh>
          <mesh position={[0.28, 0.98, 0]} castShadow>
            <boxGeometry args={[0.06, 0.62, 0.3]} />
            <meshStandardMaterial color={accent} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.22, 0.15]}>
            <boxGeometry args={[0.3, 0.1, 0.04]} />
            <meshStandardMaterial color={accent} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* arms */}
      <mesh position={[-0.36, 0.96, 0]} castShadow>
        <boxGeometry args={[0.18, 0.6, 0.22]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>
      <mesh position={[0.36, 0.96, 0]} castShadow>
        <boxGeometry args={[0.18, 0.6, 0.22]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>

      {/* head + face */}
      <mesh position={[0, 1.52, 0]} castShadow>
        <boxGeometry args={[0.42, 0.38, 0.38]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.53, 0.191]}>
        <planeGeometry args={[0.4, 0.36]} />
        <meshBasicMaterial map={faceTex} transparent />
      </mesh>

      {/* hats */}
      {hat === "straw" && (
        <>
          <mesh position={[0, 1.74, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.44, 0.05, 20]} />
            <meshStandardMaterial color={hatColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.83, 0]} castShadow>
            <cylinderGeometry args={[0.23, 0.26, 0.2, 20]} />
            <meshStandardMaterial color={hatColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.77, 0]}>
            <cylinderGeometry args={[0.265, 0.265, 0.05, 20]} />
            <meshStandardMaterial color="#8c5a3c" roughness={0.8} />
          </mesh>
        </>
      )}
      {hat === "beanie" && (
        <>
          <mesh position={[0, 1.76, 0]} castShadow>
            <boxGeometry args={[0.44, 0.2, 0.4]} />
            <meshStandardMaterial color={hatColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.68, 0]}>
            <boxGeometry args={[0.46, 0.08, 0.42]} />
            <meshStandardMaterial color="#f2ede4" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#f2ede4" roughness={0.9} />
          </mesh>
        </>
      )}
      {hat === "wide" && (
        <>
          <mesh position={[0, 1.73, 0]} castShadow>
            <boxGeometry args={[0.66, 0.05, 0.62]} />
            <meshStandardMaterial color={hatColor} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.83, 0]} castShadow>
            <boxGeometry args={[0.4, 0.2, 0.36]} />
            <meshStandardMaterial color={hatColor} roughness={0.85} />
          </mesh>
        </>
      )}
      {hat === "captain" && (
        <>
          <mesh position={[0, 1.74, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.16, 18]} />
            <meshStandardMaterial color={hatColor} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.83, 0]}>
            <cylinderGeometry args={[0.3, 0.28, 0.04, 18]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.68, 0.2]} castShadow>
            <boxGeometry args={[0.38, 0.04, 0.2]} />
            <meshStandardMaterial color="#0f1725" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.75, 0.28]}>
            <boxGeometry args={[0.12, 0.1, 0.02]} />
            <meshStandardMaterial color="#d9c56a" metalness={0.6} roughness={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}
