import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { Float, Line, OrbitControls } from '@react-three/drei'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  ArrowDownRight, ArrowRight, Atom, Check, ChevronDown, CircleHelp,
  Download, ExternalLink, FileDown, Filter, FlaskConical, Grid2X2, Layers3,
  Search, SlidersHorizontal, Sparkles, Upload, X, Scale, LayoutGrid,
  Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import 'katex/dist/katex.min.css'
import { allotropes as seedAllotropes, benchmark, ringChoices, bondingChoices } from './data/allotropes'
import { masterCatalog, classifySymmetryFamily, SYMMETRY_FAMILIES } from './store/allotropesStore'
import { AbInitioLab } from './components/AbInitioLab'
import { StructureInspector } from './components/StructureInspector'
import { StructureComparisonModal } from './components/StructureComparisonModal'
import { MachineLearningStudio } from './components/MachineLearningStudio'
import { BibliographyExplorer } from './components/BibliographyExplorer'
import { Methodology } from './components/Methodology'
import { SupercellExportDrawer } from './components/SupercellExportDrawer'
import { AllotropeSubmissionModal } from './components/AllotropeSubmissionModal'
import { WorkspaceErrorBoundary } from './components/WorkspaceErrorBoundary'
import {
  MathTex,
  ScientificFormula,
  formatGiraoSymbol,
  isNamedAllotrope,
  getGiraoNotation,
} from './components/ScientificFormula'
import { generateSupercellExport } from './utils/supercellGenerator'
import {
  BONDING_FILTER_CHOICES,
  matchBondCharacterFilter,
  matchUniformityFilter,
  getStructureBondingBadge,
  extractStructureBondStats,
  getStructureBondingClass,
} from './utils/bondingLogic'
import {
  BONDING_THRESHOLDS,
  BOND_LENGTH_LABELS,
} from './constants/bondingThresholds'
import './styles.css'


export {
  MathTex,
  ScientificFormula,
  formatGiraoSymbol,
  isNamedAllotrope,
  getGiraoNotation,
}

const fmt = (value) => Number(value).toFixed(3)

function CarbonMark({ className = '' }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.25" opacity=".72">
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const x = 32 + Math.cos(a) * 20, y = 32 + Math.sin(a) * 20
        const b = a + Math.PI / 3, x2 = 32 + Math.cos(b) * 20, y2 = 32 + Math.sin(b) * 20
        return <line key={i} x1={x} y1={y} x2={x2} y2={y2} />
      })}
      <path d="M14.7 22L32 12L49.3 22V42L32 52L14.7 42Z M14.7 22L32 32L49.3 22 M32 32V52 M14.7 42L32 32L49.3 42" />
    </g>
    {[ [32,12],[49.3,22],[49.3,42],[32,52],[14.7,42],[14.7,22],[32,32] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.9" fill="currentColor" />)}
  </svg>
}

function buildLattice(item) {
  // 1. Primary: Use real pymatgen-derived visual mesh if available
  if (item?.visual_mesh?.atoms && item.visual_mesh.atoms.length > 0) {
    const rawAtoms = item.visual_mesh.atoms
    const rawBonds = item.visual_mesh.bonds || []

    const xs = rawAtoms.map(a => a.position[0])
    const ys = rawAtoms.map(a => a.position[1])
    const zs = rawAtoms.map(a => a.position[2])
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    const spanZ = Math.max(...zs) - Math.min(...zs)

    // Standardize 2D sheet normal strictly to Z (monolayer in X-Y plane facing camera at [0, 0, 8.5])
    const reoriented = rawAtoms.map(a => {
      const [x, y, z] = a.position
      if (spanY < 0.3 && spanZ > 1.0) {
        // Normal is Y (vacuum along Y): map X-Z to X-Y
        return { ...a, pos: [x, z, y] }
      }
      if (spanX < 0.3 && spanY > 1.0) {
        // Normal is X (vacuum along X): map Y-Z to X-Y
        return { ...a, pos: [y, z, x] }
      }
      return { ...a, pos: [x, y, z] }
    })

    const rxs = reoriented.map(a => a.pos[0])
    const rys = reoriented.map(a => a.pos[1])
    const rzs = reoriented.map(a => a.pos[2])
    const center = [
      (Math.min(...rxs) + Math.max(...rxs)) / 2,
      (Math.min(...rys) + Math.max(...rys)) / 2,
      (Math.min(...rzs) + Math.max(...rzs)) / 2
    ]

    let maxR = 0.1
    reoriented.forEach(a => {
      const r = Math.hypot(a.pos[0] - center[0], a.pos[1] - center[1], a.pos[2] - center[2])
      if (r > maxR) maxR = r
    })
    const scaleFactor = 2.45 / Math.max(0.6, maxR)

    const atoms = reoriented.map(a => ({
      id: a.id,
      position: [
        (a.pos[0] - center[0]) * scaleFactor,
        (a.pos[1] - center[1]) * scaleFactor,
        (a.pos[2] - center[2]) * scaleFactor
      ],
      highlight: (a.id % 6) === 0,
      element: a.element || 'C'
    }))

    return { atoms, bonds: rawBonds }
  }

  // 2. Secondary: Unit cell coordinates centered at origin
  if (item?.atoms && item.atoms.length > 0) {
    const rawAtoms = item.atoms
    const rawBonds = item.bonds || []

    const xs = rawAtoms.map(a => a.cart_coords?.[0] || 0)
    const ys = rawAtoms.map(a => a.cart_coords?.[1] || 0)
    const zs = rawAtoms.map(a => a.cart_coords?.[2] || 0)
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    const spanZ = Math.max(...zs) - Math.min(...zs)

    const reoriented = rawAtoms.map((a, idx) => {
      const x = a.cart_coords?.[0] || 0
      const y = a.cart_coords?.[1] || 0
      const z = a.cart_coords?.[2] || 0
      if (spanY < 0.3 && spanZ > 1.0) {
        return { idx, pos: [x, z, y] }
      }
      if (spanX < 0.3 && spanY > 1.0) {
        return { idx, pos: [y, z, x] }
      }
      return { idx, pos: [x, y, z] }
    })

    const rxs = reoriented.map(a => a.pos[0])
    const rys = reoriented.map(a => a.pos[1])
    const rzs = reoriented.map(a => a.pos[2])
    const center = [
      (Math.min(...rxs) + Math.max(...rxs)) / 2,
      (Math.min(...rys) + Math.max(...rys)) / 2,
      (Math.min(...rzs) + Math.max(...rzs)) / 2
    ]

    let maxR = 0.1
    reoriented.forEach(a => {
      const r = Math.hypot(a.pos[0] - center[0], a.pos[1] - center[1], a.pos[2] - center[2])
      if (r > maxR) maxR = r
    })
    const scaleFactor = 2.45 / Math.max(0.6, maxR)
    const atoms = reoriented.map(a => ({
      id: a.idx,
      position: [
        (a.pos[0] - center[0]) * scaleFactor,
        (a.pos[1] - center[1]) * scaleFactor,
        (a.pos[2] - center[2]) * scaleFactor
      ],
      highlight: (a.idx % 4) === 0,
      element: 'C'
    }))
    return { atoms, bonds: rawBonds }
  }

  // 3. Fallback
  return { atoms: [], bonds: [] }
}

function LatticeModel({ item, hero = false, reducedMotion = false }) {
  const { atoms, bonds } = useMemo(() => buildLattice(item), [item?.id, item?.code, item?.visual_mesh])
  return <Float speed={reducedMotion ? 0 : 0.55} rotationIntensity={reducedMotion ? 0 : hero ? 0.12 : 0.035} floatIntensity={reducedMotion ? 0 : hero ? 0.22 : 0.04}>
    <group rotation={hero ? [-0.08, 0, -0.08] : [-0.14, 0.18, 0]}>
      {hero ? (
        <>
          <mesh rotation={[0, 0, 0]} position={[0, 0, -0.16]}>
            <torusGeometry args={[3.08, 0.006, 5, 128]} />
            <meshBasicMaterial color="#d9ee8f" transparent opacity={0.35} />
          </mesh>
          <mesh rotation={[0, 0, 0]} position={[0, 0, -0.18]}>
            <torusGeometry args={[3.34, 0.004, 5, 128]} />
            <meshBasicMaterial color="#9fc7a5" transparent opacity={0.15} />
          </mesh>
        </>
      ) : (
        <mesh rotation={[0, 0, 0]} position={[0, 0, -0.12]}>
          <torusGeometry args={[1.95, 0.005, 5, 128]} />
          <meshBasicMaterial color="#68b88e" transparent opacity={0.22} />
        </mesh>
      )}
      {bonds.map(([a, b], i) => atoms[a] && atoms[b] && <Line
        key={`bond-${i}`}
        points={[atoms[a].position, atoms[b].position]}
        color={hero ? '#b5d7ad' : '#7ec299'}
        lineWidth={hero ? 1.45 : 2.2}
        transparent
        opacity={hero ? 0.72 : 0.9}
      />)}
      {atoms.map((atom) => <mesh key={`atom-${atom.id}`} position={atom.position}>
        <sphereGeometry args={[atom.highlight ? (hero ? 0.072 : 0.105) : (hero ? 0.052 : 0.082), 22, 22]} />
        <meshStandardMaterial
          color={atom.highlight ? '#d9ee8f' : hero ? '#bcd8bf' : '#94d6a8'}
          emissive={atom.highlight ? '#a9c978' : hero ? '#315943' : '#336e4b'}
          emissiveIntensity={atom.highlight ? 0.45 : 0.28}
          roughness={0.24}
          metalness={0.15}
        />
      </mesh>)}
    </group>
  </Float>
}

function hasWebGL() {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

class LatticeErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err) {
    console.warn('[CarbonLattice3D] WebGL or 3D render failed, falling back to 2D vector lattice:', err)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function CarbonLattice3D({ item, hero = false }) {
  const reducedMotion = useReducedMotion()
  const canWebGL = useMemo(() => hasWebGL(), [])

  if (!canWebGL) {
    return (
      <div className={`lattice-3d-wrap ${hero ? 'lattice-3d-hero' : 'lattice-3d-inspector'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MiniStructure item={item} large={!hero} />
      </div>
    )
  }

  return (
    <div className={`lattice-3d-wrap ${hero ? 'lattice-3d-hero' : 'lattice-3d-inspector'}`} aria-label="Interactive schematic carbon lattice. Drag to rotate and scroll to zoom.">
      <LatticeErrorBoundary fallback={
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MiniStructure item={item} large={!hero} />
        </div>
      }>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, hero ? 9.4 : 7.2], fov: 42 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          onCreated={({ gl }) => { gl.setClearColor('#000000', 0) }}
        >
          <ambientLight intensity={hero ? 1.7 : 1.3} />
          <directionalLight position={[4, 5, 6]} intensity={hero ? 2.2 : 1.8} color="#f2f3dc" />
          <pointLight position={[-3, -2, 3]} intensity={hero ? 1.2 : 0.8} color="#c0e0a7" />
          <LatticeModel item={item} hero={hero} reducedMotion={Boolean(reducedMotion)} />
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={3.5}
            maxDistance={12}
            autoRotate={!reducedMotion}
            autoRotateSpeed={hero ? 0.42 : 0.55}
          />
        </Canvas>
      </LatticeErrorBoundary>
    </div>
  )
}

function MiniStructure({ item, large = false, showMirrors = false, showRotations = false }) {
  // Deliberately schematic: it expresses the selected taxonomy, not recovered atomic coordinates.
  const radius = large ? 74 : 40
  const center = large ? 120 : 66
  const ringN = item?.polygonTypes?.length || 3
  const outerN = Math.max(6, Math.min(12, 5 + (item?.polygonCount || 6) % 7))
  const pts = Array.from({length: outerN}, (_,i)=> {
    const a = (Math.PI*2*i/outerN)-Math.PI/2
    return [center + Math.cos(a)*radius, center + Math.sin(a)*radius]
  })
  return <svg viewBox={large ? '0 0 240 240' : '0 0 132 132'} className="w-full h-full" role="img" aria-label="Schematic topology diagram">
    <defs><radialGradient id="atomFill"><stop stopColor="#eff5d8"/><stop offset="1" stopColor="#64917b"/></radialGradient></defs>
    <circle cx={center} cy={center} r={radius+18} fill="none" stroke="#a9bba9" strokeDasharray="2 5" opacity=".7"/>
    <polygon points={pts.map(p=>p.join(',')).join(' ')} fill="#e4ebdc" fillOpacity=".65" stroke="#245341" strokeWidth={large?2:1.3}/>
    {pts.map(([x,y],i)=><React.Fragment key={i}>
      <line x1={x} y1={y} x2={center} y2={center} stroke="#91a995" strokeWidth=".75" strokeDasharray="2 3" />
      <circle cx={x} cy={y} r={large?4:2.4} fill="url(#atomFill)" stroke="#1f4a3a" strokeWidth=".8" />
    </React.Fragment>)}
    {large && showMirrors && <g stroke="#b47d5f" strokeWidth="1" strokeDasharray="4 4" opacity=".75"><line x1={center} y1="12" x2={center} y2="228"/><line x1="12" y1={center} x2="228" y2={center}/><line x1="43" y1="43" x2="197" y2="197"/><line x1="43" y1="197" x2="197" y2="43"/></g>}
    {large && showRotations && <g fill="#b47d5f" stroke="#f0f1e8" strokeWidth="1"><circle cx={center} cy={center} r="4"/><circle cx="52" cy="52" r="3"/><circle cx="188" cy="52" r="3"/><circle cx="52" cy="188" r="3"/><circle cx="188" cy="188" r="3"/></g>}
    <circle cx={center} cy={center} r={large?8:4.5} fill="#d9ee8f" stroke="#1f4a3a" strokeWidth="1.25" />
    {Array.from({length:ringN},(_,i)=>{
      const a=(i/ringN)*Math.PI*2-Math.PI/2
      const x=center+Math.cos(a)*radius*.48, y=center+Math.sin(a)*radius*.48
      return <circle key={i} cx={x} cy={y} r={large?3:1.8} fill="#245341" />
    })}
  </svg>
}

function downloadBlob(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

async function exportStructure(item, format, scale) {
  const numScale = Number(scale) || 1
  // 1. First try downloading directly from FastAPI backend if available
  try {
    const slug = item.id || item.originalId || item.code
    const res = await fetch(`/api/structures/${slug}/export?format=${format}&scale=${numScale}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disp = res.headers.get('content-disposition')
      let filename = `${slug.toLowerCase()}_${numScale}x${numScale}.${format === 'poscar' ? 'vasp' : format === 'qe' ? 'pwi' : format}`
      if (disp && disp.includes('filename=')) {
        const m = disp.match(/filename="?([^"]+)"?/)
        if (m) filename = m[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return
    }
  } catch (err) {
    // API server offline; proceed to authentic client-side crystallographic generator
  }

  // 2. Client-side generator using authentic DFT crystallography
  try {
    const exp = generateSupercellExport(item, format, numScale)
    downloadBlob(exp.filename, exp.content, exp.mime)
  } catch (genErr) {
    console.error('Supercell export error:', genErr)
  }
}


function RegularPolygonIcon({ n, active, size = 32 }) {
  const radius = size * 0.42
  const cx = size / 2
  const cy = size / 2

  let startAngle = -Math.PI / 2
  if (n === 4) {
    startAngle = -Math.PI / 4
  } else if (n % 2 === 0) {
    startAngle = -Math.PI / 2 + Math.PI / n
  }

  const pts = []
  for (let i = 0; i < n; i++) {
    const angle = startAngle + (2 * Math.PI * i) / n
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  const isTwoDigit = n >= 10

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="polygon-svg-icon" aria-hidden="true">
      <polygon points={pts.join(' ')} className="polygon-shape" />
      <text
        x={cx}
        y={cy + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className={`polygon-text ${isTwoDigit ? 'two-digit' : ''}`}
      >
        {n}
      </text>
    </svg>
  )
}

function BravaisUnitCellIcon({ id, symbol }) {
  const w = 44, h = 30
  const cx = w / 2, cy = h / 2
  let points = ''
  if (id === 'hexagonal') {
    // 2D Hexagonal unit cell rhombus (60°/120° in-plane angle, |a| = |b|)
    points = `${cx - 15},${cy + 8.5} ${cx + 5},${cy + 8.5} ${cx + 15},${cy - 8.5} ${cx - 5},${cy - 8.5}`
  } else if (id === 'square') {
    // 2D Square / Tetragonal representation (|a| = |b|, 90°)
    points = `${cx - 9},${cy - 9} ${cx + 9},${cy - 9} ${cx + 9},${cy + 9} ${cx - 9},${cy + 9}`
  } else if (id === 'rectangular') {
    // 2D Rectangular (|a| ≠ |b|, 90°)
    points = `${cx - 14},${cy - 8} ${cx + 14},${cy - 8} ${cx + 14},${cy + 8} ${cx - 14},${cy + 8}`
  } else {
    // 2D Oblique (|a| ≠ |b|, γ ≠ 90°)
    points = `${cx - 16},${cy + 8} ${cx + 6},${cy + 8} ${cx + 16},${cy - 8} ${cx - 6},${cy - 8}`
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="bravais-cell-svg" aria-hidden="true">
      <polygon points={points} className="bravais-cell-shape" />
      <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="central" className="bravais-cell-text">
        {symbol}
      </text>
    </svg>
  )
}

const SYMMETRY_FILTER_CHOICES = [
  { id: 'hexagonal', label: 'Hexagonal', symbol: 'h', description: '2D Hexagonal lattice (h, γ=120°)' },
  { id: 'square', label: 'Square / Tetragonal', symbol: 't', description: '2D Square / Tetragonal representation (t, a=b, γ=90°)' },
  { id: 'rectangular', label: 'Rectangular', symbol: 'r', description: '2D Rectangular lattice (r, a≠b, γ=90°)' },
  { id: 'oblique', label: 'Oblique', symbol: 'o', description: '2D Oblique lattice (o, a≠b, γ≠90°)' },
]

const BOND_FILTER_CHOICES = [
  {
    id: 'double',
    symbol: 'C=C',
    title: 'Localized olefinic double bonds (C=C, ≤ 1.375 Å)',
  },
  {
    id: 'delocalized',
    symbol: 'C⋯C',
    title: 'Resonant aromatic π-electron bonds (C⋯C, 1.380–1.450 Å)',
  },
  {
    id: 'single',
    symbol: 'C–C',
    title: 'Covalent single σ-bonds (C–C, ≥ 1.455 Å)',
  },
]

function App() {
  const [allotropes, setAllotropes] = useState(masterCatalog)
  const [activeWorkspace, setActiveWorkspace] = useState('catalog')
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false)
  const [exportDrawerAllotrope, setExportDrawerAllotrope] = useState(null)
  const [selectedId, setSelectedId] = useState('photh_graphene')
  const [query, setQuery] = useState('')
  const [activeRings, setActiveRings] = useState([])
  const [activeSystems, setActiveSystems] = useState([])
  const [activeBonds, setActiveBonds] = useState([])
  const [requireUniform, setRequireUniform] = useState(false)
  const [underBenchmark, setUnderBenchmark] = useState(false)
  const [maxEnergyCutoff, setMaxEnergyCutoff] = useState(1.500)
  const [collapsedSections, setCollapsedSections] = useState({
    polygon: false,
    energy: false,
    bonding: false,
    bravais: false,
  })
  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const [canonicalOnly, setCanonicalOnly] = useState(true)
  const [sort, setSort] = useState('energy')
  const [visibleCount, setVisibleCount] = useState(12)
  const [scale, setScale] = useState('2')
  const [activeExport, setActiveExport] = useState('cif')
  const [showInspector, setShowInspector] = useState(true)
  const [symmetryGroup, setSymmetryGroup] = useState('p6mm')
  const [showMirrors, setShowMirrors] = useState(true)
  const [showRotations, setShowRotations] = useState(true)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [viewerMode, setViewerMode] = useState('3d')
  const [workspaceMode, setWorkspaceMode] = useState('browse')
  const [inspectorExpanded, setInspectorExpanded] = useState(false)
  const [filterSidebarCollapsed, setFilterSidebarCollapsed] = useState(false)
  const [compareIds, setCompareIds] = useState([])
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false)

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const clearCompare = () => setCompareIds([])

  const compareItems = useMemo(() => {
    return compareIds.map(id => allotropes.find(a => a.id === id)).filter(Boolean)
  }, [compareIds, allotropes])

  const importRef = useRef(null)
  const pageRef = useRef(null)
  const reduceMotion = useReducedMotion()

  // Hash-based workspace navigation synchronization
  useEffect(() => {
    const handleHash = () => {
      const hash = (window.location.hash || '').toLowerCase()
      if (hash === '#ab-initio-lab' || hash === '#ab-initio' || hash === '#lab' || hash === '#ab_initio') {
        setActiveWorkspace('lab')
      } else if (hash === '#ml-studio' || hash === '#ml' || hash === '#predict-outcomes' || hash === '#predict') {
        setActiveWorkspace('ml')
      } else if (hash === '#bibliography-explorer' || hash === '#bibliography' || hash === '#bib') {
        setActiveWorkspace('bibliography')
      } else if (hash === '#method' || hash === '#methodology') {
        setActiveWorkspace('methodology')
      } else if (hash === '#explore' || hash === '#catalog' || hash === '#top' || hash === '') {
        setActiveWorkspace('catalog')
      } else {
        setActiveWorkspace('catalog')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const switchWorkspace = (ws, hash) => {
    setActiveWorkspace(ws)
    if (hash) {
      window.history.pushState(null, '', hash)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (reduceMotion || !pageRef.current) return undefined
    gsap.registerPlugin(ScrollTrigger)
    const context = gsap.context(() => {
      gsap.utils.toArray('[data-scroll-reveal]').forEach((element) => {
        gsap.fromTo(element,
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.78, ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true } }
        )
      })
    }, pageRef)
    return () => context.revert()
  }, [reduceMotion, activeWorkspace])

  const matchesCrystalSystem = (item, sysFilter) => {
    return classifySymmetryFamily(item) === sysFilter
  }

  const selected = allotropes.find(item=>item.id===selectedId || item.code===selectedId || item.originalId===selectedId) || allotropes[0]
  const filtered = useMemo(() => {
    let result = allotropes.filter(item => {
      const aliasText = Array.isArray(item.aliases) ? item.aliases.join(' ') : ''
      const text = `${item.id} ${item.code || ''} ${item.name || ''} ${item.literatureName || ''} ${item.symbol || ''} ${item.system || ''} ${item.spaceGroup || ''} ${item.space_group_symbol || ''} ${aliasText}`.toLowerCase()
      const matchText = text.includes(query.toLowerCase())
      const matchRings = activeRings.length === 0 || activeRings.every(r=>item.polygonTypes.includes(r))
      const matchBenchmark = (!underBenchmark || item.energy < benchmark) && (maxEnergyCutoff >= 1.49 ? true : item.energy <= maxEnergyCutoff + 0.001)
      const matchCanonical = !canonicalOnly || item.isCanonical !== false
      const matchSystem = activeSystems.length === 0 || activeSystems.some(sys => matchesCrystalSystem(item, sys))
      const matchBonds = matchBondCharacterFilter(item, activeBonds, 0.0)
      const matchUniform = matchUniformityFilter(item, requireUniform)
      return matchText && matchRings && matchBenchmark && matchCanonical && matchSystem && matchBonds && matchUniform
    })
    result = [...result].sort((a,b)=>sort==='energy'?a.energy-b.energy:sort==='name'?a.id.localeCompare(b.id):b.energy-a.energy)
    return result
  }, [allotropes, query, activeRings, activeSystems, activeBonds, requireUniform, underBenchmark, maxEnergyCutoff, canonicalOnly, sort])

  // Real-time cohort metrics for live filter feedback
  const candidatePool = useMemo(() => {
    return canonicalOnly ? allotropes.filter(a => a.isCanonical !== false) : allotropes
  }, [allotropes, canonicalOnly])

  const canonicalCount = useMemo(() => {
    return allotropes.filter(a => a.isCanonical !== false).length
  }, [allotropes])

  const belowBenchmarkCount = useMemo(() => {
    return candidatePool.filter(a => a.energy < benchmark).length
  }, [candidatePool])

  const availableRings = useMemo(() => {
    const set = new Set(ringChoices)
    for (const a of allotropes) {
      if (Array.isArray(a.polygonTypes)) {
        a.polygonTypes.forEach(r => set.add(r))
      }
    }
    return Array.from(set).sort((a, b) => a - b)
  }, [allotropes])

  const ringCounts = useMemo(() => {
    const counts = {}
    for (const r of availableRings) {
      counts[r] = candidatePool.filter(item => item.polygonTypes && item.polygonTypes.includes(r)).length
    }
    return counts
  }, [availableRings, candidatePool])

  const symmetryCounts = useMemo(() => {
    const counts = { hexagonal: 0, square: 0, rectangular: 0, oblique: 0 }
    for (const item of candidatePool) {
      const fam = classifySymmetryFamily(item)
      if (counts[fam] !== undefined) counts[fam]++
    }
    return counts
  }, [candidatePool])

  const uniformResonantCount = useMemo(() => {
    return candidatePool.filter(a => {
      const stats = extractStructureBondStats(a)
      return getStructureBondingClass(stats).isUniformResonant
    }).length
  }, [candidatePool])

  const bondTypeCounts = useMemo(() => {
    const counts = { double: 0, delocalized: 0, single: 0, triple: 0 }
    for (const item of candidatePool) {
      const stats = extractStructureBondStats(item)
      if (stats.doubleCount > 0) counts.double++
      if (stats.aromaticCount > 0) counts.delocalized++
      if (stats.singleCount > 0) counts.single++
      if (stats.tripleCount > 0) counts.triple++
    }
    return counts
  }, [candidatePool])

  const activeFilterCount = useMemo(() => {
    return (
      activeRings.length +
      activeSystems.length +
      activeBonds.length +
      (underBenchmark ? 1 : 0) +
      (maxEnergyCutoff < 1.49 ? 1 : 0) +
      (requireUniform ? 1 : 0)
    )
  }, [activeRings, activeSystems, activeBonds, underBenchmark, maxEnergyCutoff, requireUniform])

  const activeFilterChips = useMemo(() => {
    const chips = []
    if (query.trim()) {
      chips.push({ id: 'query', label: `Search: "${query.trim()}"`, onRemove: () => { setQuery(''); setVisibleCount(12); } })
    }
    for (const r of activeRings) {
      chips.push({ id: `ring-${r}`, label: `${r}-gon`, onRemove: () => toggleRing(r) })
    }
    if (underBenchmark) {
      chips.push({ id: 'biphenylene', label: 'ΔE < 0.456 eV', onRemove: () => { setUnderBenchmark(false); setMaxEnergyCutoff(1.500); setVisibleCount(12); } })
    } else if (maxEnergyCutoff < 1.49) {
      chips.push({ id: 'cutoff', label: `ΔE ≤ ${maxEnergyCutoff.toFixed(2)} eV`, onRemove: () => { setMaxEnergyCutoff(1.500); setVisibleCount(12); } })
    }
    if (requireUniform) {
      chips.push({ id: 'uniform', label: 'Uniform Resonant', onRemove: () => { setRequireUniform(false); setVisibleCount(12); } })
    }
    for (const bId of activeBonds) {
      const b = BONDING_FILTER_CHOICES.find(x => x.id === bId)
      chips.push({ id: `bond-${bId}`, label: b ? b.shortLabel : bId, onRemove: () => toggleBond(bId) })
    }
    for (const sId of activeSystems) {
      const s = SYMMETRY_FILTER_CHOICES.find(x => x.id === sId)
      chips.push({ id: `sys-${sId}`, label: s ? s.label : sId, onRemove: () => toggleSystem(sId) })
    }
    return chips
  }, [query, activeRings, underBenchmark, maxEnergyCutoff, requireUniform, activeBonds, activeSystems])

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if(!file) return
    try {
      const text = await file.text()
      const lines = text.trim().split(/\r?\n/).filter(Boolean)
      const headers = lines[0].split(',').map(s=>s.trim().toLowerCase())
      const idIndex = headers.indexOf('id'), energyIndex = headers.indexOf('energy')
      if(energyIndex < 0) throw new Error('CSV needs a column named energy.')
      const imported = new Map()
      lines.slice(1).forEach((line, rowIndex) => {
        const row = line.split(',').map(value => value.trim())
        const csvId = idIndex >= 0 ? row[idIndex] : allotropes[rowIndex]?.id
        const val = Number(row[energyIndex])
        if (csvId && Number.isFinite(val) && allotropes.some(item => item.id === csvId)) imported.set(csvId, val)
      })
      if (imported.size === 0) throw new Error('No matching rows found. Use columns id,energy with IDs such as G-01.')
      setAllotropes(allotropes.map(item => imported.has(item.id) ? { ...item, energy: imported.get(item.id), energyIsDemo: false } : item))
      setImportMessage(`Loaded ${imported.size} energy value(s). Confirm the source, method, and units before scientific use.`)
    } catch(error) { setImportMessage(error.message || 'Could not read this CSV.') }
    event.target.value=''
  }

  const toggleRing = (n) => { setVisibleCount(12); setActiveRings(prev=>prev.includes(n)?prev.filter(x=>x!==n):[...prev,n]) }
  const toggleSystem = (sys) => { setVisibleCount(12); setActiveSystems(prev=>prev.includes(sys)?prev.filter(x=>x!==sys):[...prev,sys]) }
  const toggleBond = (bId) => { setVisibleCount(12); setActiveBonds(prev=>prev.includes(bId)?prev.filter(x=>x!==bId):[...prev,bId]) }
  const resetFilters = () => {
    setQuery('')
    setActiveRings([])
    setActiveSystems([])
    setActiveBonds([])
    setRequireUniform(false)
    setUnderBenchmark(false)
    setMaxEnergyCutoff(1.500)
    setVisibleCount(12)
  }

  return <div ref={pageRef} className="min-h-screen bg-paper text-ink selection:bg-lime selection:text-forest">
    <motion.header className="site-header" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
      <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); switchWorkspace('catalog', '#explore'); }} aria-label="Carbon Atlas home">
        <span className="brand-mark"><CarbonMark/></span>
        <span className="brand-word">carbon<span>atlas</span><small>2D SCIENTIFIC DATABASE</small></span>
      </a>
      <nav className="desktop-nav">
        <button
          type="button"
          className={`nav-tab ${activeWorkspace === 'catalog' ? 'active' : ''}`}
          onClick={() => switchWorkspace('catalog', '#explore')}
        >
          Catalog Index
        </button>
        {activeWorkspace === 'lab' && (
          <button
            type="button"
            className="nav-tab active"
            onClick={() => switchWorkspace('lab', '#ab-initio-lab')}
          >
            Ab Initio Database
          </button>
        )}
        <button
          type="button"
          className={`nav-tab ${activeWorkspace === 'methodology' ? 'active' : ''}`}
          onClick={() => switchWorkspace('methodology', '#method')}
        >
          Methodology
        </button>
        <button
          type="button"
          className={`nav-tab ${activeWorkspace === 'bibliography' ? 'active' : ''}`}
          onClick={() => switchWorkspace('bibliography', '#bibliography-explorer')}
        >
          Bibliography
        </button>
        <button
          type="button"
          className={`nav-tab ${activeWorkspace === 'ml' ? 'active' : ''}`}
          onClick={() => switchWorkspace('ml', '#ml-studio')}
        >
          Predict Outcomes
        </button>
      </nav>
      <div className="header-actions">
        <button className="nav-import" onClick={()=>setIsSubmissionModalOpen(true)}><FileDown size={16}/> Import</button>
        <button className="menu-button" onClick={()=>setMobileFilters(!mobileFilters)} aria-label="Toggle filters"><Filter size={18}/></button>
      </div>
      <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport}/>
    </motion.header>

    <main id="top">
      <WorkspaceErrorBoundary
        activeWorkspace={activeWorkspace}
        onReset={() => switchWorkspace('catalog', '#explore')}
      >
        <div key={activeWorkspace} className="workspace-active-layer">
            {activeWorkspace === 'catalog' && (
              <div className="workspace-catalog-wrap">
                <section className="hero-section">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.78, delay: 0.12, ease: "easeOut" }}>
          <div className="eyebrow"><span className="eyebrow-line"/> THE GEOMETRY OF CARBON <span className="eyebrow-count">VOL. 01 / 053 CANONICAL</span></div>
          <h1>One element.<br/><em>In<span className="hero-kerning-f">f</span>inite</em> architectures.</h1>
          <p className="hero-lede">A literature-linked scientific database mapping geometric and topological descriptors of 2D sp² networks to computed thermodynamic stability.</p>
          <div className="hero-buttons">
            <a href="#explore" className="button-primary" onClick={(e)=>{e.preventDefault();document.getElementById('explore')?.scrollIntoView({behavior:'smooth'});window.history.pushState(null,'','#explore')}}>Explore the atlas <ArrowDownRight size={17}/></a>
            <a href="#ml-studio" className="button-text">Predict Outcomes <ArrowRight size={16}/></a>
          </div>
          <div className="hero-note"><span className="hero-note-icon"><Atom size={20}/></span><span><strong>Topology meets machine learning</strong><small>53 unique canonical networks · 8 duplicate aliases resolved.</small></span></div>
        </motion.div>
        <motion.div className="hero-art" initial={{ opacity: 0, scale: 0.975 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.22, ease: "easeOut" }}>
          <div className="art-topline">
            <span>FIG. 01</span>
            <div className="art-center-girao" title={`Girão Classification: ${getGiraoNotation(selected)}`}>
              <span className="art-girao-prefix">GIRÃO:</span>
              <strong className="art-girao-value"><ScientificFormula text={getGiraoNotation(selected)} /></strong>
            </div>
            <span>sp² NETWORK STUDY</span>
          </div>
          <div className="art-lattice"><CarbonLattice3D item={selected} hero/></div>
          <div className="art-stamp"><span>CARBON<br/>SYSTEMS</span><CarbonMark/></div>
          <div className="art-bottom-bar">
            <div className="art-bottom-left">
              <span className="art-bottom-kicker">VOL. 01 · {selected.system || '2D Monolayer'}</span>
              <strong className="art-bottom-name">
                {isNamedAllotrope(selected) ? (
                  selected.name
                ) : (
                  <ScientificFormula text={selected.symbol || formatGiraoSymbol(selected.id)} />
                )}
              </strong>
            </div>
            <div className="art-bottom-right">
              <span className="art-bottom-coords">
                {selected.latticeA && selected.latticeB
                  ? `a=${Number(selected.latticeA).toFixed(3)} Å · b=${Number(selected.latticeB).toFixed(3)} Å`
                  : 'a=2.468 Å · b=2.468 Å'}
              </span>
              <span className="art-bottom-sg">{selected.spaceGroup || 'P6/mmm (#191)'}</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section data-scroll-reveal className="metric-strip" aria-label="Explorer at a glance">
        <div className="metric">
          <span className="metric-label">CANONICAL ALLOTROPES</span>
          <strong>53 <small>unique (61 total)</small></strong>
          <span className="metric-foot">8 duplicate allotropes identified</span>
        </div>
        <div className="metric">
          <span className="metric-label">REFERENCE GROUND STATE</span>
          <strong>Pristine Graphene</strong>
          <span className="metric-foot"><MathTex math="\Delta E = 0.000\text{ eV / atom}" /> by definition</span>
        </div>
        <div className="metric">
          <span className="metric-label">SYNTHETIC BENCHMARK</span>
          <strong>0.456 <small>eV / atom</small></strong>
          <span className="metric-foot">Biphenylene network frontier (<MathTex math="0.456\text{ eV}" />)</span>
        </div>
        <div className="metric metric-open">
          <span className="metric-label">PLANE ORIENTATION</span>
          <strong>Strictly z-Normal</strong>
          <a href="#ml-studio">Explore ML Studio <ArrowRight size={14}/></a>
        </div>
      </section>


      <section id="explore" className="explorer-section" data-scroll-reveal>
        <header className="materials-workbench-header">
          <div className="workbench-title-row">
            <div className="workbench-title-group">
              <h2 className="workbench-title">Materials Index</h2>
              <div className="workbench-meta-strip">
                <span className="meta-stat"><strong>{canonicalCount}</strong> canonical structures</span>
                <span className="meta-sep">·</span>
                <span className="meta-stat"><strong>{allotropes.length}</strong> catalog entries</span>
                <span className="meta-sep">·</span>
                <span className="meta-stat"><MathTex math="\Delta E" /> relative to graphene</span>
                {underBenchmark && (
                  <>
                    <span className="meta-sep">·</span>
                    <span className="meta-badge-benchmark">Sub-biphenylene (&lt;0.456 eV/atom)</span>
                  </>
                )}
              </div>
            </div>

            <div className="workbench-controls-group">
              {/* Workspace mode: Browse vs Inspect */}
              <div className="workbench-mode-switch" role="group" aria-label="Workspace View Mode">
                <button
                  type="button"
                  className={`workbench-mode-btn ${workspaceMode === 'browse' ? 'active' : ''}`}
                  onClick={() => setWorkspaceMode('browse')}
                  title="Browse mode: Maximum catalog scanning width"
                >
                  <LayoutGrid size={13} />
                  <span>Browse</span>
                </button>
                <button
                  type="button"
                  className={`workbench-mode-btn ${workspaceMode === 'inspect' ? 'active' : ''}`}
                  onClick={() => {
                    setWorkspaceMode('inspect')
                    setShowInspector(true)
                  }}
                  title="Inspect mode: Expanded atomic lattice and crystallographic properties"
                >
                  <Scale size={13} />
                  <span>Inspect</span>
                </button>
              </div>

              {/* Compare quick button if any structures selected */}
              {compareIds.length > 0 && (
                <button
                  type="button"
                  className="workbench-compare-trigger"
                  onClick={() => setCompareModalOpen(true)}
                  title="Open side-by-side comparison"
                >
                  <Scale size={13} />
                  <span>Compare ({compareIds.length})</span>
                </button>
              )}
            </div>
          </div>
        </header>
        {importMessage && <div className="import-message"><Check size={15}/>{importMessage}<button onClick={()=>setImportMessage('')} aria-label="Dismiss message"><X size={14}/></button></div>}
        <div className={`explorer-layout mode-${workspaceMode} ${inspectorExpanded ? 'inspector-expanded' : ''} ${filterSidebarCollapsed ? 'filter-is-collapsed' : ''} ${!showInspector ? 'inspector-closed' : ''}`}>
          <aside className={`filter-sidebar ${mobileFilters ? 'filter-sidebar-open' : ''} ${filterSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="filter-head-bar">
              <div className="filter-head-left">
                <SlidersHorizontal size={14} />
                <span>FILTERS</span>
                {activeFilterCount > 0 && (
                  <span className="filter-count-badge">{activeFilterCount} active</span>
                )}
              </div>
              <div className="filter-head-right-actions">
                <button
                  type="button"
                  className="filter-collapse-toggle-btn"
                  onClick={() => setFilterSidebarCollapsed(c => !c)}
                  title={filterSidebarCollapsed ? "Expand filters pane" : "Collapse filters pane"}
                  aria-label={filterSidebarCollapsed ? "Expand filters pane" : "Collapse filters pane"}
                >
                  {filterSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                </button>
              </div>
            </div>

            {/* SECTION 1: POLYGON GEOMETRY */}
            <div className="filter-section-block">
              <div className="filter-section-header" onClick={() => toggleSection('polygon')}>
                <div className="filter-section-title">
                  <span>Polygon Geometry</span>
                  {activeRings.length > 0 && <span className="filter-badge-pill">{activeRings.length}</span>}
                </div>
                <ChevronDown size={14} className={`filter-chevron ${collapsedSections.polygon ? 'collapsed' : ''}`} />
              </div>
              {!collapsedSections.polygon && (
                <div className="filter-section-content">
                  <div className="polygon-symbol-grid">
                    {availableRings.map(n => {
                      const isActive = activeRings.includes(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`symbol-tile polygon-tile ${isActive ? 'active' : ''}`}
                          onClick={() => toggleRing(n)}
                          title={`${n}-membered ring topology (${ringCounts[n] || 0} allotropes)`}
                          aria-label={`${n}-membered ring topology (${ringCounts[n] || 0} allotropes)`}
                          aria-pressed={isActive}
                        >
                          <RegularPolygonIcon n={n} active={isActive} size={32} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="filter-separator" />

            {/* SECTION 2: COVALENT BONDING */}
            <div className="filter-section-block">
              <div className="filter-section-header" onClick={() => toggleSection('bonding')}>
                <div className="filter-section-title">
                  <span>Covalent Bonding</span>
                  {(activeBonds.length > 0 || requireUniform) && (
                    <span className="filter-badge-pill">{activeBonds.length + (requireUniform ? 1 : 0)}</span>
                  )}
                </div>
                <ChevronDown size={14} className={`filter-chevron ${collapsedSections.bonding ? 'collapsed' : ''}`} />
              </div>
              {!collapsedSections.bonding && (
                <div className="filter-section-content">
                  <div className="bonding-symbol-grid">
                    {BOND_FILTER_CHOICES.map(choice => {
                      const isActive = activeBonds.includes(choice.id)
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          className={`symbol-tile bonding-tile ${isActive ? 'active' : ''}`}
                          onClick={() => toggleBond(choice.id)}
                          title={`${choice.title} (${bondTypeCounts[choice.id] || 0} allotropes)`}
                          aria-label={`${choice.title} (${bondTypeCounts[choice.id] || 0} allotropes)`}
                          aria-pressed={isActive}
                        >
                          <span className="bonding-glyph">{choice.symbol}</span>
                        </button>
                      )
                    })}
                    {bondTypeCounts.triple > 0 && (
                      <button
                        type="button"
                        className={`symbol-tile bonding-tile ${activeBonds.includes('triple') ? 'active' : ''}`}
                        onClick={() => toggleBond('triple')}
                        title={`Acetylenic triple bonds (C≡C, ≤ 1.250 Å) (${bondTypeCounts.triple} allotropes)`}
                        aria-label={`Acetylenic triple bonds C≡C, ≤ 1.250 Å (${bondTypeCounts.triple} allotropes)`}
                        aria-pressed={activeBonds.includes('triple')}
                      >
                        <span className="bonding-glyph">C≡C</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`symbol-tile uniform-symbol-tile ${requireUniform ? 'active' : ''}`}
                    onClick={() => {
                      setRequireUniform(!requireUniform)
                      setVisibleCount(12)
                    }}
                    title={`Zero Bond Length Alternation / Uniform Resonant (Δd < 0.025 Å) — ${uniformResonantCount} allotrope`}
                    aria-label={`Filter uniform resonant allotropes with zero bond length alternation Δd < 0.025 Å (${uniformResonantCount} allotrope)`}
                    aria-pressed={requireUniform}
                  >
                    <MathTex math="\Delta d < 0.025\text{ \AA}" />
                  </button>
                </div>
              )}
            </div>

            <div className="filter-separator" />

            {/* SECTION 3: 2D LATTICE */}
            <div className="filter-section-block">
              <div className="filter-section-header" onClick={() => toggleSection('bravais')}>
                <div className="filter-section-title">
                  <span>2D Lattice</span>
                  {activeSystems.length > 0 && <span className="filter-badge-pill">{activeSystems.length}</span>}
                </div>
                <ChevronDown size={14} className={`filter-chevron ${collapsedSections.bravais ? 'collapsed' : ''}`} />
              </div>
              {!collapsedSections.bravais && (
                <div className="filter-section-content">
                  <div className="bravais-symbol-grid">
                    {SYMMETRY_FILTER_CHOICES.map(choice => {
                      const isActive = activeSystems.includes(choice.id)
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          className={`symbol-tile bravais-tile ${isActive ? 'active' : ''}`}
                          onClick={() => toggleSystem(choice.id)}
                          title={`${choice.description} (${symmetryCounts[choice.id] || 0} allotropes)`}
                          aria-label={`${choice.description} (${symmetryCounts[choice.id] || 0} allotropes)`}
                          aria-pressed={isActive}
                        >
                          <BravaisUnitCellIcon id={choice.id} symbol={choice.symbol} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="filter-separator" />

            {/* SECTION 4: ΔE WINDOW */}
            <div className="filter-section-block">
              <div className="filter-section-header" onClick={() => toggleSection('energy')}>
                <div className="filter-section-title">
                  <span><MathTex math="\Delta E" /> Window</span>
                  {(underBenchmark || maxEnergyCutoff < 1.49) && <span className="filter-badge-pill">1</span>}
                </div>
                <ChevronDown size={14} className={`filter-chevron ${collapsedSections.energy ? 'collapsed' : ''}`} />
              </div>
              {!collapsedSections.energy && (
                <div className="filter-section-content">
                  <div className="energy-control-compact">
                    <div className="energy-readout-row">
                      <span className="energy-label">RANGE</span>
                      <span className="energy-readout-val">
                        0.00 – {maxEnergyCutoff >= 1.49 ? '1.50' : maxEnergyCutoff.toFixed(2)} eV/atom
                      </span>
                    </div>
                    <div className="energy-slider-track-wrap">
                      <input
                        type="range"
                        min="0.000"
                        max="1.500"
                        step="0.025"
                        value={maxEnergyCutoff}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          setMaxEnergyCutoff(val)
                          if (val > 0.456) {
                            if (underBenchmark) setUnderBenchmark(false)
                          } else if (Math.abs(val - 0.456) < 0.025) {
                            if (!underBenchmark) setUnderBenchmark(true)
                          }
                          setVisibleCount(12)
                        }}
                        className="energy-range-slider"
                        aria-label="Max ΔE formation energy cutoff"
                      />
                      <div
                        className="benchmark-tick-mark"
                        style={{ left: `${(0.456 / 1.500) * 100}%`, cursor: 'pointer' }}
                        title="Biphenylene synthesis frontier (0.456 eV/atom) — click to filter"
                        onClick={() => {
                          setUnderBenchmark(true)
                          setMaxEnergyCutoff(0.456)
                          setVisibleCount(12)
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className={`symbol-tile energy-benchmark-tile ${underBenchmark ? 'active' : ''}`}
                      onClick={() => {
                        if (underBenchmark) {
                          setUnderBenchmark(false)
                          setMaxEnergyCutoff(1.500)
                        } else {
                          setUnderBenchmark(true)
                          setMaxEnergyCutoff(0.456)
                        }
                        setVisibleCount(12)
                      }}
                      title={`Formation energy below synthesized biphenylene network (ΔE < 0.456 eV/atom) — ${belowBenchmarkCount} allotropes`}
                      aria-label={`Filter allotropes with formation energy below biphenylene benchmark ΔE < 0.456 eV/atom (${belowBenchmarkCount} allotropes)`}
                      aria-pressed={underBenchmark}
                    >
                      <MathTex math="\Delta E < 0.456\text{ eV}" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div className="results-panel">
            {/* Permanent Search Bar & Filter Drawer Trigger (Always visible across desktop, tablet, and mobile) */}
            <div className="materials-search-row">
              {filterSidebarCollapsed && (
                <button
                  type="button"
                  className="filter-uncollapse-quick-btn"
                  onClick={() => setFilterSidebarCollapsed(false)}
                  title="Expand sidebar filters"
                >
                  <PanelLeftOpen size={14} />
                  <span>Filters</span>
                </button>
              )}
              <label className="search-field results-search-field">
                <Search size={16}/>
                <input 
                  value={query} 
                  onChange={e=>{setQuery(e.target.value);setVisibleCount(12)}} 
                  placeholder="Search allotropes, Girão symbols (e.g. h6, c5, r4), systems, space groups..."
                />
                {query ? (
                  <button className="clear-search-btn" onClick={()=>{setQuery('');setVisibleCount(12)}} aria-label="Clear search">
                    <X size={14}/>
                  </button>
                ) : (
                  <kbd>⌘ K</kbd>
                )}
              </label>
              <button 
                className={`filter-drawer-toggle-btn ${mobileFilters || activeFilterCount > 0 ? 'active-filter' : ''}`}
                onClick={()=>setMobileFilters(!mobileFilters)}
                aria-label="Toggle polygon, bonding, and energetic filters"
                title="Toggle geometry filters"
              >
                <Filter size={15}/>
                <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              </button>
            </div>

            {/* Active Filter Chips Bar */}
            {activeFilterChips.length > 0 && (
              <div className="active-filter-chips-bar">
                <span className="chips-label">ACTIVE FILTERS:</span>
                <div className="chips-list">
                  {activeFilterChips.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      className="active-filter-chip"
                      onClick={chip.onRemove}
                      title={`Remove filter: ${chip.label}`}
                    >
                      <span>{chip.label}</span>
                      <X size={11} />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="clear-all-chips-btn"
                    onClick={resetFilters}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            <div className="results-toolbar">
              <div className="results-count">
                <strong>{filtered.length.toString().padStart(2,'0')}</strong>
                <span>structures found <small>of {allotropes.length}</small></span>
              </div>
              <div className="results-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="import-action-btn"
                  onClick={() => setIsSubmissionModalOpen(true)}
                  title="Submit your 2D carbon allotrope and calculation files for peer review and database inclusion"
                >
                  <Upload size={12} />
                  <span>Import your allotrope</span>
                </button>
                <button
                  className={`canonical-filter-btn ${canonicalOnly ? 'active' : ''}`}
                  onClick={() => setCanonicalOnly(!canonicalOnly)}
                  title="Filter out the 8 duplicate allotropes to view only unique canonical structures (saves ~13% computation)"
                >
                  {canonicalOnly ? (
                    <>
                      <Check size={12} style={{ marginRight: '4px', verticalAlign: '-1px', display: 'inline-block' }} />
                      Canonical Only (53)
                    </>
                  ) : 'All Records (61)'}
                </button>
                <div className="sort-wrap">
                  <span>SORT BY</span>
                  <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort structures">
                    <option value="energy">Lowest ΔE first</option>
                    <option value="high">Highest ΔE first</option>
                    <option value="name">Catalogue ID</option>
                  </select>
                  <ChevronDown size={13}/>
                </div>
              </div>
            </div>
            <div className="energy-legend"><span className="legend-dot green"/> DFT <MathTex math="\Delta E" /> RELATIVE TO GRAPHENE <span className="legend-spacer"/><span className="legend-benchmark"/> 0.456 eV/atom BENCHMARK</div>

            {activeBonds.includes('triple') && (
              <div className="literature-insight-card">
                <div className="lit-card-head">
                  <span className="lit-badge">LITERATURE CITATION INSIGHT</span>
                  <h4>Acetylenic Triple Bonds (–C≡C–) in 2D Carbon Networks</h4>
                </div>
                <p>
                  In peer-reviewed literature, pure <strong>triple bonds</strong> (–C≡C–, bond length ~1.21 Å with <em>sp</em> hybridization) 
                  characterize the <strong>Graphyne</strong> and <strong>Graphdiyne</strong> families (linking <em>sp</em> and <em>sp²</em> carbons), 
                  distinguishing them from the 61 fully trivalent <em>sp²</em> allotropes in the Girão master dataset:
                </p>
                <div className="lit-paper-links">
                  <a href="https://doi.org/10.1021/jacs.2c06583" target="_blank" rel="noreferrer" className="lit-paper-pill">
                    <strong>γ-Graphyne Synthesis</strong> · Desyatkin et al. (JACS 2022) <ExternalLink size={12}/>
                  </a>
                  <a href="https://doi.org/10.1039/B922733D" target="_blank" rel="noreferrer" className="lit-paper-pill">
                    <strong>Graphdiyne Nanoscale Films</strong> · Li et al. (Chem. Commun. 2010) <ExternalLink size={12}/>
                  </a>
                  <a href="https://doi.org/10.1103/PhysRevLett.108.086804" target="_blank" rel="noreferrer" className="lit-paper-pill">
                    <strong>Graphynes with Dirac Cones</strong> · Malko et al. (PRL 2012) <ExternalLink size={12}/>
                  </a>
                  <a href="https://doi.org/10.1016/j.carbon.2026.121320" target="_blank" rel="noreferrer" className="lit-paper-pill">
                    <strong>Synthesis Review (Graphynes & Fullerenes)</strong> · Paupitz et al. (Carbon 2026) <ExternalLink size={12}/>
                  </a>
                </div>
              </div>
            )}
            <div className="structure-list">
              {filtered.map((item, index) => {
                const isSelected = item.id === selectedId;
                const isCompared = compareIds.includes(item.id);
                return (
                  <motion.button
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.012, 0.1) }}
                    className={`structure-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setShowInspector(true);
                      if (typeof window !== 'undefined' && window.innerWidth <= 850) {
                        setTimeout(() => {
                          document.querySelector('.inspector-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 60);
                      }
                    }}
                    onDoubleClick={() => {
                      // Redirect to Canonical structure if an alias is double-clicked
                      const targetId = (!item.isCanonical && item.canonicalId)
                        ? (allotropes.find(a => a.isCanonical && (a.id === item.canonicalId || a.canonicalId === item.canonicalId || a.code === item.canonicalId))?.id || item.id)
                        : item.id;
                      setSelectedId(targetId);
                      setShowInspector(true);
                      setTimeout(() => {
                        const inspectorEl = document.querySelector('.inspector-panel') || document.querySelector('#structure-inspector');
                        if (inspectorEl) {
                          inspectorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          inspectorEl.classList.add('inspector-highlight-pulse');
                          setTimeout(() => inspectorEl.classList.remove('inspector-highlight-pulse'), 1200);
                        }
                      }, 50);
                    }}
                    title="Click to preview · Double-click to focus Structure Inspector Canonical"
                    aria-label={`Select allotrope ${item.name || item.id}`}
                  >
                    <div className="row-prefix-group">
                      <button
                        type="button"
                        className={`row-compare-checkbox ${isCompared ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(item.id);
                        }}
                        title={isCompared ? "Remove from comparison" : "Add to comparison"}
                        aria-label={`Compare ${item.name}`}
                      >
                        <Scale size={13} />
                      </button>
                      <span className="row-rank">{String(index + 1).padStart(2, '0')}</span>
                      <span className="row-sketch"><MiniStructure item={item} /></span>
                    </div>
                    <span className="row-identity">
                      <div className="row-identity-head">
                        <strong className="allotrope-title">
                          {item.isCanonical === false ? (
                            <>
                              <span className="alias-record-name">{item.originalId || item.code || item.id}</span>
                              <span className="alias-target-sub" title={`Duplicate CIF record of canonical ${item.canonicalId}`}>
                                ↳ duplicate of {item.literatureName || item.name || item.canonicalId}
                              </span>
                            </>
                          ) : isNamedAllotrope(item) ? (
                            item.literatureName || item.name
                          ) : (
                            <>
                              <span className="allotrope-prefix">Allotrope </span>
                              <ScientificFormula text={item.giraoSymbol || item.symbol || getGiraoNotation(item)} />
                            </>
                          )}
                        </strong>
                        {item.isCanonical !== false && isNamedAllotrope(item) && (
                          <span className="allotrope-sub-notation">
                            <ScientificFormula text={item.giraoSymbol || item.symbol || getGiraoNotation(item)} />
                          </span>
                        )}
                        {item.isCanonical === false && (
                          <span className="alias-chip" title={`Duplicate alias of canonical structure ${item.canonicalId}`}>
                            Alias
                          </span>
                        )}
                        {(() => {
                          const q = query.trim().toLowerCase();
                          if (!q || !Array.isArray(item.aliases)) return null;
                          const currentName = (item.literatureName || item.name || '').toLowerCase();
                          const normCurrent = currentName.replace(/[\s_\-]+/g, '');
                          const normId = (item.id || '').toLowerCase().replace(/[\s_\-]+/g, '');
                          
                          const matchedAlias = item.aliases.find(a => {
                            if (!a || typeof a !== 'string') return false;
                            const low = a.toLowerCase().trim();
                            if (!low.includes(q)) return false;
                            
                            // Normalize and check against current name / ID
                            const norm = low.replace(/[\s_\-]+/g, '');
                            if (norm === normCurrent || norm === normId) return false;
                            
                            // Exclude catalog codes, raw Girao codes, and internal stems
                            if (/^g-\d+$/i.test(low)) return false;
                            if (low.includes('^') || /[·²³⁴⁵⁶⁷⁸⁹¹]/.test(a)) return false;
                            if (low.endsWith('_gr') || low.startsWith('alpha_') || low.startsWith('beta_')) return false;
                            if (/^(p-4m2|amm2|sg|spacegroup)/i.test(low)) return false;
                            if (low === 'c58') return false;
                            
                            return true;
                          });
                          if (!matchedAlias) return null;
                          return (
                            <span className="alias-match-badge" title={`Verified literature alias: "${matchedAlias}"`}>
                              {matchedAlias}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="row-identity-meta">
                        <span className="meta-system">{item.system || item.crystal_system}</span>
                        <span className="meta-sep">·</span>
                        <span className="meta-sg">{item.spaceGroup || item.space_group_symbol || (item.space_group_number ? `SG #${item.space_group_number}` : '')}</span>
                        <span className="meta-sep">·</span>
                        <span className="meta-rings">{(() => { const c = item.polygonCount || Object.keys(item.rings || {}).length || 1; return `${c} ${c === 1 ? 'ring' : 'rings'}`; })()}</span>
                        <span className="meta-sep">·</span>
                        {(() => {
                          const badge = getStructureBondingBadge(item);
                          return (
                            <span
                              className={`meta-bond-chip badge-${badge.variant}`}
                              title={`Covalent Character: ${badge.tooltip}`}
                            >
                              {badge.shortLabel}
                            </span>
                          );
                        })()}
                      </div>
                    </span>
                    <span className="row-energy">
                      <strong>{fmt(item.energy)}</strong>
                      <small>eV / atom</small>
                      <span className="energy-bar">
                        <span style={{ width: `${Math.min(100, (item.energy / 1.2) * 100)}%`, background: item.energy < benchmark ? '#477d60' : '#c9a180' }} />
                      </span>
                    </span>
                    <span
                      className="row-arrow"
                      title="Inspect structure"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                        setShowInspector(true);
                      }}
                    >
                      <ArrowRight size={15} />
                    </span>
                  </motion.button>
                );
              })}
              {filtered.length === 0 && (
                <div className="empty-state">
                  <Search size={22} />
                  <strong>No structures match those filters.</strong>
                  <span>Try a different polygon combination or reset the filters.</span>
                  <button type="button" onClick={resetFilters}>Clear filters</button>
                </div>
              )}
              <div className="catalog-status-footer">
                <span>Showing all {filtered.length} matching structures</span>
              </div>
            </div>
            <div className="results-footnote"><CircleHelp size={13}/><span>Validated DFT energetics (<MathTex math="\Delta E" /> relative to graphene in eV/atom), 17 wallpaper groups, and crystallographic space groups for 61 2D carbon allotropes (53 unique canonical).</span></div>
          </div>

          <AnimatePresence mode="wait">
            {showInspector && (
              <StructureInspector
                selected={selected}
                onClose={() => setShowInspector(false)}
                viewerMode={viewerMode}
                setViewerMode={setViewerMode}
                CarbonLattice3D={CarbonLattice3D}
                MiniStructure={MiniStructure}
                showMirrors={showMirrors}
                setShowMirrors={setShowMirrors}
                showRotations={showRotations}
                setShowRotations={setShowRotations}
                symmetryGroup={symmetryGroup}
                setSymmetryGroup={setSymmetryGroup}
                benchmark={benchmark}
                onOpenExportDrawer={(allotrope) => {
                  setExportDrawerAllotrope(allotrope || selected)
                  setIsExportDrawerOpen(true)
                }}
                onSelectCanonical={(canonId) => {
                  const match = allotropes.find(a => a.isCanonical && (a.id === canonId || a.originalId === canonId || a.code === canonId || a.canonicalId === canonId)) ||
                                allotropes.find(a => (a.originalId === canonId || a.id === canonId || a.code === canonId || a.canonicalId === canonId))
                  if (match) setSelectedId(match.id)
                }}
                onOpenAbInitioWorkspace={(allotrope) => {
                  setSelectedId(allotrope?.id || selected.id)
                  switchWorkspace('lab', '#ab-initio-lab')
                }}
                isCompared={compareIds.includes(selected.id)}
                onToggleCompare={() => toggleCompare(selected.id)}
                isExpanded={inspectorExpanded}
                onToggleExpand={() => setInspectorExpanded(prev => !prev)}
              />
            )}
          </AnimatePresence>
        </div>

        {compareIds.length > 0 && (
          <aside className="compare-floating-tray" aria-label="Selected structures comparison tray">
            <div className="compare-tray-left">
              <div className="compare-tray-badge">
                <Scale size={15} />
                <span>{compareIds.length}</span>
              </div>
              <span className="compare-tray-heading">
                Comparing allotropes
              </span>
              <div className="compare-tray-chips">
                {compareItems.map(item => (
                  <span key={item.id} className="compare-tray-chip">
                    <span className="chip-name">{isNamedAllotrope(item) ? (item.literatureName || item.name) : (item.giraoSymbol || item.name)}</span>
                    <button type="button" onClick={() => toggleCompare(item.id)} title="Remove" aria-label={`Remove ${item.name}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="compare-tray-actions">
              <button type="button" className="compare-clear-btn" onClick={clearCompare}>
                Clear
              </button>
              <button type="button" className="compare-open-btn" onClick={() => setCompareModalOpen(true)}>
                <Scale size={14} />
                <span>Open Matrix ({compareIds.length})</span>
              </button>
            </div>
          </aside>
        )}
      </section>
              </div>
            )}

            {activeWorkspace === 'lab' && (
              <AbInitioLab
                allotrope={selected}
                onSelectAllotrope={setSelectedId}
                onBackToCatalog={() => switchWorkspace('catalog', '#explore')}
                onOpenExportDrawer={(allotrope) => {
                  setExportDrawerAllotrope(allotrope || selected)
                  setIsExportDrawerOpen(true)
                }}
              />
            )}

            {activeWorkspace === 'ml' && (
              <MachineLearningStudio
                allotropes={allotropes}
                onSelectStructure={(id) => {
                  setSelectedId(id)
                  switchWorkspace('catalog', '#explore')
                }}
              />
            )}

            {activeWorkspace === 'bibliography' && (
              <BibliographyExplorer
                onSelectStructure={(id) => {
                  setSelectedId(id)
                  switchWorkspace('catalog', '#explore')
                }}
              />
            )}

            {activeWorkspace === 'methodology' && (
              <Methodology />
            )}
        </div>
      </WorkspaceErrorBoundary>

      <footer className="site-footer">
        <div className="footer-identity">
          <a className="footer-brand" href="#top">
            <CarbonMark/> carbonatlas
          </a>
          <span className="footer-desc">A research interface concept for 2D carbon materials.</span>
        </div>
        <div className="footer-credits">
          <div className="footer-author">
            Author: <strong>Carlos R. Primo S.</strong> · <span className="inst">GEEDAI - UFABC</span> , <span className="inst">GMCAN - UNMSM</span>
          </div>
          <div className="footer-copyright">
            © 2026 Grupo de Estrutura Eletrônica e Dinâmica Atomística Interdisciplinar.
          </div>
        </div>
        <div className="footer-action">
          <a href="#top" className="footer-badge">BUILT FOR CURIOUS STRUCTURES <ArrowRight size={12}/></a>
        </div>
      </footer>
    </main>

    {/* Global Slide-Over Supercell Export Drawer */}
    <SupercellExportDrawer
      isOpen={isExportDrawerOpen}
      onClose={() => setIsExportDrawerOpen(false)}
      allotrope={exportDrawerAllotrope || selected}
    />

    {/* Global Side-by-Side Structure Comparison Modal */}
    <StructureComparisonModal
      isOpen={compareModalOpen}
      onClose={() => setCompareModalOpen(false)}
      compareItems={compareItems}
      onRemoveItem={(id) => toggleCompare(id)}
      onSelectStructure={(id) => {
        setSelectedId(id)
        setShowInspector(true)
        setCompareModalOpen(false)
      }}
      onOpenExportDrawer={(allotrope) => {
        setExportDrawerAllotrope(allotrope)
        setIsExportDrawerOpen(true)
      }}
      MiniStructure={MiniStructure}
    />

    {/* Allotrope Submission Modal */}
    <AllotropeSubmissionModal
      isOpen={isSubmissionModalOpen}
      onClose={() => setIsSubmissionModalOpen(false)}
    />
  </div>
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('Atlas ErrorBoundary caught an error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          background: '#f8faf7',
          color: '#1a3324',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '560px',
            background: '#ffffff',
            border: '1.5px solid #c7dcc3',
            borderRadius: '8px',
            padding: '32px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#164230' }}>
              Crystallographic Renderer Notice
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#446452', margin: '0 0 20px 0' }}>
              An unexpected display exception occurred while evaluating lattice coordinates or descriptor projections.
            </p>
            {this.state.error && (
              <pre style={{
                textAlign: 'left',
                background: '#f4f6f4',
                color: '#842029',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '11px',
                lineHeight: '1.4',
                overflowX: 'auto',
                maxHeight: '160px',
                margin: '0 0 16px 0',
                fontFamily: 'monospace'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.hash = '#explore'
                window.location.reload()
              }}
              style={{
                background: '#1b4332',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reset to Explorer View
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <App/>
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>
)
