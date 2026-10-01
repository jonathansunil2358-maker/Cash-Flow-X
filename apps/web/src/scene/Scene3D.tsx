import { cosmeticsOf, decorDef, decorOf, formatGBP, headcount, skinOf, weatherFor, type SkinPalette, INDUSTRIES, totalCustomers, upgradeOptions, UPGRADES, type GameState } from '@cfx/engine';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Object3D, Vector3, type Group, type InstancedMesh, type Mesh } from 'three';
import { Headquarters, HQ_DOOR, UpgradeModel } from './buildings';
import { isWeatherOn } from '../lib/weather';
import { iconUrl } from '../lib/icons';
import { shortUpgradeName } from '../lib/upgradeLabels';
import { useGame } from '../store';
import { Billboard, DecorItem, Ferry, Fisher, Gull, Helipad, Lighthouse, PhoneBox, Pond, TrophyHall } from './extras';
import { Ball, Blk, Bush, C, Car, Cyl, Lamp, Tree } from './parts';

/**
 * The player's business as a low-poly island in the sea. It reads the game state: the
 * headquarters grows with headcount, each sector upgrade stands as its own building that grows
 * with its level, and customers arrive by car over the bridge, by bus and by boat.
 *
 * Layout (the camera looks from +x/+z, so +x+z is the front of the screen): the headquarters sits
 * at the back, a road runs across the island from a roundabout on the left to a bridge that leaves
 * the frame bottom-right, and the car park fills the front between the road and the beach.
 */

type Pt = [number, number];

/** Island top: a 16.4×16.4 grass square, ringed by beach. */
const GRASS = 16.4;
const HQ_POS: Pt = [-1.2, -2.0];
/** Upgrade plots, in the sector's upgrade order, clear of the road and car park. */
const PLOTS: Pt[] = [[-5.6, -2.2], [1.6, -5.8], [4.8, -1.4], [-4.6, 6.0], [-5.4, -6.0], [-0.9, 5.8], [6.6, -5.4], [-2.9, -5.9]];

const ROAD_Z = 2.8;
/** UK traffic keeps left: inbound (heading −x) on the car park side, outbound on the HQ side. */
const LANE_IN = 3.15;
const LANE_OUT = 2.45;
const ROAD_X0 = -4.5;
const ROUNDABOUT: Pt = [-5.6, ROAD_Z];
const PAVE_N = 1.85;
const PAVE_S = 3.75;
const BRIDGE_END = 24;
const ISLAND_EDGE = 7.6;

const PARK = { x0: 0.9, x1: 7.6, z0: 4.0, z1: 7.6 };
const ENTRY_IN = 1.75;
const ENTRY_OUT = 1.2;
const AISLE_IN = 4.6;
const AISLE_OUT = 7.15;
const BAY_Z = 5.9;
const BAYS = [2.4, 3.4, 4.4, 5.4, 6.4];
const BUS_STOP: Pt = [-3.4, PAVE_N];
const JETTY_X = -1.6;

const TREES: { p: Pt; c: string; plot?: number; s?: number }[] = [
  { p: [-5.8, -2.6], c: '#4e9e2f', plot: 0 }, { p: [-5.0, -1.6], c: '#7ccf52', plot: 0 },
  { p: [1.2, -6.0], c: '#ff8a1f', plot: 1 }, { p: [2.2, -5.4], c: '#4e9e2f', plot: 1 },
  { p: [4.5, -1.8], c: '#8e3fe6', plot: 2 }, { p: [5.3, -0.8], c: '#4e9e2f', plot: 2 },
  { p: [-4.9, 5.6], c: '#ff8a1f', plot: 3 }, { p: [-4.0, 6.5], c: '#7ccf52', plot: 3 },
  { p: [-5.6, -6.3], c: '#4e9e2f', plot: 4 }, { p: [-4.8, -5.5], c: '#8e3fe6', plot: 4 },
  { p: [6.9, -6.9], c: '#4e9e2f', s: 1.2, plot: 6 }, { p: [7.0, -4.0], c: '#7ccf52', plot: 6 }, { p: [-1.8, -6.6], c: '#4e9e2f', s: 1.1, plot: 7 },
  { p: [-2.7, -7.2], c: '#ff8a1f', s: 0.9, plot: 7 }, { p: [-2.6, 4.7], c: '#7ccf52', s: 0.8 },
  { p: [0.2, 7.2], c: '#4e9e2f', s: 0.8 }, { p: [-7.1, -0.4], c: '#7ccf52', s: 0.9 },
];

/** The island's tree colours (green, light green, orange, purple) in the equipped skin. */
const LEAF_KEYS = ['#4e9e2f', '#7ccf52', '#ff8a1f', '#8e3fe6'];
const leafColour = (sk: SkinPalette, c: string): string => sk.leaf[LEAF_KEYS.indexOf(c)] ?? c;

/** A flat rectangle lying on the ground (x0…x1 by z0…z1). */
function Patch({ x0, x1, z0, z1, y = 0.012, c }: { x0: number; x1: number; z0: number; z1: number; y?: number; c: string }) {
  return (
    <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[x1 - x0, z1 - z0]} /><meshStandardMaterial color={c} />
    </mesh>
  );
}

function Island({ night, doorX, sk, rich, cups, placed }: { night: boolean; doorX: number; sk: SkinPalette; rich: boolean; cups: number; placed: string[] }) {
  const asphalt = night ? '#3f4550' : '#5d6470';
  const paving = night ? '#a9a294' : '#ddd5c4';
  const line = '#fff8ec';
  const dashes: number[] = [];
  for (let x = ROAD_X0 + 0.4; x < BRIDGE_END; x += 0.9) if (Math.abs(x - doorX) > 0.8) dashes.push(x);
  return (
    <group>
      {/* rock and soil underneath, beach, then the grass top */}
      <Blk w={GRASS + 1.4} h={1.3} d={GRASS + 1.4} y={-1.7} c={sk.soil} rad={0.5} />
      <Blk w={GRASS + 1.2} h={0.5} d={GRASS + 1.2} y={-0.62} c={sk.sand} rad={0.35} />
      <Blk w={GRASS} h={0.4} d={GRASS} y={-0.4} c={night ? sk.grassNight : sk.grass} rad={0.3} />
      {/* checkerboard lawn */}
      {[-6, -2, 2, 6].flatMap((x, i) => [-6, -2, 2, 6].map((z, j) => ((i + j) % 2 === 0 ? (
        <mesh key={`${x}${z}`} position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.95, 3.95]} /><meshStandardMaterial color={night ? sk.lawnNight : sk.lawn} />
        </mesh>
      ) : null)))}

      {/* the road: pavements, kerbs, centre line and a zebra crossing outside the front door */}
      <Patch x0={ROAD_X0} x1={ISLAND_EDGE + 0.6} z0={ROAD_Z - 0.7} z1={ROAD_Z + 0.7} c={asphalt} />
      <Patch x0={ROAD_X0 + 0.2} x1={ISLAND_EDGE} z0={PAVE_N - 0.25} z1={PAVE_N + 0.25} y={0.02} c={paving} />
      <Patch x0={ROAD_X0 + 0.2} x1={PARK.x0} z0={PAVE_S - 0.25} z1={PAVE_S + 0.25} y={0.02} c={paving} />
      <Patch x0={ENTRY_IN + 0.4} x1={ISLAND_EDGE} z0={PAVE_S - 0.25} z1={PAVE_S + 0.25} y={0.02} c={paving} />
      {dashes.map((x) => <Patch key={x} x0={x} x1={x + 0.45} z0={ROAD_Z - 0.03} z1={ROAD_Z + 0.03} y={0.016} c={line} />)}
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <Patch key={n} x0={doorX - 0.4} x1={doorX + 0.4} z0={ROAD_Z - 0.62 + n * 0.23} z1={ROAD_Z - 0.5 + n * 0.23} y={0.018} c={line} />
      ))}
      {/* Belisha beacons either side of the crossing */}
      {[PAVE_N - 0.15, PAVE_S + 0.15].map((z) => (
        <group key={z} position={[doorX + 0.55, 0, z]}>
          <Cyl r={0.03} h={0.75} c={C.dark} seg={6} />
          <Ball r={0.08} y={0.8} c={C.orange} e={night ? C.orange : undefined} />
        </group>
      ))}
      {/* a paved forecourt from the front door to the pavement */}
      <Patch x0={HQ_POS[0] - 1.9} x1={HQ_POS[0] + 1.9} z0={HQ_POS[1] + 1.2} z1={PAVE_N - 0.25} y={0.01} c={paving} />

      {/* roundabout at the end of the road */}
      <mesh position={[ROUNDABOUT[0], 0.012, ROUNDABOUT[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.45, 28]} /><meshStandardMaterial color={asphalt} />
      </mesh>
      <Cyl r={0.55} h={0.1} x={ROUNDABOUT[0]} z={ROUNDABOUT[1]} c={night ? sk.grassNight : sk.lawn} seg={20} />
      <Bush x={ROUNDABOUT[0] - 0.15} z={ROUNDABOUT[1] + 0.1} c="#ff9ec4" />
      <Bush x={ROUNDABOUT[0] + 0.2} z={ROUNDABOUT[1] - 0.15} c="#ffc633" />

      {/* car park: tarmac, bay lines, a P sign and EV chargers */}
      <Patch x0={ENTRY_OUT - 0.3} x1={ENTRY_IN + 0.4} z0={PAVE_S - 0.25} z1={PARK.z0} c={asphalt} />
      <Patch x0={PARK.x0} x1={PARK.x1} z0={PARK.z0} z1={PARK.z1} c={night ? '#4a5059' : '#6b717c'} />
      {[...BAYS.map((x) => x - 0.5), BAYS[BAYS.length - 1] + 0.5].map((x) => (
        <Patch key={x} x0={x - 0.03} x1={x + 0.03} z0={BAY_Z - 0.75} z1={BAY_Z + 0.75} y={0.016} c={line} />
      ))}
      <ParkingSign x={PARK.x0 - 0.35} z={PAVE_S + 0.45} />
      {[5.4, 6.4].map((z) => (
        <group key={z} position={[PARK.x1 - 0.25, 0, z - 0.2]}>
          <Blk w={0.18} h={0.55} d={0.16} c={C.white} rad={0.04} />
          <Blk w={0.1} h={0.12} d={0.02} y={0.34} z={0.08} c={C.green} e={night ? C.green : undefined} rad={0.01} />
        </group>
      ))}
      {/* hedge along the beach side of the car park */}
      {[1.6, 2.9, 4.2, 5.5, 6.8].map((x) => <Bush key={x} x={x} z={PARK.z1 + 0.3} c="#4e9e2f" />)}

      {/* bus stop: shelter, bench and sign */}
      <group position={[BUS_STOP[0], 0, BUS_STOP[1] - 0.45]}>
        <Blk w={1.2} h={0.75} d={0.05} y={0.02} c={C.glass} o={0.6} rad={0.02} />
        <Blk w={1.3} h={0.06} d={0.55} y={0.8} z={0.2} c={C.red} rad={0.02} />
        {[-0.6, 0.6].map((x) => <Blk key={x} w={0.05} h={0.8} d={0.05} x={x} z={0.4} c={C.dark} rad={0.01} />)}
        <Blk w={0.9} h={0.06} d={0.2} y={0.25} z={0.12} c={C.wood} rad={0.02} />
      </group>
      <group position={[BUS_STOP[0] - 0.9, 0, BUS_STOP[1] + 0.1]}>
        <Cyl r={0.03} h={0.9} c={C.dark} seg={6} />
        <Cyl r={0.17} h={0.04} y={0.95} rx={Math.PI / 2} c={C.red} />
      </group>

      {/* street lamps and benches along the road */}
      {[2.6, 5.0].map((x) => <Lamp key={`n${x}`} x={x} z={PAVE_N - 0.4} />)}
      {[-3.0, -0.4, 4.0, 6.6].map((x) => <Lamp key={`s${x}`} x={x} z={PAVE_S + 0.4} />)}
      {[3.8, 6.0].map((x) => (
        <group key={x} position={[x, 0, PAVE_N - 0.55]}>
          <Blk w={0.7} h={0.06} d={0.22} y={0.2} c={C.wood} rad={0.02} />
          <Blk w={0.7} h={0.2} d={0.05} y={0.26} z={-0.1} c={C.wood} rad={0.02} />
          {[-0.28, 0.28].map((dx) => <Blk key={dx} w={0.05} h={0.2} d={0.18} x={dx} c={C.dark} rad={0.01} />)}
        </group>
      ))}
      {/* bike rack by the forecourt */}
      <group position={[HQ_POS[0] + 2.4, 0, PAVE_N - 0.6]}>
        {[-0.25, 0.25].map((dx, i) => <Bike key={dx} x={dx} c={i ? C.teal : C.red} />)}
      </group>

      {/* stepping stones from the jetty to the pavement, and the jetty itself */}
      {[4.5, 5.2, 5.9, 6.6, 7.3].map((z, i) => (
        <mesh key={z} position={[JETTY_X + (i % 2 ? 0.15 : -0.1), 0.02, z]} receiveShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.05, 10]} /><meshStandardMaterial color="#e8dcc6" />
        </mesh>
      ))}
      <Blk w={0.9} h={0.12} d={2.0} x={JETTY_X} y={-0.12} z={GRASS / 2 + 0.9} c={C.wood} rad={0.03} />
      {[0.35, -0.35].map((dx) => [GRASS / 2 + 0.2, GRASS / 2 + 1.7].map((z) => (
        <Blk key={`${dx}${z}`} w={0.12} h={0.9} d={0.12} x={JETTY_X + dx} y={-1.0} z={z} c={C.woodDark} />
      )))}

      {/* the bridge to the mainland, leaving the frame bottom-right */}
      <Blk w={BRIDGE_END - ISLAND_EDGE} h={0.22} d={1.9} x={(BRIDGE_END + ISLAND_EDGE) / 2} y={-0.2} z={ROAD_Z} c={C.grey} rad={0.04} />
      <Patch x0={ISLAND_EDGE} x1={BRIDGE_END} z0={ROAD_Z - 0.7} z1={ROAD_Z + 0.7} y={0.025} c={asphalt} />
      {[ROAD_Z - 0.88, ROAD_Z + 0.88].map((z) => (
        <group key={z}>
          <Blk w={BRIDGE_END - ISLAND_EDGE} h={0.06} d={0.06} x={(BRIDGE_END + ISLAND_EDGE) / 2} y={0.28} z={z} c={C.white} rad={0.02} />
          {Array.from({ length: 16 }, (_, n) => <Blk key={n} w={0.05} h={0.3} d={0.05} x={ISLAND_EDGE + 0.4 + n} y={0.02} z={z} c={C.white} rad={0.01} />)}
        </group>
      ))}
      {[10, 13.5, 17, 20.5].map((x) => <Blk key={x} w={0.55} h={1.4} d={1.3} x={x} y={-1.6} z={ROAD_Z} c="#b9b2a4" rad={0.08} />)}

      {/* landmarks and wildlife */}
      <Lighthouse x={-7.4} z={7.4} night={night} />
      {rich && <Helipad x={-2.2} z={7.3} night={night} />}
      {cups > 0 && <TrophyHall x={-7.1} z={-0.2} cups={cups} night={night} />}
      {placed.map((id) => { const d = decorDef(id); return d ? <DecorItem key={id} id={id} x={d.at[0]} z={d.at[1]} night={night} /> : null; })}
      <Pond x={5.6} z={-5.0} night={night} />
      <PhoneBox x={-4.9} z={1.05} />
      <Fisher x={JETTY_X - 0.3} z={GRASS / 2 + 1.7} />

      {/* flowers and rocks */}
      {[[-3.4, 0.6], [1.9, 0.5], [-6.6, 4.4], [6.4, -3.0], [3.4, -3.6], [-7.0, -3.8]].map(([x, z], i) => <Bush key={i} x={x} z={z} c={i % 2 ? '#ff9ec4' : '#4e9e2f'} />)}
      {[[8.6, -4], [-8.5, 2.2], [3.4, 8.55], [-2.5, -8.5], [-8.4, -6.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.2, z]} castShadow><dodecahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#b9b2a4" /></mesh>
      ))}
    </group>
  );
}

/** Blue "P" parking sign facing the camera. */
function ParkingSign({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 4, 0]}>
      <Cyl r={0.03} h={0.95} c={C.dark} seg={6} />
      <Blk w={0.46} h={0.46} d={0.04} y={0.85} c={C.blue} rad={0.04} />
      <Blk w={0.06} h={0.32} d={0.02} x={-0.07} y={0.92} z={0.03} c={C.white} rad={0.01} />
      <Blk w={0.16} h={0.05} d={0.02} x={0.0} y={1.19} z={0.03} c={C.white} rad={0.01} />
      <Blk w={0.16} h={0.05} d={0.02} x={0.0} y={1.06} z={0.03} c={C.white} rad={0.01} />
      <Blk w={0.05} h={0.16} d={0.02} x={0.08} y={1.06} z={0.03} c={C.white} rad={0.01} />
    </group>
  );
}

function Bike({ x, c }: { x: number; c: string }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {[-0.17, 0.17].map((dx) => (
        <mesh key={dx} position={[dx, 0.13, 0]}><torusGeometry args={[0.11, 0.022, 6, 14]} /><meshStandardMaterial color={C.dark} /></mesh>
      ))}
      <Blk w={0.34} h={0.04} d={0.04} y={0.2} c={c} rad={0.015} />
      <Blk w={0.04} h={0.14} d={0.04} x={0.12} y={0.2} c={c} rad={0.015} />
      <Blk w={0.12} h={0.03} d={0.06} x={-0.12} y={0.3} c={C.dark} rad={0.01} />
    </group>
  );
}

function Bus({ night }: { night: boolean }) {
  return (
    <group>
      <Blk w={2.0} h={0.62} d={0.62} y={0.1} c={C.red} rad={0.1} />
      <Blk w={1.6} h={0.2} d={0.64} x={-0.1} y={0.42} c={night ? '#ffe9a8' : C.glass} e={night ? '#ffe9a8' : undefined} rad={0.04} />
      <Blk w={0.05} h={0.3} d={0.5} x={1.0} y={0.36} c={C.glass} rad={0.02} />
      {[[-0.65, 0.3], [0.65, 0.3], [-0.65, -0.3], [0.65, -0.3]].map(([a, b], i) => <Cyl key={i} r={0.13} h={0.08} x={a} y={0.12} z={b} rx={Math.PI / 2} c={C.dark} />)}
      {night && [0.18, -0.18].map((dz) => <Blk key={dz} w={0.04} h={0.08} d={0.12} x={1.0} y={0.18} z={dz} c="#fff6c8" e="#fff6c8" rad={0.01} />)}
    </group>
  );
}

function CarWithLights({ c, night }: { c: string; night: boolean }) {
  return (
    <group>
      <Car c={c} />
      {night && [0.14, -0.14].map((dz) => <Blk key={dz} w={0.03} h={0.06} d={0.1} x={0.47} y={0.16} z={dz} c="#fff6c8" e="#fff6c8" rad={0.01} />)}
    </group>
  );
}

function Sea({ night, sk }: { night: boolean; sk: SkinPalette }) {
  const foam = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (foam.current) foam.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.012);
    if (ring.current) {
      const u = (t * 0.25) % 1;
      ring.current.scale.setScalar(1 + u * 0.14);
      (ring.current.material as unknown as { opacity: number }).opacity = 0.45 * (1 - u);
    }
  });
  return (
    <group position={[0, -0.95, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={night ? sk.seaNight : sk.sea} />
      </mesh>
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.02, 0]}>
        <ringGeometry args={[12.7, 13.5, 4, 1]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.75} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.015, 0]}>
        <ringGeometry args={[13.6, 13.95, 4, 1]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// Routes: everything that moves follows a list of points (or pauses), looped forever.
// ---------------------------------------------------------------------------------------------

/** A point to travel to, or a pause in seconds (`hide` = out of sight, e.g. inside the building). */
type Leg = Pt | { wait: number; hide?: boolean };
interface Step { t0: number; dur: number; a: Pt; b: Pt; hide: boolean }
interface Route { total: number; steps: Step[] }

function makeRoute(start: Pt, legs: Leg[], speed: number): Route {
  const steps: Step[] = [];
  let t = 0;
  let cur = start;
  for (const leg of legs) {
    if (Array.isArray(leg)) {
      const dur = Math.hypot(leg[0] - cur[0], leg[1] - cur[1]) / speed;
      steps.push({ t0: t, dur, a: cur, b: leg, hide: false });
      cur = leg;
      t += dur;
    } else {
      steps.push({ t0: t, dur: leg.wait, a: cur, b: cur, hide: !!leg.hide });
      t += leg.wait;
    }
  }
  return { total: t, steps };
}

/** Moves its children along a route. `forward` is the model's nose: cars face +x, people +z. */
function Mover({ route, offset, forward, bob = false, cheer = false, children }: { route: Route; offset: number; forward: 'x' | 'z'; bob?: boolean; cheer?: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g || route.total <= 0) return;
    const u = (((clock.elapsedTime + offset) % route.total) + route.total) % route.total;
    const step = route.steps.find((s) => u < s.t0 + s.dur) ?? route.steps[route.steps.length - 1];
    const k = step.dur > 0 ? Math.min(1, (u - step.t0) / step.dur) : 1;
    const x = step.a[0] + (step.b[0] - step.a[0]) * k;
    const z = step.a[1] + (step.b[1] - step.a[1]) * k;
    const moving = step.a !== step.b;
    g.visible = !step.hide;
    g.position.set(x, cheer ? Math.abs(Math.sin(clock.elapsedTime * 7 + offset)) * 0.3 : bob && moving ? Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.06 : 0, z);
    if (moving) {
      const dx = step.b[0] - step.a[0];
      const dz = step.b[1] - step.a[1];
      const target = forward === 'x' ? Math.atan2(-dz, dx) : Math.atan2(dx, dz);
      // Turn smoothly rather than snapping at each corner.
      let diff = target - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, delta * 10);
    }
  });
  return <group ref={ref}>{children}</group>;
}

function Person({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow><capsuleGeometry args={[0.13, 0.22, 4, 8]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.6, 0]} castShadow><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#ffcf9e" /></mesh>
    </group>
  );
}

/** Clockwise round the roundabout from the inbound lane to the outbound lane. */
const ROUND_TRIP: Pt[] = [[-4.9, 3.35], [-5.6, 3.6], [-6.3, 3.3], [-6.55, 2.8], [-6.3, 2.3], [-5.6, 2.0], [-4.9, 2.25], [ROAD_X0, LANE_OUT]];

const DRIVE = 2.4;
const SAIL = 1.6;
const WALK = 0.6;
/** Seconds a customer spends inside the headquarters. */
const INSIDE = 4;
const STOP_X = BUS_STOP[0] + 0.3;
/** Where the ferry ties up, alongside the end of the jetty. */
const DOCK: Pt = [JETTY_X + 0.9, GRASS / 2 + 1.5];

const pathLen = (pts: Pt[]) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/** A vehicle and the people it carries; people share the vehicle's clock offset (plus `shift`). */
interface Trip { vehicle: Route; people: { route: Route; shift: number }[] }

/** Over the zebra crossing (when coming from the south side) and up the forecourt to the front door. */
const toFrontDoor = (doorX: number, doorZ: number, s: number, fromSouth: boolean): Pt[] => [
  ...(fromSouth ? [[doorX + s, PAVE_S] as Pt] : []), [doorX + s, PAVE_N], [doorX + s * 0.5, doorZ],
];

/**
 * A car drives over the bridge and parks; its riders get out, visit, walk back and get in, and
 * only then does it leave. The parking time is worked out from how long the visit takes.
 */
function carTrip(bayX: number, riders: number, doorX: number, doorZ: number): Trip {
  const inbound: Pt[] = [[BRIDGE_END, LANE_IN], [ENTRY_IN, LANE_IN], [ENTRY_IN, AISLE_IN], [bayX, AISLE_IN], [bayX, BAY_Z]];
  const outbound: Pt[] = [[bayX, BAY_Z], [bayX, AISLE_OUT], [ENTRY_OUT, AISLE_OUT], [ENTRY_OUT, LANE_OUT], [BRIDGE_END, LANE_OUT]];
  const arrive = pathLen(inbound) / DRIVE;
  const walks = Array.from({ length: riders }, (_, j): Pt[] => {
    // Right-hand drive: the driver steps out on the car's right (-x when nosed in towards +z).
    const side = j === 0 ? -0.42 : 0.42;
    const s = j * 0.22;
    return [[bayX + side, BAY_Z + 0.05], [bayX + side, AISLE_IN + 0.15], [ENTRY_IN + 0.15 + s, AISLE_IN + 0.15], [ENTRY_IN + 0.25 + s, PAVE_S], ...toFrontDoor(doorX, doorZ, s, true)];
  });
  const getOut = (j: number) => 0.4 + j * 0.5;
  const visit = (w: Pt[]) => (2 * pathLen(w)) / WALK + INSIDE;
  const dwell = Math.max(...walks.map((w, j) => getOut(j) + visit(w))) + 0.7;
  const tail = 3;
  const total = arrive + dwell + pathLen(outbound) / DRIVE + tail;
  return {
    vehicle: makeRoute(inbound[0], [...inbound.slice(1), { wait: dwell }, ...outbound.slice(1), { wait: tail, hide: true }], DRIVE),
    people: walks.map((w, j) => {
      const start = arrive + getOut(j);
      return {
        shift: 0,
        route: makeRoute(w[0], [{ wait: start, hide: true }, ...w.slice(1), { wait: INSIDE, hide: true }, ...[...w].reverse().slice(1), { wait: total - start - visit(w), hide: true }], WALK),
      };
    }),
  };
}

/**
 * Shared shape of the bus and ferry: each arrival drops visitors off and picks up the ones waiting
 * from the previous arrival. A passenger's loop spans two vehicle loops (ride in, visit, wait, ride
 * away, be carried round), so pairs of passengers one loop apart keep every arrival busy.
 */
function shuttleTrip(o: {
  inbound: Pt[]; outbound: Pt[]; speed: number; dwell: number; minTail: number; pairs: number;
  alight: (s: number) => Pt; toDoor: (s: number) => Pt[]; waitAt: (s: number) => Pt;
}): Trip {
  const arrive = pathLen(o.inbound) / o.speed;
  const leave = pathLen(o.outbound) / o.speed;
  const legs = Array.from({ length: o.pairs }, (_, j) => {
    const s = j * 0.25;
    const there = [o.alight(s), ...o.toDoor(s)];
    const back = [...there].reverse().slice(0, -1).concat([o.waitAt(s)]);
    const board = Math.hypot(o.waitAt(s)[0] - o.alight(s)[0], o.waitAt(s)[1] - o.alight(s)[1]) / WALK;
    return { s, there, back, board };
  });
  // The loop must be long enough for a visit to finish before the next arrival.
  const longest = Math.max(0, ...legs.map((l) => (pathLen(l.there) + pathLen(l.back)) / WALK + INSIDE + 2));
  const tail = Math.max(o.minTail, longest - (arrive + o.dwell + leave));
  const T = arrive + o.dwell + leave + tail;
  const vehicle = makeRoute(o.inbound[0], [...o.inbound.slice(1), { wait: o.dwell }, ...o.outbound.slice(1), { wait: tail, hide: true }], o.speed);
  const people = legs.flatMap((l) => {
    const off = arrive + 0.5 + l.s;
    const walked = (pathLen(l.there) + pathLen(l.back)) / WALK + INSIDE;
    const boardAt = T + arrive + 1.2 + l.s;
    const route = makeRoute(l.there[0], [
      { wait: off, hide: true }, ...l.there.slice(1), { wait: INSIDE, hide: true }, ...l.back.slice(1),
      { wait: boardAt - off - walked }, l.there[0], { wait: 2 * T - boardAt - l.board, hide: true },
    ], WALK);
    return [{ route, shift: 0 }, { route, shift: T }];
  });
  return { vehicle, people };
}

function busTrip(pairs: number, doorX: number, doorZ: number): Trip {
  return shuttleTrip({
    inbound: [[BRIDGE_END + 2, LANE_IN], [ROAD_X0, LANE_IN], ...ROUND_TRIP, [STOP_X, LANE_OUT]],
    outbound: [[STOP_X, LANE_OUT], [BRIDGE_END + 2, LANE_OUT]],
    speed: DRIVE, dwell: 5, minTail: 8, pairs,
    // UK buses open on the kerb side, near the front.
    alight: (s) => [STOP_X + 0.6 + s * 0.3, PAVE_N + 0.1],
    toDoor: (s) => toFrontDoor(doorX, doorZ, s, false),
    waitAt: (s) => [BUS_STOP[0] - 0.3 + s, PAVE_N - 0.25],
  });
}

function ferryTrip(pairs: number, doorX: number, doorZ: number): Trip {
  return shuttleTrip({
    inbound: [[DOCK[0], 24], DOCK],
    outbound: [DOCK, [DOCK[0] + 1.4, DOCK[1] + 1.2], [DOCK[0] + 1.4, 24]],
    speed: SAIL, dwell: 5, minTail: 10, pairs,
    alight: (s) => [JETTY_X + 0.25, DOCK[1] - s],
    toDoor: (s) => [[JETTY_X + s * 0.3, GRASS / 2 - 0.2], [JETTY_X + s, PAVE_S], ...toFrontDoor(doorX, doorZ, s, true)],
    waitAt: (s) => [JETTY_X - 0.1 + s * 0.3, GRASS / 2 + 0.45],
  });
}

function staffRoute(i: number): Route {
  const r = 2.2 + (i % 2) * 0.35;
  const pts: Pt[] = Array.from({ length: 13 }, (_, n) => {
    const a = (n / 12) * Math.PI * 2 * (i % 2 ? -1 : 1);
    return [HQ_POS[0] + Math.cos(a) * r, HQ_POS[1] + Math.sin(a) * (r - 0.2)];
  });
  return makeRoute(pts[0], pts.slice(1), 0.5);
}

/** Rain, snow or a warm dusk glow, following the in-game season. Pure decoration. */
function WeatherFx({ kind }: { kind: 'rain' | 'snow' }) {
  const count = kind === 'rain' ? 160 : 120;
  const ref = useRef<InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: ((i * 53) % 100) / 100 * 28 - 14, z: ((i * 31) % 100) / 100 * 28 - 14, y: ((i * 17) % 100) / 100 * 11, v: 0.6 + ((i * 7) % 10) / 10 })), [count]);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    seeds.forEach((p, i) => {
      const fall = kind === 'rain' ? 9 : 1.6;
      const y = 11 - (((p.y + t * fall * p.v) % 11) + 11) % 11;
      dummy.position.set(p.x + (kind === 'snow' ? Math.sin(t * 0.8 + i) * 0.4 : 0), y, p.z);
      dummy.rotation.z = kind === 'rain' ? 0.15 : 0;
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      {kind === 'rain' ? <boxGeometry args={[0.02, 0.45, 0.02]} /> : <sphereGeometry args={[0.07, 6, 5]} />}
      <meshBasicMaterial color={kind === 'rain' ? '#9ec9ff' : '#ffffff'} transparent opacity={kind === 'rain' ? 0.55 : 0.9} />
    </instancedMesh>
  );
}

function Cloud({ x, z, y = 7, speed }: { x: number; z: number; y?: number; speed: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = ((x + clock.elapsedTime * speed + 24) % 48) - 24;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <Ball r={0.8} c="#ffffff" o={0.92} ns />
      <Ball r={0.6} x={0.85} y={-0.15} z={0.1} c="#ffffff" o={0.92} ns />
      <Ball r={0.55} x={-0.8} y={-0.2} c="#ffffff" o={0.92} ns />
    </group>
  );
}

/** A sailing boat that tacks back and forth round the island, keeping clear of the bridge. */
function Boat({ night }: { night: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const u = (clock.elapsedTime * 0.012) % 2;
    const p = u < 1 ? u : 2 - u;
    const a = (40 + p * 300) * (Math.PI / 180);
    ref.current.position.set(Math.cos(a) * 14.5, -0.9 + Math.sin(clock.elapsedTime * 1.6) * 0.04, Math.sin(a) * 14.5);
    ref.current.rotation.y = -a + (u < 1 ? 0 : Math.PI);
  });
  return (
    <group ref={ref}>
      <Blk w={0.5} h={0.22} d={1.1} c={night ? '#dcd6cc' : C.white} rad={0.1} />
      <Blk w={0.04} h={0.8} d={0.04} y={0.2} c={C.woodDark} />
      <mesh position={[0, 0.65, 0.15]} rotation={[0, Math.PI / 2, 0]}><coneGeometry args={[0.28, 0.6, 3]} /><meshStandardMaterial color={C.red} /></mesh>
    </group>
  );
}

/**
 * A tappable tag floating over something on the island. It does what the thing is for: open its
 * upgrade card, or jump to the panel that runs it.
 */
interface SceneTag { id: string; at: [number, number, number]; label: string; ghost?: boolean; onSelect: () => void; content: ReactNode;
  /** Lower ranks win when tags would overlap; a tag that cannot find room is hidden. */
  rank: number }
type TagPoint = { at: [number, number, number]; rank: number };

const Padlock = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden className="-ml-0.5"><rect x="3" y="7" width="10" height="8" rx="2" fill="currentColor" /><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
);

/**
 * Pins the tag buttons (plain DOM over the canvas) to their 3D points every frame. Plain DOM in
 * the app's own tree, rather than one React root per label, keeps every tag reliably mounted.
 */
function TagProjector({ els, points }: { els: MutableRefObject<Map<string, HTMLElement>>; points: MutableRefObject<Map<string, TagPoint>> }) {
  const v = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    // Read every size first, then write, so the browser lays out once per frame.
    const items = [...els.current].flatMap(([id, el]) => {
      const p = points.current.get(id);
      if (!p) return [];
      v.set(p.at[0], p.at[1], p.at[2]).project(camera);
      return [{ el, rank: p.rank, x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, w: el.offsetWidth, h: el.offsetHeight }];
    }).sort((a, b) => a.rank - b.rank);
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    for (const it of items) {
      // Try the natural spot, then nudge up to two rows higher; hide the tag if it still collides.
      let shown = false;
      let dy = 0;
      for (let attempt = 0; attempt < 3 && !shown; attempt++, dy -= it.h + 2) {
        const box = { x0: it.x - it.w / 2 - 2, x1: it.x + it.w / 2 + 2, y0: it.y + dy - it.h / 2 - 1, y1: it.y + dy + it.h / 2 + 1 };
        if (!placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) {
          placed.push(box);
          it.el.style.transform = `translate(${it.x}px, ${it.y + dy}px) translate(-50%, -50%)`;
          shown = true;
        }
      }
      it.el.style.visibility = shown ? 'visible' : 'hidden';
    }
  });
  return null;
}

/** Fit the whole island in the frame whatever its size (only the bridge runs off to the mainland). */
function Zoom() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(14, 14.6, 14);
    camera.lookAt(0, 0.6, 0);
  }, [camera]);
  useFrame(() => {
    const target = Math.min(size.width / 26.5, size.height / 21);
    if (Math.abs(camera.zoom - target) > 0.01) {
      camera.zoom = target;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

const PERSON_COLOURS = ['#1f78d1', '#d93a2f', '#2f9420', '#8e3fe6', '#ff8a1f', '#22b8c7'];
const CAR_COLOURS = [C.blue, C.purple, C.green, C.orange, C.teal, C.pink];

export default function Scene3D({ game }: { game: GameState }) {
  const staff = Math.min(10, headcount(game));
  const volume = game.history.at(-1)?.kpis;
  const customers = Math.max(2, Math.min(9, Math.round(((volume ? Math.max(volume.customers, volume.unitsSold) : totalCustomers(game)) || 0) / 150) + 2));
  const floors = Math.min(4, 1 + Math.floor(headcount(game) / 6));
  const upgrades = useMemo(() => UPGRADES[game.industryId].map((u, i) => ({ def: u, level: game.upgrades[u.id] ?? 0, plot: i })), [game.industryId, game.upgrades]);
  const built = upgrades.filter((u) => u.level > 0);
  const occupied = new Set(built.map((u) => u.plot));
  const night = typeof document !== 'undefined' && (document.documentElement.dataset.theme === 'dark'
    || (!document.documentElement.dataset.theme && window.matchMedia?.('(prefers-color-scheme: dark)').matches));
  // The team jumps for joy for a month after the board is pleased.
  const cheering = game.board?.last === 'hit' && game.month - (game.board.due - 3) <= 1;
  const weatherOn = isWeatherOn();
  const weather = weatherOn ? weatherFor(game) : 'clear';
  const decor = useGame((s) => s.profile.decor);
  const placed = useMemo(() => decorOf({ decor }).placed, [decor]);
  const cups = useGame((s) => (game.awards?.length ?? 0) + Math.floor(Object.keys(s.profile.achievements).length / 3));
  const rich = (game.history.at(-1)?.valuation?.equityValue ?? 0) >= 5_000_000_00;
  const skinId = useGame((s) => cosmeticsOf(s.profile).skin);
  const sk = skinOf(skinId).palette;
  const setSceneFocus = useGame((s) => s.setSceneFocus);
  const openSheet = useGame((s) => s.openSheet);
  const options = useMemo(() => new Map(upgradeOptions(game).map((o) => [o.def.id, o])), [game]);
  const cash = game.ledger.balances.cash;
  const playing = game.status === 'playing';
  const subscription = INDUSTRIES[game.industryId].model === 'subscription';
  const trade = (subscription ? volume?.customers : volume?.unitsSold) ?? 0;
  const tradeLabel = subscription ? INDUSTRIES[game.industryId].unitPlural : `${INDUSTRIES[game.industryId].unitPlural}/mo`;
  const doorX = HQ_POS[0] + HQ_DOOR[game.industryId];
  const door: Pt = [doorX, HQ_POS[1] + 1.3];
  const open = game.status === 'playing';
  // Busier businesses draw more traffic: more visiting cars (and fuller ones), more bus and
  // ferry passengers, and more cars already parked.
  // Over capacity? Customers queue, so another vehicle waits at the door.
  const overCapacity = (volume?.utilisation ?? 0) > 1;
  const visiting = open ? Math.min(3, 1 + (customers >= 4 ? 1 : 0) + (customers >= 7 || overCapacity ? 1 : 0)) : 0;
  const riders = customers >= 5 ? 2 : 1;
  const busPairs = customers >= 6 ? 2 : 1;
  const ferryPairs = customers >= 4 ? 1 : 0;
  const parked = open ? Math.min(2, Math.max(0, customers - 2)) : 0;
  const trips = useMemo(() => ({
    cars: [BAYS[1], BAYS[3], BAYS[4]].map((bay) => carTrip(bay, riders, door[0], door[1])),
    bus: busTrip(busPairs, door[0], door[1]),
    ferry: ferryTrip(ferryPairs, door[0], door[1]),
  }), [door[0], door[1], riders, busPairs, ferryPairs]);
  const staffRoutes = useMemo(() => Array.from({ length: 10 }, (_, i) => staffRoute(i)), []);

  // Tags: built upgrades show their level (and ▲ when the next level is affordable), empty plots
  // offer to build, and landmarks open the panel that runs them. Points are in world space (the
  // island group sits 0.2 below the origin).
  const tags: SceneTag[] = [];
  for (const u of upgrades) {
    const o = options.get(u.def.id);
    if (!o) continue;
    const [px, pz] = PLOTS[u.plot];
    const ready = playing && !o.maxed && !o.locked && o.cost <= cash;
    tags.push(u.level > 0 ? {
      id: u.def.id, at: [px, 2.4, pz], rank: 0, onSelect: () => setSceneFocus(u.def.id),
      label: `${u.def.name}, level ${u.level}${o.maxed ? ', maxed' : ready ? ', next level affordable' : ''}. Open upgrade card.`,
      content: <>{shortUpgradeName(u.def)} <span className="opacity-70">Lv {u.level}</span>
        {o.maxed ? <b className="cfx-scene-tag__badge is-max">MAX</b> : u.level > u.def.maxLevel ? <b className="cfx-scene-tag__badge is-max">★</b> : ready ? <b className="cfx-scene-tag__badge">▲</b> : null}</>,
    } : {
      id: u.def.id, at: [px, 1.5, pz], rank: 2, ghost: true, onSelect: () => setSceneFocus(u.def.id),
      label: `Build ${u.def.name} for ${formatGBP(o.cost)}${o.locked ? ` (${o.locked})` : ''}. Open upgrade card.`,
      content: o.locked
        ? <><Padlock /> {shortUpgradeName(u.def)}</>
        : <>+ {shortUpgradeName(u.def)} <span className="opacity-70">{formatGBP(o.cost, { compact: true })}</span></>,
    });
  }
  tags.push(
    { id: 'hq', at: [HQ_POS[0], 2.0, HQ_POS[1] + 0.8], rank: 1, onSelect: () => openSheet('team'),
      label: `Headquarters: ${headcount(game)} staff. Open Team to hire.`, content: <>Team <span className="opacity-70">{headcount(game)} staff</span></> },
    { id: 'billboard', at: [7.1, 2.1, 0.7], rank: 3, onSelect: () => openSheet('team', undefined, 'card-marketing'),
      label: 'Billboard: open Marketing', content: 'Marketing' },
    { id: 'carpark', at: [4.4, 0.8, BAY_Z], rank: 3, onSelect: () => openSheet('books', 'market'),
      label: `Car park: ${trade.toLocaleString('en-GB')} ${tradeLabel}. Open market share in the Books.`,
      content: <>{trade.toLocaleString('en-GB')} <span className="opacity-70">{tradeLabel}</span></> },
  );
  const tagEls = useRef(new Map<string, HTMLElement>());
  const tagPoints = useRef(new Map<string, TagPoint>());
  tagPoints.current = new Map(tags.map((t) => [t.id, { at: t.at, rank: t.rank }]));

  return (
    <div className="relative h-full w-full">
    <Canvas orthographic shadows dpr={[1, 2]} camera={{ position: [14.3, 14.4, 14.3], zoom: 24, near: -80, far: 200 }} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      aria-label={`3D view of ${game.companyName}: headquarters with ${floors} floor${floors > 1 ? 's' : ''}, ${built.length} upgrade buildings, ${staff} staff, and customers arriving by car, bus and boat`}>
      <Zoom />
      <TagProjector els={tagEls} points={tagPoints} />
      <ambientLight intensity={night ? 0.45 : weather === 'dusk' ? 0.62 : weather === 'rain' ? 0.65 : 0.8} color={weather === 'dusk' && !night ? '#ffd2a1' : '#ffffff'} />
      <hemisphereLight args={['#ffffff', sk.ground, night ? 0.2 : 0.4]} />
      <directionalLight position={[10, 16, 6]} intensity={night ? 0.75 : 1.35} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
      <Sea night={night} sk={sk} />
      <Boat night={night} />
      <group position={[0, -0.2, 0]}>
        <Island night={night} doorX={doorX} sk={sk} rich={rich} cups={cups} placed={placed} />
        <group position={[HQ_POS[0], 0, HQ_POS[1]]}>
          <Headquarters industry={game.industryId} floors={floors} />
        </group>
        {built.map((u) => (
          <group key={u.def.id} position={[PLOTS[u.plot][0], 0, PLOTS[u.plot][1]]}>
            <UpgradeModel id={u.def.id} level={u.level} />
          </group>
        ))}

        {TREES.filter((t) => t.plot === undefined || !occupied.has(t.plot)).map((t, i) => <Tree key={i} x={t.p[0]} z={t.p[1]} c={leafColour(sk, t.c)} s={t.s} />)}

        {[0, 2].slice(0, parked).map((b, i) => (
          <Car key={b} x={BAYS[b]} y={0.02} z={BAY_Z} ry={-Math.PI / 2} c={CAR_COLOURS[(i + 3) % CAR_COLOURS.length]} />
        ))}
        <Suspense fallback={null}>
          <Billboard x={7.1} z={0.7} name={game.companyName} icon={iconUrl(game.icon)} />
        </Suspense>

        {/* Visitors ride in, get out, go inside, come back and get in again before the vehicle leaves. */}
        {trips.cars.slice(0, visiting).map((t, i) => (
          <group key={`car${i}`}>
            <Mover route={t.vehicle} offset={i * 17} forward="x"><CarWithLights c={CAR_COLOURS[i]} night={night} /></Mover>
            {t.people.map((p, j) => (
              <Mover key={j} route={p.route} offset={i * 17 + p.shift} forward="z" bob><Person color={PERSON_COLOURS[(i * 2 + j + 3) % PERSON_COLOURS.length]} /></Mover>
            ))}
          </group>
        ))}
        {open && (
          <>
            <Mover route={trips.bus.vehicle} offset={3} forward="x"><Bus night={night} /></Mover>
            {trips.bus.people.map((p, j) => (
              <Mover key={`b${j}`} route={p.route} offset={3 + p.shift} forward="z" bob><Person color={j % 2 ? '#ffc633' : '#ff6fae'} /></Mover>
            ))}
            <Mover route={trips.ferry.vehicle} offset={9} forward="x"><Ferry night={night} /></Mover>
            {trips.ferry.people.map((p, j) => (
              <Mover key={`f${j}`} route={p.route} offset={9 + p.shift} forward="z" bob><Person color={j % 2 ? C.teal : C.purple} /></Mover>
            ))}
          </>
        )}

        {Array.from({ length: staff }, (_, i) => (
          <Mover key={`s${i}`} route={staffRoutes[i]} offset={i * 2.3} forward="z" bob cheer={cheering}><Person color={PERSON_COLOURS[i % PERSON_COLOURS.length]} /></Mover>
        ))}
      </group>
      <Gull r={6} y={5.5} speed={0.35} phase={0} />
      <Gull r={8.5} y={6.2} speed={0.28} phase={2.1} />
      <Gull r={4.5} y={4.8} speed={0.42} phase={4.0} />
      <Cloud x={-10} z={-8} speed={0.3} />
      <Cloud x={4} z={-11} y={8} speed={0.22} />
      <Cloud x={14} z={2} y={6.5} speed={0.26} />
      {weather === 'rain' || weather === 'snow' ? <WeatherFx kind={weather} /> : null}
    </Canvas>
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {tags.map((t) => (
        <div key={t.id} className="absolute left-0 top-0" style={{ transform: 'translate(-9999px, 0)' }}
          ref={(el) => { if (el) tagEls.current.set(t.id, el); else tagEls.current.delete(t.id); }}>
          <button type="button" className={`cfx-scene-tag pointer-events-auto${t.ghost ? ' is-ghost' : ''}`} aria-label={t.label} title={t.label} onClick={t.onSelect}>
            {t.content}
          </button>
        </div>
      ))}
    </div>
    </div>
  );
}
