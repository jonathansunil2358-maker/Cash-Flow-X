import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

/**
 * Low-poly building kit. Every part sits on the ground at its (x, z) with y = height of its base.
 * The camera looks from +x/+z, so doors, windows and signs go on those faces.
 */

export type V3 = [number, number, number];

export const C = {
  ink: '#4a2c17', white: '#fff8ec', cream: '#fff3dc', sand: '#f3dfbb', glass: '#8fd3ff', glassDark: '#5bb8f5', wood: '#9c5a2b',
  woodDark: '#7a4420', grey: '#c9c4b8', steel: '#9aa0a6', dark: '#3d3a45', blue: '#1f78d1', red: '#d93a2f', green: '#2f9420',
  grass: '#7ccf52', yellow: '#ffc633', orange: '#ff8a1f', purple: '#8e3fe6', pink: '#ff6fae', teal: '#22b8c7', skin: '#ffcf9e',
};

export function Mat({ c, r = 0.75, m = 0, e, o }: { c: string; r?: number; m?: number; e?: string; o?: number }) {
  return <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000000'} emissiveIntensity={e ? 0.6 : 0} transparent={o !== undefined} opacity={o ?? 1} />;
}

/** Rounded box sitting on y (bottom-aligned). */
export function Blk({ w, h, d, x = 0, y = 0, z = 0, c, rad = 0.06, ry = 0, o, e, m }: {
  w: number; h: number; d: number; x?: number; y?: number; z?: number; c: string; rad?: number; ry?: number; o?: number; e?: string; m?: number;
}) {
  return (
    <RoundedBox args={[w, h, d]} radius={Math.max(0.001, Math.min(rad, Math.min(w, h, d) / 2 - 0.001))} smoothness={2}
      position={[x, y + h / 2, z]} rotation={[0, ry, 0]} castShadow receiveShadow>
      <Mat c={c} o={o} e={e} m={m} />
    </RoundedBox>
  );
}

export function Cyl({ r, h, x = 0, y = 0, z = 0, c, rt, seg = 14, rx = 0, rz = 0, e, m }: {
  r: number; h: number; x?: number; y?: number; z?: number; c: string; rt?: number; seg?: number; rx?: number; rz?: number; e?: string; m?: number;
}) {
  return (
    <mesh position={[x, y + (rx || rz ? 0 : h / 2), z]} rotation={[rx, 0, rz]} castShadow receiveShadow>
      <cylinderGeometry args={[rt ?? r, r, h, seg]} />
      <Mat c={c} e={e} m={m} />
    </mesh>
  );
}

export function Ball({ r, x = 0, y = 0, z = 0, c, e, o, ns }: { r: number; x?: number; y?: number; z?: number; c: string; e?: string; o?: number; ns?: boolean }) {
  return (
    <mesh position={[x, y, z]} castShadow={!ns}>
      <sphereGeometry args={[r, 14, 10]} />
      <Mat c={c} e={e} o={o} />
    </mesh>
  );
}

/** Gable (pitched) roof along x: a triangular prism of width w (x), depth d (z), height h. */
export function Gable({ w, d, h, x = 0, y = 0, z = 0, c }: { w: number; d: number; h: number; x?: number; y?: number; z?: number; c: string }) {
  return (
    // A 3-sided cylinder lying along x, apex up: height 1.5r, base width √3·r, so r = h/1.5 and the
    // depth is stretched to d.
    <mesh position={[x, y + h / 3, z]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, d / (Math.sqrt(3) * (h / 1.5))]} castShadow>
      <cylinderGeometry args={[h / 1.5, h / 1.5, w, 3, 1, false, Math.PI / 2]} />
      <Mat c={c} />
    </mesh>
  );
}

/** A grid of windows on the +z face (front) and +x face (side) of a w×d box. */
export function Windows({ w, d, floors, y0 = 0.35, floorH = 0.75, cols = 3, sideCols = 2, c = C.glass, lit = false }: {
  w: number; d: number; floors: number; y0?: number; floorH?: number; cols?: number; sideCols?: number; c?: string; lit?: boolean;
}) {
  const out: ReactNode[] = [];
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * floorH;
    for (let i = 0; i < cols; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / cols;
      out.push(<Blk key={`f${f}-${i}`} w={(w / cols) * 0.55} h={floorH * 0.5} d={0.05} x={x} y={y} z={d / 2 + 0.01} c={c} rad={0.03} e={lit ? '#fff2a8' : undefined} />);
    }
    for (let i = 0; i < sideCols; i++) {
      const z = -d / 2 + ((i + 0.5) * d) / sideCols;
      out.push(<Blk key={`s${f}-${i}`} w={0.05} h={floorH * 0.5} d={(d / sideCols) * 0.55} x={w / 2 + 0.01} y={y} z={z} c={c} rad={0.03} e={lit ? '#fff2a8' : undefined} />);
    }
  }
  return <>{out}</>;
}

/** Striped awning over a shop front on the +z face. */
export function Awning({ w, y, z, a = C.red, b = C.white, stripes = 6 }: { w: number; y: number; z: number; a?: string; b?: string; stripes?: number }) {
  return (
    <group position={[0, y, z]} rotation={[0.45, 0, 0]}>
      {Array.from({ length: stripes }, (_, i) => (
        <Blk key={i} w={w / stripes} h={0.06} d={0.55} x={-w / 2 + (i + 0.5) * (w / stripes)} y={0} z={0.25} c={i % 2 ? b : a} rad={0.02} />
      ))}
    </group>
  );
}

/** Roll-up garage door on the +z face. */
export function RollDoor({ w, h, x = 0, z, c = C.grey }: { w: number; h: number; x?: number; z: number; c?: string }) {
  return (
    <group>
      <Blk w={w} h={h} d={0.06} x={x} y={0} z={z} c={c} rad={0.02} />
      {Array.from({ length: 4 }, (_, i) => <Blk key={i} w={w * 0.96} h={0.03} d={0.07} x={x} y={(h * (i + 1)) / 5} z={z + 0.01} c={C.steel} rad={0.01} />)}
    </group>
  );
}

export function Car({ x = 0, y = 0, z = 0, c = C.red, ry = 0, s = 1 }: { x?: number; y?: number; z?: number; c?: string; ry?: number; s?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]} scale={s}>
      <Blk w={0.95} h={0.26} d={0.48} y={0.1} c={c} rad={0.1} />
      <Blk w={0.52} h={0.2} d={0.42} x={-0.05} y={0.34} c={C.glass} rad={0.08} />
      {[[-0.3, 0.24], [0.3, 0.24], [-0.3, -0.24], [0.3, -0.24]].map(([a, b], i) => <Cyl key={i} r={0.1} h={0.08} x={a} y={0.1} z={b} rx={Math.PI / 2} c={C.dark} />)}
    </group>
  );
}

export function Container({ x = 0, y = 0, z = 0, c = C.blue, ry = 0 }: { x?: number; y?: number; z?: number; c?: string; ry?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <Blk w={1.1} h={0.45} d={0.45} c={c} rad={0.03} />
      {[-0.35, -0.12, 0.12, 0.35].map((a) => <Blk key={a} w={0.04} h={0.4} d={0.47} x={a} y={0.025} c={C.ink} rad={0.01} />)}
    </group>
  );
}

export function Crate({ x = 0, y = 0, z = 0, s = 0.32, c = '#d8a15d' }: { x?: number; y?: number; z?: number; s?: number; c?: string }) {
  return <Blk w={s} h={s} d={s} x={x} y={y} z={z} c={c} rad={0.03} />;
}

export function Tree({ x, z, c = '#4e9e2f', s = 1 }: { x: number; z: number; c?: string; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <Cyl r={0.12} rt={0.09} h={0.55} c={C.wood} seg={6} />
      <mesh position={[0, 0.95, 0]} castShadow><icosahedronGeometry args={[0.55, 1]} /><Mat c={c} /></mesh>
    </group>
  );
}

export function Bush({ x, z, c = '#4e9e2f' }: { x: number; z: number; c?: string }) {
  return <mesh position={[x, 0.2, z]} castShadow><icosahedronGeometry args={[0.28, 0]} /><Mat c={c} /></mesh>;
}

export function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cyl r={0.04} h={0.9} c={C.dark} seg={6} />
      <Ball r={0.1} y={0.95} c="#fff2a8" e="#ffd76a" />
    </group>
  );
}

/** Table with a parasol. */
export function Parasol({ x, z, c = C.red }: { x: number; z: number; c?: string }) {
  return (
    <group position={[x, 0, z]}>
      <Cyl r={0.22} h={0.05} y={0.32} c={C.white} />
      <Cyl r={0.03} h={0.9} c={C.dark} seg={6} />
      <Cyl r={0.42} rt={0.02} h={0.22} y={0.85} c={c} seg={8} />
    </group>
  );
}

export function Flag({ x, z, h = 1.1, c = C.red, y = 0 }: { x: number; z: number; h?: number; c?: string; y?: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 3 + x) * 0.25;
  });
  return (
    <group position={[x, y, z]}>
      <Cyl r={0.03} h={h} c={C.dark} seg={6} />
      <mesh ref={ref} position={[0.2, h - 0.15, 0]}><boxGeometry args={[0.38, 0.22, 0.02]} /><Mat c={c} /></mesh>
    </group>
  );
}

/** Puffs of smoke rising from a chimney. */
export function Smoke({ x, y, z }: { x: number; y: number; z: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    ref.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      m.position.set(Math.sin(t * 4 + i) * 0.1, t * 1.2, 0);
      m.scale.setScalar(0.1 + t * 0.25);
      ((m as Mesh).material as MeshStandardMaterial).opacity = 0.8 * (1 - t);
    });
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      {[0, 1, 2].map((i) => <mesh key={i}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#f5f5f5" transparent opacity={0.6} /></mesh>)}
    </group>
  );
}

/** Spins its children about y. */
export function Spin({ speed = 1, children, x = 0, y = 0, z = 0 }: { speed?: number; children: ReactNode; x?: number; y?: number; z?: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref} position={[x, y, z]}>{children}</group>;
}

/** Bobs its children up and down. */
export function Bob({ amp = 0.08, speed = 1.5, children, x = 0, y = 0, z = 0 }: { amp?: number; speed?: number; children: ReactNode; x?: number; y?: number; z?: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.elapsedTime * speed + x) * amp;
  });
  return <group ref={ref} position={[x, y, z]}>{children}</group>;
}

/** A blinking light (antenna tips, alarms). */
export function Blink({ x, y, z, c = C.red }: { x: number; y: number; z: number; c?: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.visible = Math.sin(clock.elapsedTime * 4 + x) > -0.2;
  });
  return <mesh ref={ref} position={[x, y, z]}><sphereGeometry args={[0.07, 8, 6]} /><Mat c={c} e={c} /></mesh>;
}

/** Round sign board facing +z with a coloured face and a ring. */
export function Disc({ x = 0, y, z, r = 0.3, c, ring = C.cream }: { x?: number; y: number; z: number; r?: number; c: string; ring?: string }) {
  return (
    <group position={[x, y, z]}>
      <Cyl r={r} h={0.06} rx={Math.PI / 2} c={ring} />
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r * 0.75, r * 0.75, 0.04, 16]} /><Mat c={c} /></mesh>
    </group>
  );
}

export function Person({ x, z, c, y = 0 }: { x: number; z: number; c: string; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.28, 0]} castShadow><capsuleGeometry args={[0.12, 0.2, 4, 8]} /><Mat c={c} /></mesh>
      <Ball r={0.11} y={0.58} c={C.skin} />
    </group>
  );
}
