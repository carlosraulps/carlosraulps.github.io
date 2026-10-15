import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { phothCalculations } from '../data/photh_calculations'

// Color helper for signed Bader net charge (retaining authentic physical convention)
export function getBaderColorThree(charge) {
  if (charge > 0.05) return '#c97b5d' // strong depletion (terracotta)
  if (charge > 0.00) return '#df9b7e' // mild depletion
  if (charge < -0.05) return '#1b4332' // strong accumulation (deep forest)
  if (charge < 0.00) return '#2d6a4f' // mild accumulation (emerald)
  return '#52796f' // neutral
}

// 3D Bond Cylinder connecting two points
function BondCylinder({
  start,
  end,
  bondData,
  isSelected,
  isHighlighted,
  isPeriodic = false,
  showLength,
  onClick,
  baseBondRadius = 0.032
}) {
  const [hovered, setHovered] = useState(false)

  const { position, quaternion, length } = useMemo(() => {
    const p1 = new THREE.Vector3(...start)
    const p2 = new THREE.Vector3(...end)
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(p2, p1)
    const l = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    )
    return { position: [mid.x, mid.y, mid.z], quaternion: quat, length: l }
  }, [start, end])

  const bondLengthVal = bondData?.length ?? length.toFixed(3)
  const cylRadius = isSelected
    ? baseBondRadius * 1.6
    : isHighlighted
    ? baseBondRadius * 1.35
    : hovered
    ? baseBondRadius * 1.25
    : isPeriodic
    ? baseBondRadius * 0.75
    : baseBondRadius

  return (
    <group position={position} quaternion={quaternion}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          if (onClick) onClick(bondData)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry
          args={[
            cylRadius,
            cylRadius,
            length,
            16
          ]}
        />
        <meshStandardMaterial
          color={
            isSelected
              ? '#ca8a04' // golden amber selection
              : isHighlighted
              ? '#1b4332'
              : hovered
              ? '#2d6a4f'
              : isPeriodic
              ? '#7d9e87'
              : '#889f8d'
          }
          metalness={0.4}
          roughness={0.25}
          transparent={isPeriodic}
          opacity={isPeriodic ? 0.75 : 1.0}
          emissive={
            isSelected
              ? '#eab308'
              : isHighlighted
              ? '#133c30'
              : hovered
              ? '#1b4332'
              : '#000000'
          }
          emissiveIntensity={isSelected ? 0.6 : isHighlighted ? 0.35 : hovered ? 0.25 : 0}
        />
      </mesh>
      {showLength && (
        <Html position={[0, 0, Math.max(0.08, baseBondRadius * 2.2)]} center distanceFactor={3.2} pointerEvents="none">
          <div
            className={`three-bond-badge ${isSelected ? 'selected' : ''} ${
              isHighlighted ? 'highlighted' : ''
            } ${isPeriodic ? 'periodic' : ''}`}
          >
            {bondLengthVal} Å
          </div>
        </Html>
      )}
    </group>
  )
}

// 3D Ghost Atom Sphere representing periodic boundary image site
function GhostAtomSphere({ atom, radius = 0.075 }) {
  return (
    <group position={atom.pos}>
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color="#9db7a2"
          transparent
          opacity={0.50}
          metalness={0.2}
          roughness={0.5}
        />
      </mesh>
    </group>
  )
}

// 3D Atom Sphere with picking, halos, and measurement markers
function AtomSphere({
  atom,
  isSelected,
  isEquivalent,
  isMeasureP1,
  isMeasureP2,
  charge,
  onSelect,
  showLabels,
  showWyckoffLabels,
  compactLabel,
  baseRadius = 0.125
}) {
  const [hovered, setHovered] = useState(false)
  const color = useMemo(() => getBaderColorThree(charge), [charge])

  const sphereRadius = isSelected
    ? baseRadius * 1.35
    : isEquivalent
    ? baseRadius * 1.20
    : hovered
    ? baseRadius * 1.15
    : baseRadius
  const haloR1 = baseRadius * 1.45
  const haloR2 = baseRadius * 1.80
  const equivHaloR1 = baseRadius * 1.25
  const equivHaloR2 = baseRadius * 1.55

  return (
    <group position={atom.pos}>
      {/* Atom core sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect(atom)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry
          args={[
            sphereRadius,
            24,
            24
          ]}
        />
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={0.22}
          emissive={
            isSelected
              ? color
              : isEquivalent
              ? '#2d6a4f'
              : hovered
              ? '#52796f'
              : '#000000'
          }
          emissiveIntensity={isSelected ? 0.65 : isEquivalent ? 0.45 : hovered ? 0.3 : 0}
        />
      </mesh>

      {/* Primary Selection Pulsing Halo */}
      {isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[haloR1, haloR2, 32]} />
          <meshBasicMaterial color="#c97b5d" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Symmetry-Equivalent Highlight Halo */}
      {isEquivalent && !isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[equivHaloR1, equivHaloR2, 32]} />
          <meshBasicMaterial color="#16a34a" side={THREE.DoubleSide} transparent opacity={0.75} />
        </mesh>
      )}

      {/* Measurement Point Markers (P1 = Terracotta, P2 = Forest Green) */}
      {isMeasureP1 && (
        <Html position={[0, 0, Math.max(0.24, baseRadius * 2.2)]} center distanceFactor={3.2} pointerEvents="none">
          <div className="three-measure-pin p1">
            <span>P₁</span>
          </div>
        </Html>
      )}
      {isMeasureP2 && (
        <Html position={[0, 0, Math.max(0.24, baseRadius * 2.2)]} center distanceFactor={3.2} pointerEvents="none">
          <div className="three-measure-pin p2">
            <span>P₂</span>
          </div>
        </Html>
      )}

      {/* Billboarding HTML Badge for site / index / Wyckoff */}
      {showLabels && !isMeasureP1 && !isMeasureP2 && (
        <Html position={[0, 0, Math.max(0.18, baseRadius * 1.8)]} center distanceFactor={3.5} pointerEvents="none">
          <div
            className={`three-atom-pill ${isSelected ? 'selected' : ''} ${
              isEquivalent ? 'equivalent' : ''
            } ${compactLabel ? 'compact' : ''}`}
          >
            <strong>{atom.site}</strong>
            {showWyckoffLabels && atom.wyckoff && <small>({atom.wyckoff})</small>}
            {isSelected && charge !== undefined && (
              <small>{charge >= 0 ? `+${charge.toFixed(3)}` : charge.toFixed(3)}e</small>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

// 3D Unit Cell Wireframe Box (Outer supercell box + internal unit cell division lines)
function UnitCellBox({ aVec, bVec, cVec, center, scale, na = 1, nb = 1 }) {
  const points = useMemo(() => {
    const v = (rx, ry, rz) => [
      (rx - center[0]) * scale,
      (ry - center[1]) * scale,
      (rz - center[2]) * scale
    ]

    const pts = []
    const p = (u, v_, w) => {
      const rx = u * aVec[0] + v_ * bVec[0] + w * cVec[0]
      const ry = u * aVec[1] + v_ * bVec[1] + w * cVec[1]
      const rz = u * aVec[2] + v_ * bVec[2] + w * cVec[2]
      return v(rx, ry, rz)
    }

    const p000 = p(0, 0, 0), p100 = p(1, 0, 0), p110 = p(1, 1, 0), p010 = p(0, 1, 0)
    const p001 = p(0, 0, 1), p101 = p(1, 0, 1), p111 = p(1, 1, 1), p011 = p(0, 1, 1)

    // 12 outer edges of the parallelepiped
    pts.push(
      p000, p100,  p100, p110,  p110, p010,  p010, p000,
      p001, p101,  p101, p111,  p111, p011,  p011, p001,
      p000, p001,  p100, p101,  p110, p111,  p010, p011
    )

    // Internal cell division lines if supercell (na > 1 or nb > 1)
    if (na > 1) {
      for (let i = 1; i < na; i++) {
        const u = i / na
        pts.push(p(u, 0, 0), p(u, 1, 0))
        pts.push(p(u, 0, 1), p(u, 1, 1))
        pts.push(p(u, 0, 0), p(u, 0, 1))
        pts.push(p(u, 1, 0), p(u, 1, 1))
      }
    }
    if (nb > 1) {
      for (let j = 1; j < nb; j++) {
        const w_v = j / nb
        pts.push(p(0, w_v, 0), p(1, w_v, 0))
        pts.push(p(0, w_v, 1), p(1, w_v, 1))
        pts.push(p(0, w_v, 0), p(0, w_v, 1))
        pts.push(p(1, w_v, 0), p(1, w_v, 1))
      }
    }

    return pts.map(pt => new THREE.Vector3(...pt))
  }, [aVec, bVec, cVec, center, scale, na, nb])

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [points])

  return (
    <lineSegments geometry={lineGeo}>
      <lineBasicMaterial
        color="#8fad94"
        transparent
        opacity={na > 1 || nb > 1 ? 0.50 : 0.75}
        dashSize={0.2}
        gapSize={0.1}
      />
    </lineSegments>
  )
}

// 3D Crystallographic Coordinate Axes at origin
function CrystallographicAxes({ uVecA, uVecB, center, scale }) {
  const origin = useMemo(() => [
    (0 - center[0]) * scale,
    (0 - center[1]) * scale,
    (0 - center[2]) * scale
  ], [center, scale])

  const axisALen = 0.85
  const axisBLen = 0.85

  const aDir = useMemo(() => {
    return new THREE.Vector3(uVecA[0], uVecA[1], 0).normalize().multiplyScalar(axisALen)
  }, [uVecA])

  const bDir = useMemo(() => {
    return new THREE.Vector3(uVecB[0], uVecB[1], 0).normalize().multiplyScalar(axisBLen)
  }, [uVecB])

  const endA = [origin[0] + aDir.x, origin[1] + aDir.y, origin[2]]
  const endB = [origin[0] + bDir.x, origin[1] + bDir.y, origin[2]]

  return (
    <group>
      {/* Axis a (Terracotta / Red) */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(self) =>
            self.setFromPoints([
              new THREE.Vector3(...origin),
              new THREE.Vector3(...endA)
            ])
          }
        />
        <lineBasicMaterial attach="material" color="#c97b5d" linewidth={2.5} />
      </line>
      <Html position={endA} center distanceFactor={3.5} pointerEvents="none">
        <div className="three-axis-label a">a</div>
      </Html>

      {/* Axis b (Forest Green) */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(self) =>
            self.setFromPoints([
              new THREE.Vector3(...origin),
              new THREE.Vector3(...endB)
            ])
          }
        />
        <lineBasicMaterial attach="material" color="#1b4332" linewidth={2.5} />
      </line>
      <Html position={endB} center distanceFactor={3.5} pointerEvents="none">
        <div className="three-axis-label b">b</div>
      </Html>
    </group>
  )
}

// 3D Planar Ring Polygon (interactive)
function RingPolygon3D({
  ring,
  isSelected,
  uVecA,
  uVecB,
  center,
  scale,
  onClick
}) {
  const [hovered, setHovered] = useState(false)

  const { shapeGeo, centroidPos } = useMemo(() => {
    if (!ring.vertices_frac || ring.vertices_frac.length < 3) return { shapeGeo: null, centroidPos: null }

    const pts2D = ring.vertices_frac.map(([u, v]) => {
      const rx = u * uVecA[0] + v * uVecB[0]
      const ry = u * uVecA[1] + v * uVecB[1]
      const x = (rx - center[0]) * scale
      const y = (ry - center[1]) * scale
      return new THREE.Vector2(x, y)
    })

    const shape = new THREE.Shape()
    shape.moveTo(pts2D[0].x, pts2D[0].y)
    for (let k = 1; k < pts2D.length; k++) {
      shape.lineTo(pts2D[k].x, pts2D[k].y)
    }
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)

    // Compute centroid for label
    let cX = 0, cY = 0
    pts2D.forEach(p => { cX += p.x; cY += p.y })
    cX /= pts2D.length
    cY /= pts2D.length

    return { shapeGeo: geo, centroidPos: [cX, cY, 0.015] }
  }, [ring.vertices_frac, uVecA, uVecB, center, scale])

  if (!shapeGeo) return null

  const color = ring.fc || (ring.size === 4 ? '#fef08a' : ring.size === 6 ? '#bbf7d0' : ring.size === 8 ? '#fbcfe8' : '#e0e7ff')
  const strokeColor = ring.ec || (ring.size === 4 ? '#ca8a04' : ring.size === 6 ? '#16a34a' : ring.size === 8 ? '#db2777' : '#4f46e5')

  return (
    <group>
      <mesh
        geometry={shapeGeo}
        position={[0, 0, isSelected ? 0.02 : 0.01]}
        onClick={(e) => {
          e.stopPropagation()
          if (onClick) onClick(ring)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.65 : hovered ? 0.45 : 0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Ring interior centroid tag */}
      {centroidPos && (
        <Html position={centroidPos} center distanceFactor={3.2} pointerEvents="none">
          <div
            className={`three-ring-tag size-${ring.size} ${isSelected ? 'selected' : ''}`}
            style={{ borderColor: strokeColor }}
          >
            {ring.label || `${ring.size}-Ring`}
          </div>
        </Html>
      )}
    </group>
  )
}

// 3D Distance Measurement Ruler Visualizer
function DistanceMeasurementVisualizer({ p1, p2, scale }) {
  const { start, end, mid, distanceStr, deltaStr } = useMemo(() => {
    if (!p1 || !p2) return {}
    const s = p1.pos
    const e = p2.pos
    const m = [
      (s[0] + e[0]) * 0.5,
      (s[1] + e[1]) * 0.5,
      (s[2] + e[2]) * 0.5 + 0.12
    ]
    const dReal = Math.hypot(e[0] - s[0], e[1] - s[1], e[2] - s[2]) / scale
    return {
      start: s,
      end: e,
      mid: m,
      distanceStr: `${dReal.toFixed(3)} Å`,
      deltaStr: `Δ(${Math.abs((e[0] - s[0]) / scale).toFixed(2)}, ${Math.abs((e[1] - s[1]) / scale).toFixed(2)})`
    }
  }, [p1, p2, scale])

  if (!p1 || !p2) return null

  return (
    <group>
      {/* Dashed measurement ruler line */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(self) =>
            self.setFromPoints([
              new THREE.Vector3(...start),
              new THREE.Vector3(...end)
            ])
          }
        />
        <lineDashedMaterial
          attach="material"
          color="#c97b5d"
          dashSize={0.12}
          gapSize={0.06}
          linewidth={2.5}
        />
      </line>

      {/* Floating measurement distance badge */}
      <Html position={mid} center distanceFactor={3.2} pointerEvents="none">
        <div className="three-measure-badge">
          <strong>d = {distanceStr}</strong>
          <small>{deltaStr}</small>
        </div>
      </Html>
    </group>
  )
}

// Camera Controller managing Top, Iso, Side, 2D plan-view, Fit, and Reset
function CameraController({
  cameraView,
  is2DMode,
  fitTrigger,
  resetTrigger,
  atoms3D,
  controlsRef,
  allotropeId,
  supercellKey
}) {
  const { camera } = useThree()

  const fitToStructure = (atoms) => {
    if (!atoms || atoms.length === 0) return

    const box = new THREE.Box3()
    atoms.forEach(a => box.expandByPoint(new THREE.Vector3(...a.pos)))
    const center = new THREE.Vector3()
    box.getCenter(center)
    const boxSize = new THREE.Vector3()
    box.getSize(boxSize)
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z, 2.0)

    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
    }

    if (cameraView === 'top' || is2DMode) {
      camera.position.set(center.x, center.y, center.z + maxDim * 1.95)
      camera.up.set(0, 1, 0)
    } else if (cameraView === 'side') {
      camera.position.set(center.x + maxDim * 2.2, center.y, center.z + 0.2)
      camera.up.set(0, 0, 1)
    } else {
      camera.position.set(center.x + maxDim * 1.35, center.y - maxDim * 1.65, center.z + maxDim * 1.4)
      camera.up.set(0, 0, 1)
    }
    camera.lookAt(center)
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  }

  // Reset Camera action
  useEffect(() => {
    if (resetTrigger === undefined || resetTrigger === null) return
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
    }
    if (cameraView === 'top' || is2DMode) {
      camera.position.set(0, 0, 6.2)
      camera.up.set(0, 1, 0)
    } else if (cameraView === 'side') {
      camera.position.set(6.2, 0, 0.4)
      camera.up.set(0, 0, 1)
    } else {
      camera.position.set(3.2, -4.2, 3.8)
      camera.up.set(0, 0, 1)
    }
    camera.lookAt(0, 0, 0)
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  }, [resetTrigger])

  // View orientation changes (Iso, Top, Side, 2D)
  useEffect(() => {
    if (!atoms3D || atoms3D.length === 0) return
    fitToStructure(atoms3D)
  }, [cameraView, is2DMode])

  // Explicit user Fit action
  useEffect(() => {
    if (!fitTrigger) return
    fitToStructure(atoms3D)
  }, [fitTrigger])

  // Auto-fit on allotrope change or supercell change
  const prevFramingRef = useRef('')
  useEffect(() => {
    const key = `${allotropeId}_${supercellKey}`
    if (atoms3D && atoms3D.length > 0 && prevFramingRef.current !== key) {
      prevFramingRef.current = key
      fitToStructure(atoms3D)
    }
  }, [allotropeId, supercellKey, atoms3D])

  return null
}

// Scene Root containing all crystallographic meshes
function LatticeScene({
  allotrope,
  selectionMode = 'atom',
  selectedObject,
  onSelectObject,
  selectedSite,
  onSelectSite,
  measurePoints,
  onMeasureSelect,
  strainA,
  strainB,
  strainGeom,
  currentBaderCharges = {},
  showBondLengths = false,
  showLabels = true,
  showWyckoffLabels = false,
  showHydrogen = false,
  showPeriodic = true,
  showUnitCell = true,
  showAxes = true,
  showRings = true,
  siteMap = {},
  supercell = [1, 1],
  atomScaleFactor = 1.0,
  onAtomsComputed
}) {
  const isPhoth = !allotrope || allotrope.id === 'photh_graphene' || allotrope.id === 'photh'
  const na = supercell[0] || 1
  const nb = supercell[1] || 1

  // Dynamic effective in-plane unit lattice constants (Å)
  const effA = strainA || (strainGeom ? strainGeom.a : Number(allotrope?.lattice?.a_2d || allotrope?.in_plane_lattice?.a || allotrope?.latticeA || allotrope?.lattice?.a || 7.141))
  const effB = strainB || (strainGeom ? strainGeom.b : Number(allotrope?.lattice?.b_2d || allotrope?.in_plane_lattice?.b || allotrope?.latticeB || allotrope?.lattice?.b || 3.984))

  // Authentic 3D lattice vectors from crystallographic 2D in-plane metrics
  const { uVecA, uVecB, uVecC, aVec, bVec, cVec, center, scale } = useMemo(() => {
    const angleDeg = Number(allotrope?.in_plane_lattice?.angle || allotrope?.lattice?.gamma || (allotrope?.crystal_system === 'Hexagonal' ? 120 : 90))
    const rad = (angleDeg * Math.PI) / 180
    const uA = [effA, 0, 0]
    const uB = [effB * Math.cos(rad), effB * Math.sin(rad), 0]
    const uC = [0, 0, 2.0]

    const sA = [na * uA[0], 0, 0]
    const sB = [nb * uB[0], nb * uB[1], 0]
    const sC = [0, 0, 2.0]

    const ctr = [
      0.5 * (sA[0] + sB[0] + sC[0]),
      0.5 * (sA[1] + sB[1] + sC[1]),
      0.5 * (sA[2] + sB[2] + sC[2])
    ]
    const spanX = Math.abs(sA[0]) + Math.abs(sB[0])
    const spanY = Math.abs(sA[1]) + Math.abs(sB[1])
    const s = Math.min(0.65, 3.8 / Math.max(spanX, spanY, 3.2))

    return { uVecA: uA, uVecB: uB, uVecC: uC, aVec: sA, bVec: sB, cVec: sC, center: ctr, scale: s }
  }, [allotrope, effA, effB, na, nb])

  // Proportional atom radius & bond cylinder radius ensuring zero overlap in dense cells/supercells
  const { baseRadius, baseBondRadius } = useMemo(() => {
    // 1.42 Å is typical C-C covalent bond distance. Bond in scene units is 1.42 * scale.
    // Base radius is ~0.25 of bond length in scene units, modulated by atomScaleFactor.
    const r = Math.max(0.024, Math.min(0.20, 0.25 * 1.42 * scale * (atomScaleFactor || 1.0)))
    const bR = Math.max(0.006, Math.min(0.038, 0.045 * 1.42 * scale * (atomScaleFactor || 1.0)))
    return { baseRadius: r, baseBondRadius: bR }
  }, [scale, atomScaleFactor])

  // Fractional coordinates for atoms in base unit cell
  const rawFractional = useMemo(() => {
    if (isPhoth) {
      const defaultFrac = [
        [0.1012, 0.4992, 0.0],
        [0.2215, 0.8116, 0.0],
        [0.2215, 0.1884, 0.0],
        [0.4089, 0.3255, 0.0],
        [0.4089, 0.6745, 0.0],
        [0.5814, 0.1718, 0.0],
        [0.5814, 0.8282, 0.0],
        [0.7874, 0.8055, 0.0],
        [0.7874, 0.1945, 0.0],
        [0.8985, 0.4990, 0.0]
      ]
      const sites = ['C1', 'C2', 'C2', 'C3', 'C3', 'C4', 'C4', 'C5', 'C5', 'C6']
      const wyckoffs = ['2d', '4f', '4f', '4f', '4f', '4f', '4f', '4f', '4f', '2d']
      return sites.map((site, idx) => {
        const frac = (strainGeom?.scaled_positions && strainGeom.scaled_positions[idx])
          ? [strainGeom.scaled_positions[idx][0], strainGeom.scaled_positions[idx][1], 0.0]
          : defaultFrac[idx]
        return {
          id: idx + 1,
          site,
          frac,
          wyckoff: wyckoffs[idx],
          element: 'C',
          cart: [frac[0] * effA, frac[1] * effB, 0.0]
        }
      })
    }

    if (allotrope?.atoms && allotrope.atoms.length > 0) {
      return allotrope.atoms.map((a, idx) => {
        const fc2d = a.frac_coords_2d || (a.frac_coords ? [a.frac_coords[0], a.frac_coords[1], a.frac_coords[2] || 0.0] : [0.5, 0.5, 0.0])
        const mappedSite = (siteMap && siteMap[idx]) ? siteMap[idx] : (a.wyckoff ? `C(${a.wyckoff})` : `C${idx + 1}`)
        return {
          id: a.index !== undefined ? a.index + 1 : idx + 1,
          site: mappedSite,
          frac: [fc2d[0], fc2d[1], fc2d[2] || 0.0],
          cart: a.cart_coords || [fc2d[0] * effA, fc2d[1] * effB, 0.0],
          wyckoff: a.wyckoff,
          element: a.element || 'C'
        }
      })
    }

    return [{ id: 1, site: 'C1', frac: [0.5, 0.5, 0.0], cart: [0, 0, 0], wyckoff: 'a', element: 'C' }]
  }, [allotrope, isPhoth, strainGeom, siteMap, effA, effB])

  // Authentic carbon atoms strictly positioned via lattice vectors across na x nb supercell
  const atoms3D = useMemo(() => {
    const list = []
    let atomIdx = 1
    for (let j = 0; j < nb; j++) {
      for (let i = 0; i < na; i++) {
        for (let k = 0; k < rawFractional.length; k++) {
          const a = rawFractional[k]
          const u = a.frac[0] + i
          const v = a.frac[1] + j
          const w = a.frac[2] || 0.0
          const rx = u * uVecA[0] + v * uVecB[0] + w * uVecC[0]
          const ry = u * uVecA[1] + v * uVecB[1] + w * uVecC[1]
          const rz = u * uVecA[2] + v * uVecB[2] + w * uVecC[2]
          const x = (rx - center[0]) * scale
          const y = (ry - center[1]) * scale
          const z = (rz - center[2]) * scale
          list.push({
            ...a,
            id: atomIdx++,
            baseId: a.id,
            cellI: i,
            cellJ: j,
            isPrimaryCell: (i === 0 && j === 0),
            pos: [x, y, z],
            key: `cell-${i}-${j}-${a.id}`
          })
        }
      }
    }
    return list
  }, [rawFractional, na, nb, uVecA, uVecB, uVecC, center, scale])

  useEffect(() => {
    if (onAtomsComputed) {
      onAtomsComputed(atoms3D)
    }
  }, [atoms3D, onAtomsComputed])

  // Covalent bonds (both intra-cell and periodic boundary closures)
  const { bondsList, ghostAtomsList } = useMemo(() => {
    if (isPhoth && na === 1 && nb === 1) {
      const bVals = strainGeom?.bonds || [1.512, 1.512, 1.447, 1.447, 1.384, 1.375, 1.375, 1.472, 1.472, 1.456, 1.456]
      const intracellPairs = [
        [1, 2, typeof bVals[0] === 'number' ? bVals[0].toFixed(3) : bVals[0]],
        [1, 3, typeof bVals[1] === 'number' ? bVals[1].toFixed(3) : bVals[1]],
        [2, 5, typeof bVals[2] === 'number' ? bVals[2].toFixed(3) : bVals[2]],
        [3, 4, typeof bVals[3] === 'number' ? bVals[3].toFixed(3) : bVals[3]],
        [4, 5, typeof bVals[4] === 'number' ? bVals[4].toFixed(3) : bVals[4]],
        [4, 6, typeof bVals[5] === 'number' ? bVals[5].toFixed(3) : bVals[5]],
        [5, 7, typeof bVals[6] === 'number' ? bVals[6].toFixed(3) : bVals[6]],
        [6, 9, typeof bVals[7] === 'number' ? bVals[7].toFixed(3) : bVals[7]],
        [7, 8, typeof bVals[8] === 'number' ? bVals[8].toFixed(3) : bVals[8]],
        [8, 10, typeof bVals[9] === 'number' ? bVals[9].toFixed(3) : bVals[9]],
        [9, 10, typeof bVals[10] === 'number' ? bVals[10].toFixed(3) : bVals[10]]
      ]

      const pBonds = intracellPairs.map(([idA, idB, len]) => {
        const aA = atoms3D.find(a => a.baseId === idA)
        const aB = atoms3D.find(a => a.baseId === idB)
        if (!aA || !aB) return null
        return {
          key: `b-${idA}-${idB}`,
          idA,
          idB,
          atomA: aA,
          atomB: aB,
          start: aA.pos,
          end: aB.pos,
          isPeriodic: false,
          length: len,
          offset: [0, 0]
        }
      }).filter(Boolean)
      return { bondsList: pBonds, ghostAtomsList: [] }
    }

    // Dynamic bonds considering periodic boundary conditions across supercell
    const bonds = []
    const ghostAtoms = []
    const ghostKeySet = new Set()

    // 1. Intra-supercell bonds
    for (let i = 0; i < atoms3D.length; i++) {
      const aA = atoms3D[i]
      for (let j = i + 1; j < atoms3D.length; j++) {
        const aB = atoms3D[j]
        const d = Math.hypot(aB.pos[0] - aA.pos[0], aB.pos[1] - aA.pos[1], aB.pos[2] - aA.pos[2]) / scale
        if (d >= 1.20 && d <= 1.76) {
          bonds.push({
            key: `b-${aA.key}-${aB.key}`,
            idA: aA.baseId,
            idB: aB.baseId,
            atomA: aA,
            atomB: aB,
            start: aA.pos,
            end: aB.pos,
            isPeriodic: false,
            length: d.toFixed(3),
            offset: [aB.cellI - aA.cellI, aB.cellJ - aA.cellJ]
          })
        }
      }
    }

    // 2. Periodic boundary ring closures across outer supercell vectors
    if (showPeriodic) {
      for (let i = 0; i < atoms3D.length; i++) {
        const aA = atoms3D[i]
        for (let j = 0; j < atoms3D.length; j++) {
          const aB = atoms3D[j]
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              if (di === 0 && dj === 0) continue

              const offset = [
                (di * aVec[0] + dj * bVec[0]) * scale,
                (di * aVec[1] + dj * bVec[1]) * scale,
                (di * aVec[2] + dj * bVec[2]) * scale
              ]
              const bPos = [aB.pos[0] + offset[0], aB.pos[1] + offset[1], aB.pos[2] + offset[2]]
              const d = Math.hypot(bPos[0] - aA.pos[0], bPos[1] - aA.pos[1], bPos[2] - aA.pos[2]) / scale

              if (d >= 1.20 && d <= 1.76) {
                bonds.push({
                  key: `b-pbc-${aA.key}-${aB.key}-${di}-${dj}`,
                  idA: aA.baseId,
                  idB: aB.baseId,
                  atomA: aA,
                  atomB: aB,
                  start: aA.pos,
                  end: bPos,
                  isPeriodic: true,
                  length: d.toFixed(3),
                  offset: [di, dj]
                })
                const gKey = `ghost-${aB.key}-${di}-${dj}`
                if (!ghostKeySet.has(gKey)) {
                  ghostKeySet.add(gKey)
                  ghostAtoms.push({
                    key: gKey,
                    id: `${aB.baseId}'`,
                    pos: bPos
                  })
                }
              }
            }
          }
        }
      }
    }

    return { bondsList: bonds, ghostAtomsList: ghostAtoms }
  }, [allotrope, isPhoth, atoms3D, aVec, bVec, scale, showPeriodic, na, nb, strainGeom])

  // Active chemisorbed hydrogen at C5 apex (Volmer site)
  const hydrogenAdatom = useMemo(() => {
    if (!showHydrogen) return null
    const c5Atom = atoms3D.find(a => (a.cellI === 0 && a.cellJ === 0 && a.baseId === 8)) || atoms3D.find(a => a.baseId === 8)
    if (!c5Atom) return null
    const hPos = [c5Atom.pos[0], c5Atom.pos[1], c5Atom.pos[2] + 1.11 * scale]
    return {
      c5Pos: c5Atom.pos,
      hPos
    }
  }, [showHydrogen, atoms3D, scale])

  // Elementary Rings for 3D display
  const ringsList = useMemo(() => {
    if (!showRings) return []
    if (isPhoth && phothCalculations.elementary_rings) {
      return phothCalculations.elementary_rings
    }
    return []
  }, [showRings, isPhoth])

  // Selection resolution helpers
  const isTargetSite = (site) => {
    if (!site) return false
    if (selectedObject?.type === 'atom') return selectedObject.site === site
    if (selectedObject?.type === 'orbit') return selectedObject.site === site
    return selectedSite === site
  }

  const isPrimaryAtom = (atom) => {
    if (selectedObject?.type === 'atom') {
      return selectedObject.atomId === atom.id
    }
    return false
  }

  const isBondSelected = (b) => {
    if (selectedObject?.type === 'bond') {
      return selectedObject.key === b.key
    }
    return false
  }

  const isBondHighlighted = (b) => {
    if (isBondSelected(b)) return true
    if (selectedObject?.type === 'atom') {
      return b.idA === selectedObject.baseId || b.idB === selectedObject.baseId
    }
    if (selectedObject?.type === 'orbit') {
      return b.atomA?.site === selectedObject.site || b.atomB?.site === selectedObject.site
    }
    if (selectedSite) {
      return b.atomA?.site === selectedSite || b.atomB?.site === selectedSite
    }
    return false
  }

  const isRingSelected = (r) => {
    if (selectedObject?.type === 'ring') {
      return selectedObject.id === r.id
    }
    return false
  }

  // Handle atom picking based on selection mode
  const handleAtomClick = (atom) => {
    if (selectionMode === 'measure') {
      if (onMeasureSelect) {
        onMeasureSelect(atom)
      }
      return
    }

    if (selectionMode === 'orbit') {
      const orbitObj = {
        type: 'orbit',
        site: atom.site,
        wyckoff: atom.wyckoff,
        mult: allotrope?.atoms?.filter(a => (a.wyckoff || '') === (atom.wyckoff || '')).length || 1,
        repAtom: atom
      }
      if (onSelectObject) onSelectObject(orbitObj)
      if (onSelectSite) onSelectSite(atom.site)
      return
    }

    // Default 'atom' mode
    const atomObj = {
      type: 'atom',
      atomId: atom.id,
      baseId: atom.baseId,
      site: atom.site,
      element: atom.element || 'C',
      frac: atom.frac,
      cart: atom.cart,
      cell: [atom.cellI, atom.cellJ],
      wyckoff: atom.wyckoff,
      pos: atom.pos
    }
    if (onSelectObject) onSelectObject(atomObj)
    if (onSelectSite) onSelectSite(atom.site)
  }

  // Handle bond picking
  const handleBondClick = (bond) => {
    const bondObj = {
      type: 'bond',
      key: bond.key,
      idA: bond.idA,
      idB: bond.idB,
      atomA: bond.atomA,
      atomB: bond.atomB,
      length: bond.length,
      isPeriodic: bond.isPeriodic,
      offset: bond.offset
    }
    if (onSelectObject) onSelectObject(bondObj)
  }

  // Handle ring picking
  const handleRingClick = (ring) => {
    const ringObj = {
      type: 'ring',
      id: ring.id,
      name: ring.name,
      label: ring.label,
      size: ring.size,
      area_A2: ring.area_A2,
      centroid_frac: ring.centroid_frac,
      vertices_frac: ring.vertices_frac,
      role: ring.sublabel || `${ring.size}-Member Cycle`
    }
    if (onSelectObject) onSelectObject(ringObj)
  }

  return (
    <>
      <ambientLight intensity={0.88} />
      <directionalLight position={[6, 12, 8]} intensity={1.25} />
      <directionalLight position={[-6, -6, -6]} intensity={0.4} />

      {/* Unit Cell Wireframe Box (Outer Box + Sub-cell divisions) */}
      {showUnitCell && (
        <UnitCellBox aVec={aVec} bVec={bVec} cVec={cVec} center={center} scale={scale} na={na} nb={nb} />
      )}

      {/* Crystallographic Coordinate Axes at origin */}
      {showAxes && (
        <CrystallographicAxes uVecA={uVecA} uVecB={uVecB} center={center} scale={scale} />
      )}

      {/* Elementary Ring Polygons (Translucent 3D Planar Shading) */}
      {ringsList.map(r => (
        <RingPolygon3D
          key={r.id}
          ring={r}
          isSelected={isRingSelected(r)}
          uVecA={uVecA}
          uVecB={uVecB}
          center={center}
          scale={scale}
          onClick={handleRingClick}
        />
      ))}

      {/* Bonds (Intra-cell and Periodic Boundary Closures) */}
      {bondsList.map(b => (
        <BondCylinder
          key={b.key}
          start={b.start}
          end={b.end}
          bondData={b}
          isSelected={isBondSelected(b)}
          isHighlighted={isBondHighlighted(b)}
          isPeriodic={b.isPeriodic}
          showLength={showBondLengths}
          onClick={handleBondClick}
          baseBondRadius={baseBondRadius}
        />
      ))}

      {/* Ghost Atoms completing rings across periodic boundaries */}
      {ghostAtomsList.map(ga => (
        <GhostAtomSphere key={ga.key} atom={ga} radius={baseRadius * 0.62} />
      ))}

      {/* Atoms */}
      {atoms3D.map(a => {
        const charge = currentBaderCharges[a.site] ?? 0
        const shouldShowLabel = showLabels && ((na === 1 && nb === 1) || a.isPrimaryCell || isTargetSite(a.site))
        const isSelected = isPrimaryAtom(a)
        const isEquiv = isTargetSite(a.site)
        const isP1 = measurePoints?.p1?.id === a.id
        const isP2 = measurePoints?.p2?.id === a.id

        return (
          <AtomSphere
            key={a.key}
            atom={a}
            isSelected={isSelected}
            isEquivalent={isEquiv}
            isMeasureP1={isP1}
            isMeasureP2={isP2}
            charge={charge}
            onSelect={handleAtomClick}
            showLabels={shouldShowLabel}
            showWyckoffLabels={showWyckoffLabels}
            compactLabel={showBondLengths}
            baseRadius={baseRadius}
          />
        )
      })}

      {/* Distance Measurement Line and Midpoint Badge */}
      {measurePoints?.p1 && measurePoints?.p2 && (
        <DistanceMeasurementVisualizer p1={measurePoints.p1} p2={measurePoints.p2} scale={scale} />
      )}

      {/* Chemisorbed Hydrogen Adatom (H*) */}
      {hydrogenAdatom && (
        <group>
          <BondCylinder
            start={hydrogenAdatom.c5Pos}
            end={hydrogenAdatom.hPos}
            bondData={{ length: '1.109' }}
            isHighlighted={true}
            showLength={showBondLengths}
          />
          <mesh position={hydrogenAdatom.hPos}>
            <sphereGeometry args={[0.08, 24, 24]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.6} roughness={0.2} />
          </mesh>
          <Html position={[hydrogenAdatom.hPos[0], hydrogenAdatom.hPos[1] + 0.16, hydrogenAdatom.hPos[2]]} center distanceFactor={3.5}>
            <div className="three-adatom-pill">
              H* (+0.011e)
            </div>
          </Html>
        </group>
      )}
    </>
  )
}

export const Interactive3DLattice = forwardRef(function Interactive3DLattice({
  allotrope,
  selectionMode = 'atom',
  selectedObject,
  onSelectObject,
  selectedSite,
  onSelectSite,
  measurePoints,
  onMeasureSelect,
  cameraView = 'iso',
  is2DMode = false,
  fitTrigger = 0,
  resetTrigger = 0,
  supercellDim = [1, 1],
  atomScaleFactor = 1.0,
  overlays = {
    unitCell: true,
    atomLabels: true,
    wyckoffLabels: false,
    rings: true,
    bondLengths: false,
    axes: true,
    hydrogen: false
  },
  strainA,
  strainB,
  strainGeom,
  currentBaderCharges = {},
  showBondLengths = false,
  showLabels = true,
  siteMap = {},
  onCaptureScreenshot
}, ref) {
  const controlsRef = useRef()
  const canvasRef = useRef()
  const [atomsList, setAtomsList] = useState([])

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      if (!canvasRef.current) return null
      const canvas = canvasRef.current.querySelector('canvas')
      if (!canvas) return null
      return canvas.toDataURL('image/png')
    },
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset()
      }
    }
  }))

  return (
    <div className="three-lattice-container" ref={canvasRef}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [3.2, -4.2, 3.8], fov: 45 }}
        style={{ width: '100%', height: '100%', background: '#fafaf6' }}
      >
        <CameraController
          cameraView={cameraView}
          is2DMode={is2DMode}
          fitTrigger={fitTrigger}
          resetTrigger={resetTrigger}
          atoms3D={atomsList}
          controlsRef={controlsRef}
          allotropeId={allotrope?.id}
          supercellKey={`${supercellDim[0]}x${supercellDim[1]}`}
        />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.6}
          maxDistance={18.0}
        />
        <LatticeScene
          allotrope={allotrope}
          selectionMode={selectionMode}
          selectedObject={selectedObject}
          onSelectObject={onSelectObject}
          selectedSite={selectedSite}
          onSelectSite={onSelectSite}
          measurePoints={measurePoints}
          onMeasureSelect={onMeasureSelect}
          strainA={strainA}
          strainB={strainB}
          strainGeom={strainGeom}
          currentBaderCharges={currentBaderCharges}
          showBondLengths={overlays?.bondLengths ?? showBondLengths}
          showLabels={overlays?.atomLabels ?? showLabels}
          showWyckoffLabels={overlays?.wyckoffLabels ?? false}
          showHydrogen={overlays?.hydrogen ?? false}
          showUnitCell={overlays?.unitCell ?? true}
          showAxes={overlays?.axes ?? true}
          showRings={overlays?.rings ?? true}
          showPeriodic={true}
          siteMap={siteMap}
          supercell={supercellDim}
          atomScaleFactor={atomScaleFactor}
          onAtomsComputed={setAtomsList}
        />
      </Canvas>
    </div>
  )
})
