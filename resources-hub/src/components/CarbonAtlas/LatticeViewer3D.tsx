import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { AllotropeData, AllotropeAtom } from '../../types';

interface LatticeViewer3DProps {
  allotrope: AllotropeData;
  selectedAtom: AllotropeAtom | null;
  onSelectAtom: (atom: AllotropeAtom) => void;
  autoRotate: boolean;
  reducedMotion: boolean;
}

// Signed Henkelman Bader net charge color mapping
function getBaderColor(charge: number): string {
  if (charge > 0.04) return '#C85A32'; // Strong depletion (Terracotta)
  if (charge > 0.01) return '#DF9B7E'; // Mild depletion
  if (charge < -0.04) return '#173D31'; // Strong accumulation (Deep Forest)
  if (charge < -0.01) return '#2D6A4F'; // Mild accumulation
  return '#4E8062'; // Neutral (Sage)
}

function BondCylinder({ start, end, isHighlighted }: { start: [number, number, number]; end: [number, number, number]; isHighlighted: boolean }) {
  const { position, quaternion, length } = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { position: [mid.x, mid.y, mid.z] as [number, number, number], quaternion: quat, length: len };
  }, [start, end]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[isHighlighted ? 0.048 : 0.032, isHighlighted ? 0.048 : 0.032, length, 16]} />
        <meshStandardMaterial
          color={isHighlighted ? '#173D31' : '#8FA899'}
          roughness={0.35}
          metalness={0.2}
          emissive={isHighlighted ? '#173D31' : '#000000'}
          emissiveIntensity={isHighlighted ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
}

function AtomSphere({
  atom,
  isSelected,
  onSelect,
}: {
  atom: AllotropeAtom;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const color = useMemo(() => getBaderColor(atom.bader_charge), [atom.bader_charge]);

  return (
    <group position={atom.cart_coords}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[isSelected ? 0.17 : hovered ? 0.15 : 0.12, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.3}
          emissive={isSelected ? color : hovered ? '#4E8062' : '#000000'}
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.35 : 0}
        />
      </mesh>

      {/* 3D Pulsing selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.27, 32]} />
          <meshBasicMaterial color="#C85A32" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Billboarding HTML Tooltip on Hover */}
      {(hovered || isSelected) && (
        <Html position={[0, 0.26, 0]} center distanceFactor={8} pointerEvents="none">
          <div className={`three-atom-pill ${isSelected ? 'selected' : ''}`}>
            <span>{atom.site.split(' ')[0]}</span>
            <span className="text-[9px] opacity-75 ml-1">
              {atom.bader_charge > 0 ? `+${atom.bader_charge.toFixed(3)}` : atom.bader_charge.toFixed(3)} e
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

export function LatticeViewer3D({
  allotrope,
  selectedAtom,
  onSelectAtom,
  autoRotate,
  reducedMotion,
}: LatticeViewer3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Center the lattice coordinates around [0, 0, 0]
  const centeredAtoms = useMemo(() => {
    if (!allotrope.atoms.length) return [];
    const xs = allotrope.atoms.map((a) => a.cart_coords[0]);
    const ys = allotrope.atoms.map((a) => a.cart_coords[1]);
    const zs = allotrope.atoms.map((a) => a.cart_coords[2]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;

    return allotrope.atoms.map((a) => ({
      ...a,
      cart_coords: [
        a.cart_coords[0] - cx,
        a.cart_coords[1] - cy,
        a.cart_coords[2] - cz,
      ] as [number, number, number],
    }));
  }, [allotrope]);

  const centeredBonds = useMemo(() => {
    if (!allotrope.atoms.length) return [];
    const xs = allotrope.atoms.map((a) => a.cart_coords[0]);
    const ys = allotrope.atoms.map((a) => a.cart_coords[1]);
    const zs = allotrope.atoms.map((a) => a.cart_coords[2]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;

    return allotrope.bonds.map((b) => ({
      ...b,
      start: [b.start[0] - cx, b.start[1] - cy, b.start[2] - cz] as [number, number, number],
      end: [b.end[0] - cx, b.end[1] - cy, b.end[2] - cz] as [number, number, number],
    }));
  }, [allotrope]);

  // Gentle idle rotation unless reduced motion is active
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate && !reducedMotion) {
      groupRef.current.rotation.z += delta * 0.12;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 8, 5]} intensity={1.2} />
      <directionalLight position={[-6, -4, -3]} intensity={0.4} color="#E4EBDF" />

      <group ref={groupRef} rotation={[-Math.PI / 6, 0, 0]}>
        {/* Render Bonds */}
        {centeredBonds.map((bond, i) => (
          <BondCylinder
            key={`bond-${i}`}
            start={bond.start}
            end={bond.end}
            isHighlighted={false}
          />
        ))}

        {/* Render Atoms */}
        {centeredAtoms.map((atom, i) => (
          <AtomSphere
            key={`atom-${i}`}
            atom={atom}
            isSelected={selectedAtom?.site === allotrope.atoms[i]?.site}
            onSelect={() => onSelectAtom(allotrope.atoms[i])}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3.0}
        maxDistance={8.5}
        makeDefault
      />
    </>
  );
}
