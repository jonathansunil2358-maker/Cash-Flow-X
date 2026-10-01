import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace, type Group, type Mesh } from 'three';
import { Ball, Blk, C, Cyl, Mat } from './parts';

/** Island scenery that is not part of the business: landmarks, wildlife and the ferry. */

/** A striped lighthouse whose lamp sweeps a beam round the sea (brighter at night). */
export function Lighthouse({ x, z, night }: { x: number; z: number; night: boolean }) {
  const beam = useRef<Group>(null);
  useFrame(({ clock }) => { if (beam.current) beam.current.rotation.y = clock.elapsedTime * 0.9; });
  const bands = [C.white, C.red, C.white, C.red, C.white];
  return (
    <group position={[x, 0, z]}>
      <Cyl r={0.75} h={0.25} c={C.grey} seg={16} />
      {bands.map((c, i) => <Cyl key={i} r={0.55 - i * 0.05} rt={0.5 - i * 0.05} h={0.55} y={0.25 + i * 0.55} c={c} seg={16} />)}
      <Cyl r={0.48} h={0.08} y={3.0} c={C.dark} seg={16} />
      <Cyl r={0.3} h={0.45} y={3.08} c="#fff2b0" e={night ? '#ffe066' : undefined} seg={12} />
      <Cyl r={0.36} rt={0.05} h={0.35} y={3.53} c={C.red} seg={12} />
      <group ref={beam} position={[0, 3.3, 0]}>
        <mesh position={[1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.45, 3.2, 12, 1, true]} />
          <meshBasicMaterial color="#fff6c8" transparent opacity={night ? 0.35 : 0.12} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** "Welcome to …" billboard showing the company name and icon, drawn onto a canvas texture. */
export function Billboard({ x, z, name, icon }: { x: number; z: number; name: string; icon: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const draw = () => {
      if (cancelled) return;
      ctx.fillStyle = '#fff3dc';
      ctx.fillRect(0, 0, 512, 256);
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#4a2c17';
      ctx.strokeRect(7, 7, 498, 242);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 30, 58, 140, 140);
      ctx.fillStyle = '#7a4420';
      ctx.font = '32px "Lilita One", system-ui, sans-serif';
      ctx.fillText('Welcome to', 190, 100);
      ctx.fillStyle = '#3a2210';
      let size = 54;
      do { ctx.font = `${size}px "Lilita One", system-ui, sans-serif`; size -= 2; } while (ctx.measureText(name).width > 300 && size > 24);
      ctx.fillText(name, 190, 165);
      texture.needsUpdate = true;
    };
    img.onload = draw;
    img.src = icon;
    void document.fonts?.ready.then(draw);
    draw();
    return () => { cancelled = true; };
  }, [texture, name, icon]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 4, 0]}>
      {[-0.65, 0.65].map((dx) => <Blk key={dx} w={0.08} h={1.0} d={0.08} x={dx} c={C.woodDark} rad={0.02} />)}
      <Blk w={1.9} h={1.0} d={0.08} y={0.9} c={C.ink} rad={0.04} />
      <mesh position={[0, 1.4, 0.045]}>
        <planeGeometry args={[1.8, 0.9]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}

/** A small pond with lily pads and a duck paddling round it. */
export function Pond({ x, z, night }: { x: number; z: number; night: boolean }) {
  const duck = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!duck.current) return;
    const a = clock.elapsedTime * 0.35;
    duck.current.position.set(Math.cos(a) * 0.5, 0.04, Math.sin(a) * 0.4);
    duck.current.rotation.y = -a;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]}>
        <circleGeometry args={[1.0, 24]} /><meshStandardMaterial color="#e8dcc6" />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]}>
        <circleGeometry args={[0.85, 24]} /><meshStandardMaterial color={night ? '#2a5aa0' : '#5cc4f2'} />
      </mesh>
      {[[-0.4, 0.25], [0.35, -0.3]].map(([a, b], i) => (
        <mesh key={i} position={[a, 0.035, b]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.13, 10]} /><meshStandardMaterial color={C.green} /></mesh>
      ))}
      <group ref={duck}>
        <Ball r={0.1} c={C.white} />
        <Ball r={0.065} x={0.09} y={0.09} c={C.green} />
        <Blk w={0.06} h={0.02} d={0.04} x={0.16} y={0.08} c={C.orange} rad={0.005} />
      </group>
    </group>
  );
}

/** A red British phone box. */
export function PhoneBox({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 4, 0]}>
      <Blk w={0.42} h={0.95} d={0.42} c={C.red} rad={0.03} />
      <Blk w={0.46} h={0.08} d={0.46} y={0.95} c={C.red} rad={0.03} />
      <Blk w={0.28} h={0.5} d={0.02} y={0.25} z={0.215} c={C.glass} rad={0.01} />
      <Blk w={0.3} h={0.07} d={0.02} y={0.82} z={0.215} c={C.white} rad={0.01} />
    </group>
  );
}

/** A seagull circling overhead, flapping now and then. */
export function Gull({ r, y, speed, phase }: { r: number; y: number; speed: number; phase: number }) {
  const ref = useRef<Group>(null);
  const left = useRef<Mesh>(null);
  const right = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * r, y + Math.sin(t * 2) * 0.2, Math.sin(t) * r);
      ref.current.rotation.y = -t;
    }
    const flap = Math.sin(clock.elapsedTime * 7 + phase) * (Math.sin(t * 3) > 0 ? 0.6 : 0.1);
    if (left.current) left.current.rotation.x = flap;
    if (right.current) right.current.rotation.x = -flap;
  });
  return (
    <group ref={ref}>
      <mesh><capsuleGeometry args={[0.05, 0.16, 3, 6]} /><Mat c={C.white} /></mesh>
      <mesh ref={left} position={[0, 0, 0.14]}><boxGeometry args={[0.1, 0.015, 0.26]} /><Mat c={C.white} /></mesh>
      <mesh ref={right} position={[0, 0, -0.14]}><boxGeometry args={[0.1, 0.015, 0.26]} /><Mat c={C.white} /></mesh>
    </group>
  );
}

/** Someone sitting on the jetty with a fishing rod. */
export function Fisher({ x, z }: { x: number; z: number }) {
  const line = useRef<Mesh>(null);
  useFrame(({ clock }) => { if (line.current) line.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.04; });
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow><capsuleGeometry args={[0.13, 0.12, 4, 8]} /><Mat c={C.blue} /></mesh>
      <mesh position={[0, 0.48, 0]} castShadow><sphereGeometry args={[0.12, 10, 8]} /><Mat c={C.skin} /></mesh>
      <Blk w={0.18} h={0.06} d={0.2} y={0.56} c={C.yellow} rad={0.03} />
      <mesh ref={line} position={[0, 0.3, 0.45]} rotation={[0.9, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 5]} /><Mat c={C.woodDark} />
      </mesh>
    </group>
  );
}

/** The little passenger ferry that brings customers to the jetty. Sits on the waterline. */
export function Ferry({ night }: { night: boolean }) {
  return (
    <group position={[0, -0.78, 0]}>
      <Blk w={1.5} h={0.32} d={0.7} c={C.white} rad={0.14} />
      <Blk w={1.52} h={0.08} d={0.72} y={0.06} c={C.blue} rad={0.03} />
      <Blk w={0.75} h={0.38} d={0.55} x={-0.15} y={0.32} c={C.cream} rad={0.06} />
      <Blk w={0.7} h={0.14} d={0.57} x={-0.15} y={0.46} c={night ? '#ffe9a8' : C.glass} e={night ? '#ffe9a8' : undefined} rad={0.03} />
      <Blk w={0.85} h={0.06} d={0.62} x={-0.15} y={0.7} c={C.blue} rad={0.03} />
      <Cyl r={0.05} h={0.3} x={-0.35} y={0.76} c={C.dark} seg={6} />
    </group>
  );
}

/** A helipad with a little helicopter, a reward for a company worth millions. */
export function Helipad({ x, z, night }: { x: number; z: number; night: boolean }) {
  const rotor = useRef<Group>(null);
  const heli = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rotor.current) rotor.current.rotation.y = t * 22;
    if (heli.current) heli.current.position.y = 0.18 + Math.sin(t * 1.6) * 0.03;
  });
  return (
    <group position={[x, 0, z]}>
      <Cyl r={0.9} h={0.05} c={night ? '#4a5059' : '#6b717c'} seg={28} />
      <Blk w={0.08} h={0.02} d={0.5} x={-0.18} y={0.05} c="#fff8ec" rad={0.005} />
      <Blk w={0.08} h={0.02} d={0.5} x={0.18} y={0.05} c="#fff8ec" rad={0.005} />
      <Blk w={0.36} h={0.02} d={0.07} y={0.05} c="#fff8ec" rad={0.005} />
      {[0, 1, 2, 3].map((i) => <Ball key={i} r={0.04} x={Math.cos(i * Math.PI / 2 + 0.78) * 0.85} y={0.07} z={Math.sin(i * Math.PI / 2 + 0.78) * 0.85} c={C.orange} e={night ? C.orange : undefined} ns />)}
      <group ref={heli} position={[0, 0.18, 0]}>
        <Blk w={0.34} h={0.2} d={0.2} y={0.05} c={C.red} rad={0.08} />
        <Blk w={0.5} h={0.05} d={0.05} x={-0.38} y={0.12} c={C.red} rad={0.02} />
        <Blk w={0.18} h={0.1} d={0.16} x={0.1} y={0.1} c={C.glass} rad={0.04} />
        <group ref={rotor} position={[0, 0.3, 0]}>
          <Blk w={0.9} h={0.015} d={0.05} c="#2b2f36" rad={0.005} />
          <Blk w={0.05} h={0.015} d={0.9} c="#2b2f36" rad={0.005} />
        </group>
      </group>
    </group>
  );
}
