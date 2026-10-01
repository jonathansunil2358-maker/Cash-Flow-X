import type { IndustryId } from '@cfx/engine';
import type { ReactNode } from 'react';
import {
  Awning, Ball, Blink, Blk, Bob, Bush, C, Car, Container, Crate, Cyl, Disc, Flag, Gable, Lamp, Parasol, Person, RollDoor, Smoke, Spin, Windows,
} from './parts';

/**
 * Detailed low-poly buildings: one headquarters per sector and a model for every sector upgrade.
 * Upgrade models grow with their level (1-5): more floors, more stock, more vehicles, more props.
 */

// ---------------------------------------------------------------------------------------------
// Headquarters
// ---------------------------------------------------------------------------------------------

function SoftwareHQ({ floors }: { floors: number }) {
  const h = 0.9 + floors * 0.75;
  return (
    <group>
      <Blk w={3.2} h={0.25} d={2.6} c={C.grey} />
      <Blk w={2.9} h={h} d={2.3} y={0.25} c={C.white} />
      {/* glass curtain wall on the front */}
      <Blk w={1.7} h={h - 0.35} d={0.06} x={-0.45} y={0.45} z={1.16} c={C.glassDark} rad={0.02} />
      {Array.from({ length: Math.round(h / 0.4) }, (_, i) => <Blk key={i} w={1.72} h={0.03} d={0.08} x={-0.45} y={0.6 + i * 0.4} z={1.17} c={C.white} rad={0.01} />)}
      <Windows w={2.9} d={2.3} floors={floors + 1} y0={0.55} cols={1} sideCols={3} />
      <Blk w={0.6} h={0.75} d={0.08} x={0.95} y={0.25} z={1.16} c={C.woodDark} rad={0.03} />
      <Blk w={1.1} h={0.08} d={0.55} x={0.95} y={1.05} z={1.35} c={C.blue} rad={0.03} />
      {/* roof */}
      <Blk w={3.0} h={0.2} d={2.4} y={0.25 + h} c={C.blue} />
      <Blk w={0.9} h={0.35} d={0.7} x={-0.8} y={0.45 + h} z={-0.4} c={C.grey} />
      <Cyl r={0.04} h={1.1} x={0.9} y={0.45 + h} z={-0.5} c={C.dark} seg={6} />
      <Blink x={0.9} y={1.6 + h} z={-0.5} />
      <Cyl r={0.35} rt={0.1} h={0.12} x={0.3} y={0.5 + h} z={0.4} rx={-0.7} c={C.white} />
    </group>
  );
}

function ClothingHQ({ floors }: { floors: number }) {
  const h = 1 + floors * 0.6;
  return (
    <group>
      <Blk w={3.1} h={h} d={2.4} c="#ffe6f1" />
      <Blk w={3.2} h={0.18} d={2.5} y={h} c={C.pink} />
      <Blk w={2.4} h={0.9} d={0.06} x={-0.2} y={0.2} z={1.21} c={C.glass} rad={0.03} />
      {/* mannequins in the shop window */}
      {[-1, -0.3, 0.4].map((x, i) => <Person key={x} x={x} z={1.0} c={[C.purple, C.yellow, C.teal][i]} y={0.18} />)}
      <Awning w={2.8} y={1.25} z={1.22} a={C.pink} b={C.white} stripes={8} />
      <Blk w={0.5} h={0.8} d={0.08} x={1.3} y={0} z={1.21} c={C.woodDark} rad={0.03} />
      <Windows w={3.1} d={2.4} floors={Math.max(1, floors)} y0={1.55} cols={4} sideCols={3} floorH={0.6} />
      <Disc x={0} y={h + 0.45} z={0.6} r={0.35} c={C.purple} />
      <Blk w={0.08} h={0.3} d={0.08} y={h + 0.15} z={0.6} c={C.dark} />
    </group>
  );
}

function RestaurantHQ({ floors }: { floors: number }) {
  const h = 1.1 + (floors - 1) * 0.6;
  return (
    <group>
      <Blk w={3.1} h={h} d={2.5} c={C.cream} />
      <Gable w={3.3} d={2.7} h={0.9} y={h} c={C.red} />
      <Blk w={0.4} h={1.2} d={0.4} x={0.9} y={h} z={-0.5} c={C.grey} />
      <Smoke x={0.9} y={h + 1.3} z={-0.5} />
      <Blk w={1.8} h={0.7} d={0.06} x={-0.5} y={0.25} z={1.26} c={C.glass} rad={0.03} />
      <Awning w={2.9} y={1.05} z={1.27} a={C.red} b={C.white} stripes={9} />
      <Blk w={0.55} h={0.8} d={0.08} x={1.1} y={0} z={1.26} c={C.woodDark} rad={0.03} />
      <Windows w={3.1} d={2.5} floors={Math.max(0, floors - 1)} y0={1.35} cols={3} sideCols={3} floorH={0.6} />
      {/* outdoor tables */}
      <Parasol x={-1.1} z={2.1} c={C.red} />
      <Parasol x={0.2} z={2.2} c={C.yellow} />
      <Blk w={0.5} h={0.6} d={0.08} x={1.6} y={0} z={1.9} ry={-0.4} c={C.dark} rad={0.02} />
    </group>
  );
}

function FitnessHQ({ floors }: { floors: number }) {
  const h = 1.2 + (floors - 1) * 0.65;
  return (
    <group>
      <Blk w={3.3} h={h} d={2.4} c="#e4f7f8" />
      <Blk w={3.4} h={0.2} d={2.5} y={h} c={C.teal} />
      <Blk w={2.9} h={h - 0.4} d={0.06} y={0.2} z={1.21} c={C.glassDark} rad={0.03} />
      {/* treadmills visible through the glass */}
      {[-1, -0.3, 0.4].map((x) => <Blk key={x} w={0.45} h={0.25} d={0.3} x={x} y={0} z={0.95} c={C.dark} rad={0.04} />)}
      <Blk w={0.55} h={0.85} d={0.08} x={1.25} y={0} z={1.23} c={C.dark} rad={0.03} />
      <group position={[0, h + 0.55, 0.5]}>
        <Blk w={1.3} h={0.14} d={0.14} y={-0.07} c={C.dark} rad={0.05} />
        <Blk w={0.28} h={0.6} d={0.6} x={-0.7} y={-0.3} c={C.orange} />
        <Blk w={0.28} h={0.6} d={0.6} x={0.7} y={-0.3} c={C.orange} />
      </group>
    </group>
  );
}

function EcommerceHQ({ floors }: { floors: number }) {
  const h = 1.3 + (floors - 1) * 0.35;
  return (
    <group>
      <Blk w={3.4} h={h} d={2.6} c="#fff0dc" />
      <Blk w={3.5} h={0.2} d={2.7} y={h} c={C.orange} />
      {[-1, 0, 1].map((x) => <RollDoor key={x} w={0.75} h={0.9} x={x} z={1.31} />)}
      <Blk w={3.4} h={0.25} d={0.5} y={0} z={1.55} c={C.grey} rad={0.03} />
      {/* delivery van at the dock */}
      <group position={[1.9, 0, 2.2]} rotation={[0, Math.PI / 2, 0]}>
        <Blk w={1.1} h={0.65} d={0.6} y={0.15} c={C.white} rad={0.08} />
        <Blk w={0.35} h={0.4} d={0.58} x={0.7} y={0.15} c={C.orange} rad={0.08} />
        {[[-0.35, 0.3], [0.5, 0.3], [-0.35, -0.3], [0.5, -0.3]].map(([a, b], i) => <Cyl key={i} r={0.12} h={0.08} x={a} y={0.12} z={b} rx={Math.PI / 2} c={C.dark} />)}
      </group>
      {[[-1.9, 0.5], [-1.9, 1.0], [-2.3, 0.75]].map(([x, z], i) => <Crate key={i} x={x} z={z} />)}
      <Crate x={-1.9} y={0.32} z={0.75} />
      <Disc x={0} y={h + 0.45} z={0.8} r={0.32} c={C.orange} />
      <Blk w={0.08} h={0.3} d={0.08} y={h + 0.15} z={0.8} c={C.dark} />
    </group>
  );
}

function AutomotiveHQ({ floors }: { floors: number }) {
  const h = 1.4 + (floors - 1) * 0.35;
  return (
    <group>
      <Blk w={3.4} h={h} d={2.6} c="#edf6e6" />
      <Blk w={3.5} h={0.2} d={2.7} y={h} c={C.green} />
      <RollDoor w={1.2} h={1.05} x={-0.8} z={1.31} />
      <RollDoor w={1.2} h={1.05} x={0.7} z={1.31} c={C.steel} />
      <Car x={0.7} z={2.1} c={C.red} />
      <Car x={-1.9} z={1.8} c={C.blue} ry={0.6} />
      {[0, 0.12, 0.24].map((y) => <Cyl key={y} r={0.18} h={0.12} x={1.9} y={y} z={0.9} c={C.dark} />)}
      <Blk w={1.6} h={0.4} d={0.08} y={h + 0.2} z={0.9} c={C.yellow} rad={0.05} />
      <Blk w={0.08} h={0.25} d={0.08} x={-0.5} y={h} z={0.9} c={C.dark} />
      <Blk w={0.08} h={0.25} d={0.08} x={0.5} y={h} z={0.9} c={C.dark} />
    </group>
  );
}

/** x offset of each headquarters' customer entrance (the front faces +z), clear of forecourt props. */
export const HQ_DOOR: Record<IndustryId, number> = {
  software: 0.95, clothing: 1.3, restaurant: 1.1, fitness: 1.25, ecommerce: 0, automotive: -0.8,
};

export function Headquarters({ industry, floors }: { industry: IndustryId; floors: number }) {
  switch (industry) {
    case 'software': return <SoftwareHQ floors={floors} />;
    case 'clothing': return <ClothingHQ floors={floors} />;
    case 'restaurant': return <RestaurantHQ floors={floors} />;
    case 'fitness': return <FitnessHQ floors={floors} />;
    case 'ecommerce': return <EcommerceHQ floors={floors} />;
    case 'automotive': return <AutomotiveHQ floors={floors} />;
  }
}

// ---------------------------------------------------------------------------------------------
// Shared upgrade shapes
// ---------------------------------------------------------------------------------------------

/** A small building: walls, flat roof in the accent colour, a door and windows. */
function Shed({ w, d, h, wall, roof, door = C.woodDark, windows = true, gable = false }: {
  w: number; d: number; h: number; wall: string; roof: string; door?: string; windows?: boolean; gable?: boolean;
}) {
  return (
    <group>
      <Blk w={w} h={h} d={d} c={wall} />
      {gable ? <Gable w={w + 0.15} d={d + 0.15} h={0.55} y={h} c={roof} /> : <Blk w={w + 0.1} h={0.16} d={d + 0.1} y={h} c={roof} />}
      <Blk w={0.4} h={0.6} d={0.06} x={w / 2 - 0.35} y={0} z={d / 2 + 0.01} c={door} rad={0.03} />
      {windows && <Windows w={w - 0.5} d={d} floors={Math.max(1, Math.floor((h - 0.2) / 0.6))} y0={0.3} floorH={0.6} cols={2} sideCols={2} />}
    </group>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ---------------------------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------------------------

type Model = (lvl: number) => ReactNode;

const UPGRADE_MODELS: Record<string, Model> = {
  // Software
  cloud: (lvl) => (
    <group>
      <Blk w={1.8} h={0.6 + lvl * 0.15} d={1.3} c={C.white} />
      {range(4).map((i) => <Blk key={i} w={1.5} h={0.04} d={0.05} y={0.2 + i * 0.12} z={0.66} c={C.dark} rad={0.01} />)}
      <Blk w={1.9} h={0.12} d={1.4} y={0.6 + lvl * 0.15} c={C.blue} />
      {range(lvl).map((i) => <Blk key={i} w={0.25} h={0.3} d={0.3} x={-0.65 + i * 0.32} y={0.72 + lvl * 0.15} z={-0.25} c={C.dark} e={i % 2 ? '#2fd0de' : undefined} rad={0.03} />)}
      <Bob x={0.2} y={1.8 + lvl * 0.15} z={0.1}>
        <Ball r={0.3} c="#ffffff" /><Ball r={0.22} x={-0.32} y={-0.05} c="#ffffff" /><Ball r={0.24} x={0.32} y={-0.04} c="#ffffff" />
      </Bob>
    </group>
  ),
  crm: (lvl) => (
    <group>
      <Shed w={1.6} d={1.3} h={0.7 + lvl * 0.25} wall={C.cream} roof={C.green} />
      <group position={[0, 0.95 + lvl * 0.25, 0.1]}>
        <Blk w={1.2} h={0.75} d={0.08} y={0.1} c={C.dark} rad={0.04} />
        {[[0.18, C.green], [0.32, C.yellow], [0.48, C.blue]].map(([hh, col], i) => (
          <Blk key={i} w={0.2} h={hh as number} d={0.05} x={-0.35 + i * 0.35} y={0.2} z={0.05} c={col as string} e={col as string} rad={0.02} />
        ))}
      </group>
    </group>
  ),
  devtools: (lvl) => (
    <group>
      <Shed w={1.7} d={1.3} h={0.65 + lvl * 0.15} wall="#efe6ff" roof={C.purple} gable />
      <group position={[0.2, 0.45 + lvl * 0.08, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <Spin speed={1.2}>
          <mesh castShadow><cylinderGeometry args={[0.28, 0.28, 0.08, 8]} /><meshStandardMaterial color={C.yellow} /></mesh>
          {range(8).map((i) => <mesh key={i} position={[Math.cos((i * Math.PI) / 4) * 0.33, 0, Math.sin((i * Math.PI) / 4) * 0.33]}><boxGeometry args={[0.1, 0.08, 0.1]} /><meshStandardMaterial color={C.yellow} /></mesh>)}
        </Spin>
      </group>
      {range(Math.min(lvl, 4)).map((i) => <Crate key={i} x={-1.1} y={0} z={-0.5 + i * 0.35} s={0.28} c={C.purple} />)}
    </group>
  ),
  success: (lvl) => (
    <group>
      <Shed w={1.6} d={1.3} h={0.7 + lvl * 0.2} wall="#fff0f6" roof={C.pink} />
      <group position={[0, 1.2 + lvl * 0.2, 0.2]}>
        <Ball r={0.18} x={-0.12} c={C.pink} /><Ball r={0.18} x={0.12} c={C.pink} />
        <mesh position={[0, -0.17, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color={C.pink} /></mesh>
      </group>
      {range(lvl).map((i) => <Bush key={i} x={-0.9 + i * 0.45} z={0.95} c={i % 2 ? '#ff9ec4' : '#4e9e2f'} />)}
    </group>
  ),
  marketplace: (lvl) => (
    <group>
      <Blk w={1.8} h={0.12} d={1.8} c={C.grey} />
      <Blk w={0.7} h={0.5} d={0.6} x={-0.55} y={0.12} z={0.4} c={C.cream} />
      <Blk w={0.8} h={0.08} d={0.7} x={-0.55} y={0.62} z={0.4} c={C.red} />
      <group position={[0.35, 0.12, -0.2]} scale={0.8 + lvl * 0.12}>
        <Cyl r={0.22} h={1.1} c={C.white} />
        <mesh position={[0, 1.3, 0]} castShadow><coneGeometry args={[0.22, 0.45, 12]} /><meshStandardMaterial color={C.red} /></mesh>
        <Disc y={0.75} z={0.22} r={0.1} c={C.glassDark} ring={C.dark} />
        {range(3).map((i) => <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[0, 0.2, 0]}><boxGeometry args={[0.05, 0.4, 0.62]} /><meshStandardMaterial color={C.red} /></mesh>)}
      </group>
    </group>
  ),

  // Clothing
  cutting: (lvl) => (
    <group>
      <Blk w={2.0} h={0.8 + lvl * 0.08} d={1.4} c="#f2e9e4" />
      {range(Math.min(1 + lvl, 5)).map((i) => <Gable key={i} w={0.4} d={1.45} h={0.35} x={-0.8 + i * 0.4} y={0.8 + lvl * 0.08} c={C.steel} />)}
      <Cyl r={0.12} h={1.4} x={0.75} y={0} z={-0.45} c={C.red} />
      <Smoke x={0.75} y={1.5} z={-0.45} />
      <RollDoor w={0.8} h={0.6} x={-0.4} z={0.71} />
    </group>
  ),
  webshop: (lvl) => (
    <group>
      <Shed w={1.4} d={1.2} h={0.6 + lvl * 0.2} wall={C.white} roof={C.blue} />
      <Spin speed={0.8} y={1.2 + lvl * 0.2} z={0}>
        <Ball r={0.35} c={C.glassDark} />
        <Ball r={0.2} x={0.18} y={0.1} z={0.2} c={C.green} /><Ball r={0.15} x={-0.2} y={-0.1} z={0.22} c={C.green} />
      </Spin>
      <Blk w={0.06} h={0.25} d={0.06} y={0.72 + lvl * 0.2} c={C.dark} />
    </group>
  ),
  studio: (lvl) => (
    <group>
      <Blk w={1.6} h={0.9 + lvl * 0.15} d={1.3} c={C.glass} o={0.55} />
      <Blk w={1.7} h={0.12} d={1.4} y={0.9 + lvl * 0.15} c={C.white} />
      {range(Math.min(lvl, 4)).map((i) => <Person key={i} x={-0.5 + i * 0.33} z={0.1} c={[C.pink, C.purple, C.yellow, C.teal][i]} />)}
      <Spin speed={1} y={1.35 + lvl * 0.15}><mesh castShadow><octahedronGeometry args={[0.25]} /><meshStandardMaterial color={C.yellow} emissive="#ffd76a" emissiveIntensity={0.4} /></mesh></Spin>
    </group>
  ),
  supplier: (lvl) => (
    <group>
      {range(lvl + 1).map((i) => (
        <Container key={i} x={-0.35 + (i % 2) * 0.1} y={Math.floor(i / 2) * 0.45} z={(i % 2) * 0.5 - 0.25} c={[C.blue, C.red, C.green, C.orange, C.purple, C.teal][i]} />
      ))}
      <Blk w={0.5} h={0.55} d={0.5} x={0.75} z={0.5} c={C.cream} />
      <Blk w={0.55} h={0.08} d={0.55} x={0.75} y={0.55} z={0.5} c={C.yellow} />
    </group>
  ),
  warehouse: (lvl) => (
    <group>
      <Blk w={2.0} h={0.9} d={1.3} c="#f3ead8" />
      <Cyl r={0.68} h={2.02} x={0} y={0.9} rz={Math.PI / 2} c={C.steel} seg={10} />
      <RollDoor w={0.9} h={0.7} z={0.66} />
      {range(lvl).map((i) => <Crate key={i} x={1.25} y={(i % 2) * 0.32} z={0.5 - Math.floor(i / 2) * 0.35} />)}
      <group position={[-1.3, 0, 0.7]}>
        <Blk w={0.35} h={0.3} d={0.45} y={0.08} c={C.yellow} rad={0.05} />
        <Blk w={0.05} h={0.6} d={0.05} x={0.2} y={0.08} z={0.15} c={C.dark} />
        <Blk w={0.05} h={0.6} d={0.05} x={0.2} y={0.08} z={-0.15} c={C.dark} />
      </group>
    </group>
  ),

  // Restaurant
  kitchen: (lvl) => (
    <group>
      <Shed w={1.6} d={1.3} h={0.7 + lvl * 0.12} wall={C.cream} roof={C.red} />
      <Blk w={0.35} h={0.9} d={0.35} x={0.45} y={0.7 + lvl * 0.12} z={-0.3} c={C.steel} />
      <Smoke x={0.45} y={1.7 + lvl * 0.12} z={-0.3} />
      {range(Math.min(lvl, 3)).map((i) => <Smoke key={i} x={-0.4 + i * 0.3} y={1 + lvl * 0.12} z={-0.3} />)}
      <mesh position={[-0.35, 0.45, 0.68]} castShadow><coneGeometry args={[0.15, 0.35, 8]} /><meshStandardMaterial color={C.orange} emissive="#ff8a1f" emissiveIntensity={0.5} /></mesh>
    </group>
  ),
  delivery: (lvl) => (
    <group>
      <Shed w={1.3} d={1.1} h={0.75} wall={C.white} roof={C.orange} windows={false} />
      <RollDoor w={0.7} h={0.5} x={-0.2} z={0.56} />
      {range(lvl).map((i) => (
        <group key={i} position={[-0.9 + i * 0.45, 0, 1.05]}>
          <Blk w={0.12} h={0.3} d={0.45} y={0.08} c={i % 2 ? C.orange : C.red} rad={0.05} />
          <Crate y={0.35} z={-0.12} s={0.2} c={C.orange} />
          <Cyl r={0.08} h={0.05} y={0.08} z={0.2} rz={Math.PI / 2} c={C.dark} />
          <Cyl r={0.08} h={0.05} y={0.08} z={-0.2} rz={Math.PI / 2} c={C.dark} />
        </group>
      ))}
    </group>
  ),
  chefs: (lvl) => (
    <group>
      <Blk w={2.0} h={0.1} d={1.8} c={C.wood} />
      {range(4).map((i) => <Cyl key={i} r={0.04} h={0.9} x={i < 2 ? -0.9 : 0.9} y={0.1} z={i % 2 ? -0.8 : 0.8} c={C.woodDark} seg={6} />)}
      {range(5).map((i) => <Blk key={i} w={2.0} h={0.05} d={0.08} y={1.0} z={-0.8 + i * 0.4} c={C.woodDark} rad={0.01} />)}
      {range(lvl).map((i) => <Parasol key={i} x={-0.55 + (i % 3) * 0.55} z={-0.4 + Math.floor(i / 3) * 0.7} c={i % 2 ? C.yellow : C.red} />)}
    </group>
  ),
  fridge: (lvl) => (
    <group>
      <Blk w={1.3} h={0.8 + lvl * 0.12} d={1.1} c="#dff3ff" />
      <Blk w={1.4} h={0.1} d={1.2} y={0.8 + lvl * 0.12} c={C.blue} />
      <Blk w={0.45} h={0.65} d={0.06} x={0.25} z={0.56} c={C.steel} rad={0.03} />
      <group position={[-0.3, 0.55, 0.57]}>
        {range(3).map((i) => <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}><boxGeometry args={[0.36, 0.05, 0.02]} /><meshStandardMaterial color={C.blue} /></mesh>)}
      </group>
      {range(Math.min(lvl, 3)).map((i) => <Cyl key={i} r={0.15} h={0.12} x={-0.35 + i * 0.35} y={0.9 + lvl * 0.12} c={C.grey} />)}
    </group>
  ),
  truck: (lvl) => (
    <group>
      {range(Math.ceil(lvl / 2)).map((i) => (
        <group key={i} position={[0, 0, -0.4 + i * 1.0]} rotation={[0, 0.2, 0]}>
          <Blk w={1.3} h={0.7} d={0.62} y={0.15} c={[C.yellow, C.teal, C.pink][i]} rad={0.1} />
          <Blk w={0.7} h={0.3} d={0.05} y={0.45} z={0.32} c={C.dark} rad={0.02} />
          <Blk w={0.8} h={0.05} d={0.35} y={0.8} z={0.45} c={C.red} rad={0.02} />
          {[[-0.4, 0.3], [0.4, 0.3], [-0.4, -0.3], [0.4, -0.3]].map(([a, b], j) => <Cyl key={j} r={0.12} h={0.08} x={a} y={0.12} z={b} rx={Math.PI / 2} c={C.dark} />)}
        </group>
      ))}
    </group>
  ),

  // Fitness
  equipment: (lvl) => (
    <group>
      <Shed w={1.6} d={1.2} h={0.8 + lvl * 0.1} wall="#e4f7f8" roof={C.teal} />
      {range(lvl).map((i) => (
        <group key={i} position={[-0.9 + i * 0.4, 0.2, 0.95]}>
          <Blk w={0.3} h={0.05} d={0.05} c={C.dark} rad={0.02} />
          <Cyl r={0.09} h={0.06} x={-0.15} y={0.02} rz={Math.PI / 2} c={C.orange} />
          <Cyl r={0.09} h={0.06} x={0.15} y={0.02} rz={Math.PI / 2} c={C.orange} />
        </group>
      ))}
    </group>
  ),
  classes: (lvl) => (
    <group>
      <Blk w={1.7} h={0.9 + lvl * 0.1} d={1.3} c="#fff0f6" />
      <Blk w={1.4} h={0.6} d={0.06} y={0.15} z={0.66} c={C.glass} rad={0.03} />
      {range(Math.min(lvl + 1, 5)).map((i) => <Blk key={i} w={0.22} h={0.03} d={0.4} x={-0.5 + i * 0.26} y={0.02} z={0.35} c={[C.pink, C.purple, C.teal, C.yellow, C.orange][i]} rad={0.01} />)}
      <Blk w={1.8} h={0.12} d={1.4} y={0.9 + lvl * 0.1} c={C.pink} />
      <Bob y={1.45 + lvl * 0.1} z={0.1}>
        <Ball r={0.13} x={-0.15} c={C.purple} /><Blk w={0.05} h={0.45} d={0.05} x={-0.03} y={0} c={C.purple} />
        <Ball r={0.13} x={0.25} y={-0.05} c={C.purple} /><Blk w={0.05} h={0.45} d={0.05} x={0.37} y={-0.05} c={C.purple} />
        <Blk w={0.45} h={0.06} d={0.05} x={0.17} y={0.42} c={C.purple} />
      </Bob>
    </group>
  ),
  app: (lvl) => (
    <group>
      <Blk w={1.2} h={0.12} d={1.2} c={C.grey} />
      <Bob y={0.12} amp={0.04}>
        <Blk w={0.6} h={0.9 + lvl * 0.15} d={0.1} y={0.1} c={C.dark} rad={0.08} />
        <Blk w={0.48} h={0.75 + lvl * 0.15} d={0.02} y={0.17} z={0.06} c="#2fd0de" e="#2fd0de" rad={0.04} />
      </Bob>
      {range(Math.min(lvl, 3)).map((i) => (
        <mesh key={i} position={[0.55, 0.9 + lvl * 0.15, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <torusGeometry args={[0.15 + i * 0.12, 0.025, 6, 16, Math.PI / 2]} /><meshStandardMaterial color={C.teal} />
        </mesh>
      ))}
    </group>
  ),
  referral: (lvl) => (
    <group>
      <Cyl r={0.05} h={0.9} x={-0.5} c={C.dark} seg={6} />
      <Cyl r={0.05} h={0.9} x={0.5} c={C.dark} seg={6} />
      <Blk w={1.5} h={0.7} d={0.08} y={0.8} c={C.white} rad={0.04} />
      <group position={[0, 1.15, 0.06]}>
        <Ball r={0.13} x={-0.09} c={C.pink} /><Ball r={0.13} x={0.09} c={C.pink} />
        <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.2, 0.2, 0.05]} /><meshStandardMaterial color={C.pink} /></mesh>
      </group>
      {range(lvl).map((i) => <Person key={i} x={-0.7 + i * 0.35} z={0.7} c={[C.blue, C.pink, C.green, C.orange, C.purple][i]} />)}
    </group>
  ),
  pool: (lvl) => (
    <group>
      <Blk w={1.6 + lvl * 0.12} h={0.14} d={1.5} c={C.white} />
      <Blk w={1.3 + lvl * 0.12} h={0.02} d={1.2} y={0.13} c="#3ab6f0" e="#1f78d1" o={0.9} rad={0.01} />
      {range(lvl).map((i) => <Blk key={i} w={0.2} h={0.08} d={0.45} x={-0.8 + i * 0.4} y={0} z={1.05} c={i % 2 ? C.yellow : C.pink} rad={0.03} />)}
      <Parasol x={1.1 + lvl * 0.06} z={0.9} c={C.teal} />
      <Bob y={0.2} amp={0.03} speed={2}><mesh rotation={[Math.PI / 2, 0, 0]} position={[0.2, 0, 0.1]}><torusGeometry args={[0.13, 0.05, 8, 16]} /><meshStandardMaterial color={C.red} /></mesh></Bob>
    </group>
  ),

  // E-commerce
  robots: (lvl) => (
    <group>
      <Blk w={1.8} h={0.9} d={1.3} c="#f3ead8" />
      <Blk w={1.9} h={0.12} d={1.4} y={0.9} c={C.orange} />
      {range(Math.ceil(lvl / 2) + 1).map((i) => (
        <group key={i} position={[-0.6 + i * 0.6, 0, 1.0]}>
          <Cyl r={0.12} h={0.15} c={C.yellow} />
          <Spin speed={1 + i * 0.3} y={0.15}>
            <Blk w={0.08} h={0.45} d={0.08} c={C.orange} />
            <Blk w={0.45} h={0.08} d={0.08} x={0.2} y={0.42} c={C.orange} />
            <Crate x={0.42} y={0.3} s={0.12} />
          </Spin>
        </group>
      ))}
    </group>
  ),
  channels: (lvl) => (
    <group>
      {range(Math.min(lvl + 1, 5)).map((i) => (
        <group key={i} position={[-0.9 + (i % 3) * 0.9, 0, -0.4 + Math.floor(i / 3) * 1.0]}>
          <Blk w={0.7} h={0.4} d={0.5} c={C.cream} />
          <Cyl r={0.03} h={0.8} x={-0.32} z={0.22} c={C.dark} seg={6} />
          <Cyl r={0.03} h={0.8} x={0.32} z={0.22} c={C.dark} seg={6} />
          <Awning w={0.8} y={0.8} z={-0.1} a={[C.blue, C.green, C.purple, C.red, C.orange][i]} stripes={4} />
        </group>
      ))}
    </group>
  ),
  recs: (lvl) => (
    <group>
      <Shed w={1.5} d={1.2} h={0.8 + lvl * 0.15} wall={C.white} roof={C.purple} />
      <group position={[0.1, 0.95 + lvl * 0.15, 0]}>
        <Cyl r={0.05} h={0.3} c={C.dark} seg={6} />
        <Spin speed={0.4} y={0.3}><Cyl r={0.35} rt={0.08} h={0.12} rx={-0.9} c={C.white} /></Spin>
      </group>
      {range(lvl).map((i) => <Blink key={i} x={-0.6 + i * 0.28} y={0.35} z={0.62} c={i % 2 ? C.green : C.teal} />)}
    </group>
  ),
  freight: (lvl) => (
    <group>
      {range(lvl).map((i) => <Container key={i} x={-0.55} y={i * 0.45} z={0} c={[C.red, C.blue, C.green, C.orange, C.teal][i]} />)}
      <Blk w={0.12} h={2.4} d={0.12} x={0.65} z={-0.5} c={C.yellow} />
      <Blk w={0.12} h={2.4} d={0.12} x={0.65} z={0.5} c={C.yellow} />
      <Blk w={2.2} h={0.14} d={1.12} x={-0.1} y={2.4} c={C.yellow} />
      <Bob x={-0.6} y={1.6} amp={0.3} speed={0.8}><Blk w={0.3} h={0.15} d={0.3} c={C.dark} /></Bob>
    </group>
  ),
  ads: (lvl) => (
    <group>
      <Cyl r={0.1} h={1.0 + lvl * 0.35} c={C.steel} seg={8} />
      <Blk w={1.5} h={0.8} d={0.1} y={1.0 + lvl * 0.35} c={C.dark} rad={0.05} />
      <Blk w={1.35} h={0.66} d={0.02} y={1.07 + lvl * 0.35} z={0.06} c={C.orange} e="#ff8a1f" rad={0.03} />
      <group position={[0, 1.4 + lvl * 0.35, 0.08]}>
        <mesh rotation={[0, 0, -0.3]}><boxGeometry args={[0.12, 0.45, 0.02]} /><meshStandardMaterial color={C.white} /></mesh>
      </group>
    </group>
  ),

  // Automotive
  bay: (lvl) => (
    <group>
      <Blk w={1.9} h={1.2} d={1.4} c="#edf6e6" />
      <Blk w={2.0} h={0.12} d={1.5} y={1.2} c={C.green} />
      <Blk w={1.4} h={0.9} d={0.06} y={0} z={0.71} c={C.dark} rad={0.03} />
      <Bob y={0.05 + lvl * 0.06} z={0.3} amp={0.08} speed={0.7}>
        <Blk w={1.1} h={0.05} d={0.5} c={C.yellow} rad={0.02} />
        <Car y={0.05} c={[C.red, C.blue, C.teal, C.orange, C.purple][lvl - 1]} s={0.95} />
      </Bob>
    </group>
  ),
  battery: (lvl) => (
    <group>
      {range(Math.min(lvl + 1, 5)).map((i) => (
        <group key={i} position={[-0.8 + (i % 3) * 0.55, 0, -0.35 + Math.floor(i / 3) * 0.6]}>
          <Cyl r={0.2} h={0.6} c={C.green} />
          <Cyl r={0.08} h={0.1} y={0.6} c={C.steel} />
          <Blk w={0.12} h={0.2} d={0.02} y={0.25} z={0.2} c={C.yellow} e="#ffc633" rad={0.01} />
        </group>
      ))}
      {range(lvl).map((i) => (
        <group key={i} position={[0.9, 0, -0.6 + i * 0.35]}>
          <Blk w={0.18} h={0.6} d={0.15} c={C.white} rad={0.04} />
          <Blink x={0} y={0.5} z={0.09} c={C.green} />
        </group>
      ))}
    </group>
  ),
  lab: (lvl) => (
    <group>
      <Blk w={1.6} h={0.7 + lvl * 0.1} d={1.3} c={C.white} />
      <mesh position={[0, 0.7 + lvl * 0.1, 0]} castShadow>
        <sphereGeometry args={[0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={C.steel} />
      </mesh>
      <Blk w={0.12} h={0.6} d={0.3} y={0.8 + lvl * 0.1} z={0.35} ry={0} c={C.dark} />
      <Windows w={1.6} d={1.3} floors={1} y0={0.25} cols={3} sideCols={2} lit />
      <Blink x={0.6} y={1.1 + lvl * 0.1} z={0.3} c={C.teal} />
    </group>
  ),
  dealers: (lvl) => (
    <group>
      <Blk w={2.0} h={0.06} d={1.8} c={C.grey} />
      {range(lvl).map((i) => <Car key={i} x={-0.6 + (i % 3) * 0.6} y={0.06} z={-0.5 + Math.floor(i / 3) * 0.9} ry={0.6} c={[C.red, C.blue, C.yellow, C.green, C.purple][i]} s={0.8} />)}
      <Flag x={-1.0} z={0.9} c={C.red} />
      <Flag x={0.2} z={0.9} c={C.yellow} />
      <Flag x={1.0} z={0.9} c={C.blue} />
    </group>
  ),
  showroom: (lvl) => (
    <group>
      <Blk w={1.8} h={1.0 + lvl * 0.08} d={1.4} c={C.glass} o={0.45} />
      <Blk w={1.9} h={0.12} d={1.5} y={1.0 + lvl * 0.08} c={C.white} />
      <Cyl r={0.55} h={0.06} c={C.white} />
      <Spin speed={0.6} y={0.06}><Car c={C.red} s={0.9} /></Spin>
      <Lamp x={1.1} z={0.8} />
    </group>
  ),
};

export function UpgradeModel({ id, level }: { id: string; level: number }) {
  const model = UPGRADE_MODELS[id];
  return model ? <>{model(Math.max(1, Math.min(5, level)))}</> : null;
}

export const HAS_MODEL = (id: string) => id in UPGRADE_MODELS;
