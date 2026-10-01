import { headcount, totalCustomers, UPGRADES, type GameState } from '@cfx/engine';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { Headquarters, UpgradeModel } from './buildings';
import { Ball, Blk, Bush, C, Lamp, Tree } from './parts';

/**
 * The player's business as a low-poly island in the sea. It reads the game state: the
 * headquarters grows with headcount, each sector upgrade stands as its own building that grows
 * with its level, and staff and customers walk the plot.
 */

/** Island top: a 12×12 grass square (−6…6), ringed by beach. The camera looks from +x/+z. */
const HALF = 6;
const HQ_POS: [number, number] = [-0.6, -0.8];
/** Upgrade plots, in the sector's upgrade order. None sit between the camera and the headquarters. */
const PLOTS: [number, number][] = [[-4.1, 1.0], [1.4, -4.2], [3.7, 1.4], [-3.4, 4.1], [-4.2, -4.0]];
const TREES: { p: [number, number]; c: string; plot?: number; s?: number }[] = [
  { p: [-4.1, 0.6], c: '#4e9e2f', plot: 0 }, { p: [-3.6, 1.6], c: '#7ccf52', plot: 0 }, { p: [1.0, -4.3], c: '#ff8a1f', plot: 1 },
  { p: [2.0, -4.0], c: '#4e9e2f', plot: 1 }, { p: [3.5, 1.0], c: '#8e3fe6', plot: 2 }, { p: [4.2, 1.9], c: '#4e9e2f', plot: 2 },
  { p: [-3.8, 3.8], c: '#ff8a1f', plot: 3 }, { p: [-2.9, 4.6], c: '#7ccf52', plot: 3 }, { p: [-4.4, -4.2], c: '#4e9e2f', plot: 4 },
  { p: [-3.7, -3.4], c: '#8e3fe6', plot: 4 }, { p: [4.9, -4.9], c: '#4e9e2f', s: 1.2 }, { p: [5.1, 4.6], c: '#ff8a1f', s: 0.9 },
  { p: [-5.1, 5.2], c: '#4e9e2f', s: 0.9 }, { p: [4.8, -2.2], c: '#7ccf52' }, { p: [2.6, 5.1], c: '#4e9e2f', s: 0.8 },
];

function Island({ night }: { night: boolean }) {
  return (
    <group>
      {/* rock and soil underneath, beach, then the grass top */}
      <Blk w={13.6} h={1.3} d={13.6} y={-1.7} c="#8a5a36" rad={0.5} />
      <Blk w={13.4} h={0.5} d={13.4} y={-0.62} c="#f3d99a" rad={0.35} />
      <Blk w={12.2} h={0.4} d={12.2} y={-0.4} c={night ? '#5aa33e' : '#7ccf52'} rad={0.3} />
      {/* checkerboard lawn */}
      {[-4.5, -1.5, 1.5, 4.5].flatMap((x, i) => [-4.5, -1.5, 1.5, 4.5].map((z, j) => ((i + j) % 2 === 0 ? (
        <mesh key={`${x}${z}`} position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.95, 2.95]} /><meshStandardMaterial color={night ? '#64b046' : '#8fdb63'} />
        </mesh>
      ) : null)))}
      {/* path from the front door to the jetty */}
      {[1.2, 1.9, 2.6, 3.3, 4.0, 4.7, 5.4].map((z, i) => (
        <mesh key={z} position={[HQ_POS[0] + (i % 2 ? 0.18 : -0.1), 0.02, z]} receiveShadow>
          <cylinderGeometry args={[0.3, 0.32, 0.05, 10]} /><meshStandardMaterial color="#e8dcc6" />
        </mesh>
      ))}
      <Blk w={0.9} h={0.12} d={1.6} x={HQ_POS[0]} y={-0.35} z={6.8} c={C.wood} rad={0.03} />
      {[0.35, -0.35].map((dx) => [6.2, 7.4].map((z) => <Blk key={`${dx}${z}`} w={0.12} h={0.9} d={0.12} x={HQ_POS[0] + dx} y={-1.0} z={z} c={C.woodDark} />))}
      <Lamp x={HQ_POS[0] + 0.7} z={2.4} />
      <Lamp x={HQ_POS[0] - 0.7} z={4.4} />
      {[[1.8, 5.3], [0.9, 3.0], [-2.1, 2.3], [4.9, -3.5], [5.0, 3.2], [-5.2, -2.0]].map(([x, z], i) => <Bush key={i} x={x} z={z} c={i % 2 ? '#ff9ec4' : '#4e9e2f'} />)}
      {/* rocks on the beach */}
      {[[6.35, -3], [-6.3, 2.2], [3.4, 6.35], [-2.5, -6.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.2, z]} castShadow><dodecahedronGeometry args={[0.28, 0]} /><meshStandardMaterial color="#b9b2a4" /></mesh>
      ))}
    </group>
  );
}

function Sea({ night }: { night: boolean }) {
  const foam = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (foam.current) foam.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.012);
    if (ring.current) {
      const u = (t * 0.25) % 1;
      ring.current.scale.setScalar(1 + u * 0.18);
      (ring.current.material as unknown as { opacity: number }).opacity = 0.45 * (1 - u);
    }
  });
  return (
    <group position={[0, -0.95, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={night ? '#1d3f7a' : '#4fb8ef'} />
      </mesh>
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.02, 0]}>
        <ringGeometry args={[9.6, 10.3, 4, 1]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.75} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.015, 0]}>
        <ringGeometry args={[10.4, 10.7, 4, 1]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

const PERSON_COLOURS = ['#1f78d1', '#d93a2f', '#2f9420', '#8e3fe6', '#ff8a1f', '#22b8c7'];

/** A capsule person following a path function of time. */
function Walker({ color, path, speed, offset }: { color: string; path: (t: number) => [number, number]; speed: number; offset: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + offset;
    const [x, z] = path(t);
    const [nx, nz] = path(t + 0.01);
    ref.current.position.set(x, Math.abs(Math.sin(t * 18)) * 0.06, z);
    ref.current.rotation.y = Math.atan2(nx - x, nz - z);
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.28, 0]} castShadow><capsuleGeometry args={[0.13, 0.22, 4, 8]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.6, 0]} castShadow><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#ffcf9e" /></mesh>
    </group>
  );
}

function Cloud({ x, z, y = 7, speed }: { x: number; z: number; y?: number; speed: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = ((x + clock.elapsedTime * speed + 20) % 40) - 20;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <Ball r={0.8} c="#ffffff" o={0.92} ns />
      <Ball r={0.6} x={0.85} y={-0.15} z={0.1} c="#ffffff" o={0.92} ns />
      <Ball r={0.55} x={-0.8} y={-0.2} c="#ffffff" o={0.92} ns />
    </group>
  );
}

function Boat({ night }: { night: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.12;
    ref.current.position.set(Math.cos(t) * 10.5, -0.9 + Math.sin(clock.elapsedTime * 1.6) * 0.04, Math.sin(t) * 10.5);
    ref.current.rotation.y = -t;
  });
  return (
    <group ref={ref}>
      <Blk w={0.5} h={0.22} d={1.1} c={night ? '#dcd6cc' : C.white} rad={0.1} />
      <Blk w={0.04} h={0.8} d={0.04} y={0.2} c={C.woodDark} />
      <mesh position={[0, 0.65, 0.15]} rotation={[0, Math.PI / 2, 0]}><coneGeometry args={[0.28, 0.6, 3]} /><meshStandardMaterial color={C.red} /></mesh>
    </group>
  );
}

/** Pill label: first word, or first two when the first is possessive ("Chef's table"). */
function shortName(name: string) {
  const w = name.split(' ');
  return w[0].endsWith("'s") && w[1] ? `${w[0]} ${w[1]}` : w[0];
}

/** Fill the frame with the island whatever the canvas size; aim a little above the lawn so it sits below the HUD. */
function Zoom() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(14, 14.4, 14);
    camera.lookAt(0, 1.4, 0);
  }, [camera]);
  useFrame(() => {
    const target = Math.min(size.width / 15.5, size.height / 11);
    if (Math.abs(camera.zoom - target) > 0.01) {
      camera.zoom = target;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

export default function Scene3D({ game }: { game: GameState }) {
  const staff = Math.min(10, headcount(game));
  const volume = game.history.at(-1)?.kpis;
  const customers = Math.max(2, Math.min(8, Math.round(((volume ? Math.max(volume.customers, volume.unitsSold) : totalCustomers(game)) || 0) / 150) + 2));
  const floors = Math.min(4, 1 + Math.floor(headcount(game) / 6));
  const upgrades = useMemo(() => UPGRADES[game.industryId].map((u, i) => ({ def: u, level: game.upgrades[u.id] ?? 0, plot: i })), [game.industryId, game.upgrades]);
  const built = upgrades.filter((u) => u.level > 0);
  const occupied = new Set(built.map((u) => u.plot));
  const night = typeof document !== 'undefined' && (document.documentElement.dataset.theme === 'dark'
    || (!document.documentElement.dataset.theme && window.matchMedia?.('(prefers-color-scheme: dark)').matches));
  const doorZ = HQ_POS[1] + 1.4;

  return (
    <Canvas orthographic shadows dpr={[1, 2]} camera={{ position: [14, 13, 14], zoom: 30, near: -80, far: 160 }} gl={{ alpha: true, antialias: true }}
      aria-label={`3D view of ${game.companyName}: headquarters with ${floors} floor${floors > 1 ? 's' : ''}, ${built.length} upgrade buildings, ${staff} staff and customers walking in`}>
      <Zoom />
      <ambientLight intensity={night ? 0.45 : 0.8} />
      <hemisphereLight args={['#ffffff', '#7ccf52', night ? 0.2 : 0.4]} />
      <directionalLight position={[8, 14, 5]} intensity={night ? 0.75 : 1.35} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <Sea night={night} />
      <Boat night={night} />
      <group position={[0, -0.2, 0]}>
        <Island night={night} />
        <group position={[HQ_POS[0], 0, HQ_POS[1]]}>
          <Headquarters industry={game.industryId} floors={floors} />
        </group>
        {built.map((u) => (
          <group key={u.def.id} position={[PLOTS[u.plot][0], 0, PLOTS[u.plot][1]]}>
            <UpgradeModel id={u.def.id} level={u.level} />
            <Html position={[0, 2.6, 0]} center zIndexRange={[5, 0]}>
              <span className="pointer-events-none whitespace-nowrap rounded-full border-2 border-[#4a2c17] bg-[#fff3dc] px-1.5 font-display text-[10px] leading-4 text-[#3a2210]"
                title={`${u.def.name} level ${u.level}`}>{shortName(u.def.name)} {u.level}</span>
            </Html>
          </group>
        ))}
        {TREES.filter((t) => t.plot === undefined || !occupied.has(t.plot)).map((t, i) => <Tree key={i} x={t.p[0]} z={t.p[1]} c={t.c} s={t.s} />)}
        {Array.from({ length: staff }, (_, i) => (
          <Walker key={`s${i}`} color={PERSON_COLOURS[i % PERSON_COLOURS.length]} speed={0.12 + (i % 3) * 0.03} offset={i * 1.7}
            path={(t) => [HQ_POS[0] + Math.cos(t) * (2.4 + (i % 2) * 0.4), HQ_POS[1] + Math.sin(t) * (2.2 + (i % 2) * 0.4)]} />
        ))}
        {game.status === 'playing' && Array.from({ length: customers }, (_, i) => (
          <Walker key={`c${i}`} color={i % 2 ? '#ffc633' : '#ff6fae'} speed={0.1} offset={i / customers}
            path={(t) => { const u = ((t % 1) + 1) % 1; const d = u < 0.5 ? u * 2 : 2 - u * 2; return [HQ_POS[0] + 0.3 * Math.sin(i), 6.2 - d * (6.2 - doorZ)]; }} />
        ))}
      </group>
      <Cloud x={-8} z={-6} speed={0.3} />
      <Cloud x={4} z={-9} y={8} speed={0.22} />
      <Cloud x={12} z={2} y={6.5} speed={0.26} />
    </Canvas>
  );
}
