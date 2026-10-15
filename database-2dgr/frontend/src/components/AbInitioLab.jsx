import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Atom, Check, ChevronRight, ChevronDown, Cpu, Copy, Download,
  ExternalLink, FileSpreadsheet, FileText, FlaskConical, Layers,
  Maximize2, Minimize2, Pause, Play, Sparkles, TrendingUp, Zap, AlertCircle, ArrowRight, ArrowLeft,
  ShieldCheck, Binary, Sliders, Compass, Database, Eye, RefreshCw, Info, HelpCircle,
  ZoomIn, ZoomOut, RotateCcw, Box, Grid, BookOpen, Bookmark, UserCheck, Target,
  Crosshair, Ruler, Camera, Share2, PanelRightClose, PanelRightOpen, X, CircleDot,
  CheckSquare, Square, Hexagon, Maximize
} from 'lucide-react'
import { phothCalculations } from '../data/photh_calculations'
import {
  MathTex,
  ScientificFormula,
  formatGiraoSymbol,
  isNamedAllotrope,
  getGiraoNotation,
} from './ScientificFormula'
import NativeBandsPbeHse from './NativeBandsPbeHse'
import { Interactive3DLattice } from './Interactive3DLattice'
import { exportCif, exportPoscar, exportXyz } from '../utils/supercellGenerator'
import { computePaulingBondOrder } from '../utils/bondingLogic'
import { getReferencesForStructure } from '../data/scientificBibliography'
import {
  computeDidacticSupercells,
  computeArealDensityMgM2,
  getScientificDataCoverage,
  DATA_ORIGIN
} from '../utils/scientificDataAvailability'

// Robust crystallographic symmetry orbit identifier for 2D lattices
function parseSymmetryOpsFromCif(cif) {
  if (!cif) return []
  const ops = []
  let inSym = false
  for (const rawLine of cif.split('\n')) {
    const line = rawLine.trim()
    if (line.includes('_symmetry_equiv_pos_as_xyz')) {
      inSym = true
      continue
    }
    if (inSym) {
      if (line.startsWith('loop_') || line.startsWith('_atom_site')) break
      const match = line.match(/['"]([^'"]+)['"]/)
      if (match) {
        ops.push(match[1].trim())
      } else if (line && !line.startsWith('#')) {
        const parts = line.split(/\s+/)
        if (parts.length > 1 && /[xyz]/.test(parts[1])) {
          ops.push(parts[1].replace(/['"]/g, '').trim())
        }
      }
    }
  }
  return ops
}

function evalCoordExpr(expr, x, y, z) {
  const sanitized = expr
    .replace(/x/g, `(${x})`)
    .replace(/y/g, `(${y})`)
    .replace(/z/g, `(${z})`)
  try {
    return Function('"use strict"; return (' + sanitized + ')')()
  } catch {
    return 0
  }
}

function applySymmetryOp(opStr, pt) {
  const parts = opStr.split(',').map(s => s.trim())
  return [
    evalCoordExpr(parts[0], pt[0], pt[1], pt[2] || 0),
    evalCoordExpr(parts[1], pt[0], pt[1], pt[2] || 0),
    evalCoordExpr(parts[2] || 'z', pt[0], pt[1], pt[2] || 0)
  ]
}

function fracDist(p1, p2) {
  const dx = Math.abs(p1[0] - p2[0]) % 1
  const dy = Math.abs(p1[1] - p2[1]) % 1
  const dz = Math.abs((p1[2] || 0) - (p2[2] || 0)) % 1
  const minDx = Math.min(dx, 1 - dx)
  const minDy = Math.min(dy, 1 - dy)
  const minDz = Math.min(dz, 1 - dz)
  return Math.hypot(minDx, minDy, minDz)
}

function computeSymmetryOrbits(allotrope) {
  const atoms = allotrope?.atoms || []
  if (atoms.length === 0) return []
  const ops = parseSymmetryOpsFromCif(allotrope.cifContent || allotrope.cif_content)
  const coords = atoms.map(a => a.frac_coords_2d || a.frac_coords || [0.5, 0.5, 0])

  const visited = new Set()
  const rawOrbits = []

  if (ops.length > 0) {
    for (let i = 0; i < atoms.length; i++) {
      if (visited.has(i)) continue
      const orbit = [i]
      visited.add(i)
      const pt = coords[i]

      for (const op of ops) {
        const transformed = applySymmetryOp(op, pt)
        for (let j = 0; j < atoms.length; j++) {
          if (!visited.has(j)) {
            if (fracDist(transformed, coords[j]) < 0.05) {
              visited.add(j)
              orbit.push(j)
            }
          }
        }
      }
      rawOrbits.push(orbit)
    }
  } else {
    const groups = {}
    atoms.forEach((a, i) => {
      const key = a.wyckoff || `site_${i + 1}`
      if (!groups[key]) groups[key] = []
      groups[key].push(i)
    })
    Object.values(groups).forEach(orb => rawOrbits.push(orb))
  }

  // Count occurrences of each Wyckoff letter across orbits
  const letterCounts = {}
  rawOrbits.forEach(orb => {
    const rep = atoms[orb[0]]
    const w = rep?.wyckoff || 'a'
    letterCounts[w] = (letterCounts[w] || 0) + 1
  })

  const letterSeen = {}
  return rawOrbits.map((orb, oIdx) => {
    const rep = atoms[orb[0]]
    const w = rep?.wyckoff || 'a'
    letterSeen[w] = (letterSeen[w] || 0) + 1
    const subIdx = letterSeen[w]
    const hasMultiple = letterCounts[w] > 1
    const site = hasMultiple ? `C(${w}${subIdx})` : `C(${w})`
    const mult = orb.length
    return {
      site,
      orbit_id: oIdx + 1,
      wyckoff_letter: w,
      sub_index: subIdx,
      mult,
      atom_indices: orb,
      rep_atom_index: orb[0],
      x: coords[orb[0]][0],
      y: coords[orb[0]][1],
      z: coords[orb[0]][2] || 0,
      cart: rep?.cart_coords || [0, 0, 0],
      role: `Symmetry Site ${site} (${mult}${w})`,
      bader_0: 0.0,
      dG_her_eV: 1.86
    }
  })
}

export function AbInitioLab({ allotrope, onSelectAllotrope, onOpenExportDrawer, onBackToCatalog }) {
  // Synchronized Master Instrument State across all views
  const [selectedSite, setSelectedSite] = useState('C1') // 'C1' ... 'C6'
  const [strainMode, setStrainMode] = useState('Biaxial') // 'Biaxial' | 'X' | 'Y'
  const [strainIndex, setStrainIndex] = useState(5) // default to index 5 (+2%), as in reference demo
  const [activeModule, setActiveModule] = useState('cdd') // 'cdd' | 'bands' | 'bader' | 'her' | 'strain' | 'provenance'

  // Sub-panel interaction states
  const [cddViewMode, setCddViewMode] = useState('3d_anim') // '3d_anim' | '2d_contour'
  const [cddFieldMode, setCddFieldMode] = useState('total_rho') // 'total_rho' (Mode A) | 'delta_rho' (Mode B)
  const [isCddLooping, setIsCddLooping] = useState(true)
  const [cddSliceZ, setCddSliceZ] = useState(0.50) // 0.50 = basal carbon plane

  const [bandsViewMode, setBandsViewMode] = useState('coupled_anim') // 'coupled_anim' | 'pbe_vs_hse' | 'pristine_coupled'
  const [isBandsLooping, setIsBandsLooping] = useState(true)

  const [baderViewMode, setBaderViewMode] = useState('anim') // 'anim' | 'profiles' | 'composite'
  const [isBaderLooping, setIsBaderLooping] = useState(true)

  const [herFilterSite, setHerFilterSite] = useState('ALL') // 'ALL' | 'C1' ... 'C6'
  const [showHerStrain, setShowHerStrain] = useState(true)

  const [provTab, setProvTab] = useState('specs') // 'specs' | 'energy' | 'bader' | 'incar' | 'literature'
  const [activePersona, setActivePersona] = useState('dft') // 'dft' | 'exp' | 'student' | 'visitor' | 'catalysis'
  const [copiedField, setCopiedField] = useState('')
  const [hoveredAtom, setHoveredAtom] = useState(null)

  // Canonical Selection Architecture (OVITO / Mol* Precision)
  const [selectionMode, setSelectionMode] = useState('atom') // 'atom' | 'orbit' | 'bond' | 'ring' | 'measure'
  const [selectedObject, setSelectedObject] = useState(null) // null (Structure Overview) | atom | orbit | bond | ring | measurement
  const [measurePoints, setMeasurePoints] = useState({ p1: null, p2: null })

  // Camera & Viewport CAD Controls
  const [cameraView, setCameraView] = useState('iso') // 'iso' | 'top' | 'side'
  const [is2DMode, setIs2DMode] = useState(false)
  const [fitTrigger, setFitTrigger] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [supercellDim, setSupercellDim] = useState([1, 1])
  const [atomScaleFactor, setAtomScaleFactor] = useState(1.0)

  // Overlays
  const [overlays, setOverlays] = useState({
    unitCell: true,
    atomLabels: true,
    wyckoffLabels: false,
    rings: true,
    bondLengths: false,
    axes: true,
    hydrogen: false
  })

  // CAD Split-Pane Layout
  const [splitRatio, setSplitRatio] = useState(72) // 72% viewport, 28% inspector
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false)
  const isDraggingSplitter = useRef(false)
  const splitContainerRef = useRef(null)

  // Quick Action Menus
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showOverlaysMenu, setShowOverlaysMenu] = useState(false)
  const interactiveLatticeRef = useRef(null)

  // Progressive Disclosure sections in Inspector
  const [showGeometrySection, setShowGeometrySection] = useState(true)
  const [showSymmetrySection, setShowSymmetrySection] = useState(false)
  const [showDftSection, setShowDftSection] = useState(false)
  const [showExportSection, setShowExportSection] = useState(false)

  // Keyboard Shortcuts (Esc, F, R, 1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }
      if (e.key === 'Escape') {
        setSelectedObject(null)
        setMeasurePoints({ p1: null, p2: null })
        setShowExportMenu(false)
        setShowOverlaysMenu(false)
      } else if (e.key === 'f' || e.key === 'F') {
        setFitTrigger(prev => prev + 1)
      } else if (e.key === 'r' || e.key === 'R') {
        setResetTrigger(prev => prev + 1)
      } else if (e.key === '1') {
        setCameraView('iso')
        setIs2DMode(false)
      } else if (e.key === '2') {
        setCameraView('top')
        setIs2DMode(true)
      } else if (e.key === '3') {
        setCameraView('side')
        setIs2DMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Splitter mouse drag handler
  const handleSplitterMouseDown = (e) => {
    e.preventDefault()
    isDraggingSplitter.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingSplitter.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const newRatio = ((moveEvent.clientX - rect.left) / rect.width) * 100
      if (newRatio >= 45 && newRatio <= 85) {
        setSplitRatio(parseFloat(newRatio.toFixed(1)))
      }
    }

    const handleMouseUp = () => {
      isDraggingSplitter.current = false
      document.body.style.cursor = 'auto'
      document.body.style.userSelect = 'auto'
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Distance measurement picking handler
  const handleMeasureAtomSelect = (atom) => {
    if (!measurePoints.p1) {
      setMeasurePoints({ p1: atom, p2: null })
      setSelectedObject({
        type: 'measurement',
        p1: atom,
        p2: null,
        status: 'select_p2'
      })
    } else if (!measurePoints.p2) {
      const p1 = measurePoints.p1
      const p2 = atom
      const p1Cart = p1.cart || [p1.frac[0] * effA, p1.frac[1] * effB, 0]
      const p2Cart = p2.cart || [p2.frac[0] * effA, p2.frac[1] * effB, 0]
      const dx = p2Cart[0] - p1Cart[0]
      const dy = p2Cart[1] - p1Cart[1]
      const dz = (p2Cart[2] || 0) - (p1Cart[2] || 0)
      const dist = Math.hypot(dx, dy, dz)

      setMeasurePoints({ p1, p2 })
      setSelectedObject({
        type: 'measurement',
        p1,
        p2,
        distance: dist,
        delta: [Math.abs(dx), Math.abs(dy), Math.abs(dz)],
        status: 'complete'
      })
    } else {
      setMeasurePoints({ p1: atom, p2: null })
      setSelectedObject({
        type: 'measurement',
        p1: atom,
        p2: null,
        status: 'select_p2'
      })
    }
  }

  // Screenshot capture from WebGL canvas
  const handleScreenshotExport = () => {
    if (interactiveLatticeRef.current?.captureScreenshot) {
      const dataUrl = interactiveLatticeRef.current.captureScreenshot()
      if (dataUrl) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${allotrope?.id || 'allotrope'}_crystal_3d.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    }
    setShowExportMenu(false)
  }

  // High-fidelity Supercell Exports
  const handleDownloadSupercellCif = () => {
    const rawCif = allotrope?.cif_content || allotrope?.cifContent || ''
    if (!rawCif) {
      handleDownloadCif()
      return
    }
    const supercellCif = exportCif(rawCif, supercellDim[0], supercellDim[1], { lz: 20 })
    const blob = new Blob([supercellCif], { type: 'chemical/x-cif' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${allotrope?.id || 'allotrope'}_${supercellDim[0]}x${supercellDim[1]}_supercell.cif`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const handleDownloadPoscar = () => {
    const rawCif = allotrope?.cif_content || allotrope?.cifContent || ''
    if (!rawCif) return
    const poscar = exportPoscar(rawCif, supercellDim[0], supercellDim[1], { lz: 20 })
    const blob = new Blob([poscar], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `POSCAR_${allotrope?.id || 'allotrope'}_${supercellDim[0]}x${supercellDim[1]}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const handleDownloadXyz = () => {
    const rawCif = allotrope?.cif_content || allotrope?.cifContent || ''
    if (!rawCif) return
    const xyz = exportXyz(rawCif, supercellDim[0], supercellDim[1], { lz: 20 })
    const blob = new Blob([xyz], { type: 'chemical/x-xyz' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${allotrope?.id || 'allotrope'}_${supercellDim[0]}x${supercellDim[1]}.xyz`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  // Interactive Crystallography & Simulator state
  const [latticeViewMode, setLatticeViewMode] = useState('3d_orbit')
  const [showBondLengths, setShowBondLengths] = useState(false)
  const [showRingPolygons, setShowRingPolygons] = useState(true)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isExpandedLattice, setIsExpandedLattice] = useState(false)
  const [showWyckoffTable, setShowWyckoffTable] = useState(false)
  const [showConventions, setShowConventions] = useState(false)
  const [hoveredKpoint, setHoveredKpoint] = useState(null)
  const [elasticityMode, setElasticityMode] = useState('Biaxial')
  const [elasticityTab, setElasticityTab] = useState('energy')
  const [hoveredStrainPoint, setHoveredStrainPoint] = useState(null)

  const handleZoomIn = () => setZoom(z => Math.min(2.5, +(z + 0.2).toFixed(2)))
  const handleZoomOut = () => setZoom(z => Math.max(0.7, +(z - 0.2).toFixed(2)))
  const handleResetView = () => { setZoom(1.0); setPan({ x: 0, y: 0 }); }

  const handleMouseDown = (e) => {
    if (e.target.closest('.lattice-atom-group')) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  const handleMouseMoveSvg = (e) => {
    if (!isPanning) return
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }
  const handleMouseUp = () => setIsPanning(false)

  const isPhoth = !allotrope || allotrope.id === 'photh_graphene' || allotrope.originalId === 'photh_graphene' || allotrope.code === 'G-09' || allotrope?.name?.includes('PHOTH')
  const data = phothCalculations

  // Dynamic in-plane lattice constants (Å)
  const effA = Number(allotrope?.lattice?.a_2d || allotrope?.in_plane_lattice?.a || allotrope?.latticeA || allotrope?.lattice?.a || 7.141)
  const effB = Number(allotrope?.lattice?.b_2d || allotrope?.in_plane_lattice?.b || allotrope?.latticeB || allotrope?.lattice?.b || 3.984)

  // Dynamic Wyckoff symmetry sites derived from CIF coordinates and authentic symmetry orbits
  const dynamicWyckoffSites = useMemo(() => {
    if (isPhoth && data?.wyckoff_sites) {
      return data.wyckoff_sites
    }
    if (!Array.isArray(allotrope?.atoms) || allotrope.atoms.length === 0) {
      return [{ site: 'C1', mult: 1, x: 0.5, y: 0.5, z: 0.0, role: 'Basal Site', wyckoff_letter: 'a', cart: [0, 0, 0], bader_0: 0.0, dG_her_eV: 1.86 }]
    }
    return computeSymmetryOrbits(allotrope)
  }, [allotrope, isPhoth, data])

  // Mapping from atom index to orbit site identifier
  const atomSiteMap = useMemo(() => {
    const map = {}
    if (isPhoth) {
      const sites = ['C1', 'C2', 'C2', 'C3', 'C3', 'C4', 'C4', 'C5', 'C5', 'C6']
      sites.forEach((s, i) => { map[i] = s })
      return map
    }
    dynamicWyckoffSites.forEach(orb => {
      if (Array.isArray(orb.atom_indices)) {
        orb.atom_indices.forEach(idx => {
          map[idx] = orb.site
        })
      }
    })
    return map
  }, [dynamicWyckoffSites, isPhoth])

  // Synchronize site selector when switching allotropes
  useEffect(() => {
    if (dynamicWyckoffSites.length > 0 && !dynamicWyckoffSites.some(s => s.site === selectedSite)) {
      setSelectedSite(dynamicWyckoffSites[0].site)
    }
  }, [dynamicWyckoffSites, selectedSite])

  // Synchronized strain telemetry
  const currentModeInfo = (data.strain_series?.modes || []).find(m => m.id === strainMode) || data.strain_series.modes[0]
  const currentPoints = (data.strain_series?.points && data.strain_series.points[strainMode]) || []
  const currentPoint = currentPoints[strainIndex] || currentPoints[3] || {}
  const currentStrainPct = currentPoint.strain_pct || "0%"
  const currentStrainVal = currentPoint.strain || 0.00
  const currentBaderCharges = currentPoint.bader || {}

  // Active Wyckoff site data
  const currentSiteInfo = useMemo(() => {
    if (isPhoth) {
      return data.wyckoff_sites.find(s => s.site === selectedSite) || data.wyckoff_sites[0]
    }
    return dynamicWyckoffSites.find(s => s.site === selectedSite) || dynamicWyckoffSites[0] || {
      site: 'C1',
      mult: 1,
      x: 0.5,
      y: 0.5,
      z: 0.0,
      cart: [0, 0, 0],
      role: 'Basal Site',
      wyckoff_letter: 'a',
      bader_0: 0.0
    }
  }, [isPhoth, data, selectedSite, dynamicWyckoffSites])

  const eqSiteCharge = currentSiteInfo.bader_0 || 0.0
  const instSiteCharge = currentBaderCharges[selectedSite] !== undefined ? currentBaderCharges[selectedSite] : eqSiteCharge
  const deltaQ = instSiteCharge - eqSiteCharge

  // Hydrogen adsorption Delta G under active strain
  const activeHerEnergy = (selectedSite === 'C1' && currentStrainVal === 0.02 && strainMode === 'Biaxial')
    ? data.her_catalysis.strained_2pct_dG_eV
    : (currentSiteInfo.dG_her_eV || 1.86)

  // Active DFT strain geometry from VASP calculation
  const currentStrainGeom = useMemo(() => {
    if (!isPhoth) return null
    return data.strain_geometries?.[strainMode]?.[currentStrainPct] || null
  }, [isPhoth, data, strainMode, currentStrainPct])

  // Strained lattice parameters
  const strainedLatticeA = currentStrainGeom
    ? currentStrainGeom.a.toFixed(3)
    : strainMode === 'Biaxial'
      ? (effA * (1 + currentStrainVal)).toFixed(3)
      : strainMode === 'X'
        ? (effA * (1 + currentStrainVal)).toFixed(3)
        : (effA * (1 - (data.elasticity.poisson_xy || 0.231) * currentStrainVal)).toFixed(3)

  const strainedLatticeB = currentStrainGeom
    ? currentStrainGeom.b.toFixed(3)
    : strainMode === 'Biaxial'
      ? (effB * (1 + currentStrainVal)).toFixed(3)
      : strainMode === 'Y'
        ? (effB * (1 + currentStrainVal)).toFixed(3)
        : (effB * (1 - (data.elasticity.poisson_yx || 0.227) * currentStrainVal)).toFixed(3)

  // Bands animation mode info
  const bandsModeInfo = (data.band_series?.modes || []).find(m => m.id === strainMode) || {
    id: "Biaxial",
    label: "Biaxial Breathing (ε_xx = ε_yy)",
    gif: "./calculations/photh/anim_band_pdos_coupled_biaxial.gif"
  }

  // Bader animation mode info
  const baderModeInfo = (data.bader_animation_series?.modes || []).find(m => m.id === strainMode) || {
    id: "Biaxial",
    label: "Biaxial Breathing (ε_xx = ε_yy)",
    gif: "./calculations/photh/anim_bader_biaxial_breathing.gif"
  }

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(''), 2200)
  }

  // Real bond statistics computed directly from coordinates
  const bondStats = useMemo(() => {
    if (isPhoth) {
      if (currentStrainGeom) {
        return {
          min: currentStrainGeom.min_bond,
          max: currentStrainGeom.max_bond,
          avg: currentStrainGeom.avg_bond,
          count: 11
        }
      }
      return { min: 1.375, max: 1.512, avg: 1.444, count: 11 }
    }
    if (!Array.isArray(allotrope?.atoms) || allotrope.atoms.length === 0) {
      return { min: 1.420, max: 1.420, avg: 1.420, count: 0 }
    }
    const computedLengths = []
    if (allotrope.bonds && allotrope.bonds.length > 0) {
      allotrope.bonds.forEach(([i, j]) => {
        const atA = allotrope.atoms[i]
        const atB = allotrope.atoms[j]
        if (atA && atB && atA.cart_coords && atB.cart_coords) {
          const d = Math.hypot(
            atB.cart_coords[0] - atA.cart_coords[0],
            atB.cart_coords[1] - atA.cart_coords[1],
            atB.cart_coords[2] - atA.cart_coords[2]
          )
          if (d > 0.5 && d < 3.0) computedLengths.push(d)
        }
      })
    }
    // Fallback if no bonds array or pairs
    if (computedLengths.length === 0) {
      for (let i = 0; i < allotrope.atoms.length; i++) {
        for (let j = i + 1; j < allotrope.atoms.length; j++) {
          const atA = allotrope.atoms[i]
          const atB = allotrope.atoms[j]
          if (atA.cart_coords && atB.cart_coords) {
            const d = Math.hypot(
              atB.cart_coords[0] - atA.cart_coords[0],
              atB.cart_coords[1] - atA.cart_coords[1],
              atB.cart_coords[2] - atA.cart_coords[2]
            )
            if (d >= 1.15 && d <= 1.68) computedLengths.push(d)
          }
        }
      }
    }
    if (computedLengths.length === 0) {
      return { min: 1.420, max: 1.420, avg: 1.420, count: 0 }
    }
    const min = Math.min(...computedLengths)
    const max = Math.max(...computedLengths)
    const avg = computedLengths.reduce((a, b) => a + b, 0) / computedLengths.length
    return {
      min: Number(min.toFixed(3)),
      max: Number(max.toFixed(3)),
      avg: Number(avg.toFixed(3)),
      count: computedLengths.length
    }
  }, [allotrope, isPhoth])

  // 2D Unit Cell Cartesian Geometry and Polygon
  const cellGeom2D = useMemo(() => {
    const angleDeg = Number(allotrope?.in_plane_lattice?.angle || allotrope?.lattice?.gamma || (allotrope?.crystal_system === 'Hexagonal' ? 120 : 90))
    const rad = (angleDeg * Math.PI) / 180
    const aV = [effA, 0]
    const bV = [effB * Math.cos(rad), effB * Math.sin(rad)]

    // 4 corners of unit cell in Cartesian space
    const c0 = [0, 0]
    const c1 = [aV[0], aV[1]]
    const c2 = [aV[0] + bV[0], aV[1] + bV[1]]
    const c3 = [bV[0], bV[1]]

    const xs = [c0[0], c1[0], c2[0], c3[0]]
    const ys = [c0[1], c1[1], c2[1], c3[1]]
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const cellW = maxX - minX || 1
    const cellH = maxY - minY || 1

    // Canvas available area for drawing the cell: width 520, height 280
    const canvasW = 520
    const canvasH = 280
    const pad = 30
    const scale = Math.min((canvasW - 2 * pad) / cellW, (canvasH - 2 * pad) / cellH)

    // Center the cell inside the 520x280 region
    const renderedW = cellW * scale
    const renderedH = cellH * scale
    const offsetX = (canvasW - renderedW) / 2 - minX * scale
    const offsetY = (canvasH - renderedH) / 2 - minY * scale

    // Project (x, y) Cartesian to SVG pixel (X, Y) with +y pointing up
    const project = (x, y) => {
      const px = x * scale + offsetX
      const py = canvasH - (y * scale + offsetY)
      return [px, py]
    }

    const p0 = project(c0[0], c0[1])
    const p1 = project(c1[0], c1[1])
    const p2 = project(c2[0], c2[1])
    const p3 = project(c3[0], c3[1])

    const polygonPoints = `${p0[0].toFixed(1)},${p0[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)}`

    return {
      aV,
      bV,
      c0, c1, c2, c3,
      p0, p1, p2, p3,
      polygonPoints,
      project,
      scale
    }
  }, [allotrope, effA, effB])

  // Dynamic 2D SVG Atoms strictly positioned via authentic Cartesian vectors
  const dynamic2DAtoms = useMemo(() => {
    if (!Array.isArray(allotrope?.atoms) || allotrope.atoms.length === 0) return []
    return allotrope.atoms.map((a, idx) => {
      const fc2d = a.frac_coords_2d || (a.frac_coords ? [a.frac_coords[0], a.frac_coords[1]] : [0.5, 0.5])
      const u = fc2d[0]
      const v = fc2d[1]
      const site = atomSiteMap[idx] || (a.wyckoff ? `C(${a.wyckoff})` : `C${idx + 1}`)

      // Cartesian coordinates in 2D
      const rx = u * cellGeom2D.aV[0] + v * cellGeom2D.bV[0]
      const ry = u * cellGeom2D.aV[1] + v * cellGeom2D.bV[1]
      const [px, py] = cellGeom2D.project(rx, ry)

      return {
        id: a.index !== undefined ? a.index + 1 : idx + 1,
        idx,
        site,
        wyckoff: a.wyckoff,
        frac: [u, v],
        cartX: rx,
        cartY: ry,
        cart: a.cart_coords || [rx, ry, 0],
        px,
        py,
        isSelected: selectedSite === site
      }
    })
  }, [allotrope, selectedSite, cellGeom2D, atomSiteMap])

  // Dynamic 2D SVG Bonds (intra-cell and periodic boundary connections)
  const dynamic2DBonds = useMemo(() => {
    if (dynamic2DAtoms.length === 0) return []
    const bondsArr = []
    const addedPairs = new Set()

    // 1. Add known intra-cell pairs from allotrope.bonds
    if (Array.isArray(allotrope?.bonds)) {
      allotrope.bonds.forEach(([idxA, idxB]) => {
        const atA = dynamic2DAtoms.find(a => a.id === idxA + 1 || a.idx === idxA)
        const atB = dynamic2DAtoms.find(a => a.id === idxB + 1 || a.idx === idxB)
        if (!atA || !atB) return

        const distInCell = Math.hypot(atB.cartX - atA.cartX, atB.cartY - atA.cartY)
        if (distInCell <= 1.85) {
          const pairKey = `${Math.min(atA.id, atB.id)}-${Math.max(atA.id, atB.id)}`
          addedPairs.add(pairKey)
          bondsArr.push({
            x1: atA.px,
            y1: atA.py,
            x2: atB.px,
            y2: atB.py,
            mx: (atA.px + atB.px) / 2,
            my: (atA.py + atB.py) / 2,
            length: distInCell.toFixed(3),
            isHighlighted: atA.site === selectedSite || atB.site === selectedSite,
            isPeriodic: false
          })
        }
      })
    }

    // 2. Discover any additional intra-cell covalent bonds up to 1.76 Å (e.g. 1.703 Å in G-20)
    for (let i = 0; i < dynamic2DAtoms.length; i++) {
      for (let j = i + 1; j < dynamic2DAtoms.length; j++) {
        const atA = dynamic2DAtoms[i]
        const atB = dynamic2DAtoms[j]
        const pairKey = `${Math.min(atA.id, atB.id)}-${Math.max(atA.id, atB.id)}`
        if (addedPairs.has(pairKey)) continue

        const distInCell = Math.hypot(atB.cartX - atA.cartX, atB.cartY - atA.cartY)
        if (distInCell >= 1.15 && distInCell <= 1.76) {
          addedPairs.add(pairKey)
          bondsArr.push({
            x1: atA.px,
            y1: atA.py,
            x2: atB.px,
            y2: atB.py,
            mx: (atA.px + atB.px) / 2,
            my: (atA.py + atB.py) / 2,
            length: distInCell.toFixed(3),
            isHighlighted: atA.site === selectedSite || atB.site === selectedSite,
            isPeriodic: false
          })
        }
      }
    }

    // 3. Periodic boundary connection stubs (connecting unit cell atoms to neighbor images)
    for (let i = 0; i < dynamic2DAtoms.length; i++) {
      for (let j = 0; j < dynamic2DAtoms.length; j++) {
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue

            const atA = dynamic2DAtoms[i]
            const atB = dynamic2DAtoms[j]

            const imgCartX = atB.cartX + di * cellGeom2D.aV[0] + dj * cellGeom2D.bV[0]
            const imgCartY = atB.cartY + di * cellGeom2D.aV[1] + dj * cellGeom2D.bV[1]
            const dist = Math.hypot(imgCartX - atA.cartX, imgCartY - atA.cartY)

            if (dist >= 1.20 && dist <= 1.76) {
              const [imgPx, imgPy] = cellGeom2D.project(imgCartX, imgCartY)
              const stubX = atA.px + (imgPx - atA.px) * 0.52
              const stubY = atA.py + (imgPy - atA.py) * 0.52

              bondsArr.push({
                x1: atA.px,
                y1: atA.py,
                x2: stubX,
                y2: stubY,
                mx: (atA.px + stubX) / 2,
                my: (atA.py + stubY) / 2,
                length: dist.toFixed(3),
                isHighlighted: atA.site === selectedSite,
                isPeriodic: true
              })
            }
          }
        }
      }
    }

    return bondsArr
  }, [allotrope, dynamic2DAtoms, selectedSite, cellGeom2D])


  // Literature benchmark citation & facts retriever
  const litBenchmark = useMemo(() => {
    const id = allotrope?.id || ''
    if (id === 'phagraphene' || allotrope?.code === 'G-08' || allotrope?.name?.toLowerCase().includes('phagraphene')) {
      return {
        isSpecific: true,
        title: "Phagraphene (r5²·6²·7²)",
        synthesis: "Proposed by Wang et al. (Nano Lett. 15:6182, 2015) as an energetically stable planar carbon allotrope composed of 5-6-7 carbon rings, with formation energy +0.205 eV/atom well below the biphenylene experimental threshold (+0.456 eV).",
        electronic: "Features distorted Dirac cones with anisotropic Fermi velocities (v_Fx ≈ 6.0 × 10⁵ m/s, v_Fy ≈ 7.2 × 10⁵ m/s) and direction-dependent relativistic electronic transport (Wang et al., 2015).",
        mechanics: `Relaxed planar unit cell: a = ${effA.toFixed(3)} Å, b = ${effB.toFixed(3)} Å, density = ${Number(allotrope?.density_g_cm3 || allotrope?.density || 0.35).toFixed(3)} g/cm³. Retains robust in-plane stiffness (Y₂D ≈ 280 N/m).`,
        energetics: "Formation energy ΔE = +0.205 eV/atom above graphene (0.251 eV below Biphenylene benchmark), establishing high thermodynamic accessibility.",
        catalysis: "5-7 ring defect junctions create localized electronic states and curvature-induced dipole fields favorable for catalytic hydrogen evolution (HER).",
        citations: [
          { authors: "Wang, Z., Zhou, X. F., Zhang, X. et al.", title: "Phagraphene: A Low-Energy Graphene Allotrope with Dirac Fermions", journal: "Nano Lett. 15, 6182-6186", year: "2015", doi: "10.1021/acs.nanolett.5b02512" },
          { authors: "Macmillan, L., Girão, E. C. & Meunier, V.", title: "Graph embedding tensor: unifying topological description, symmetry detection, and structure generation for two-dimensional carbon allotropes", journal: "npj Comput. Mater. 11, 1932", year: "2025", doi: "10.1038/s41524-025-01932-8" },
          { authors: "Girão, E. C., Liang, L., Rodrigues, V. et al.", title: "Taxonomy and properties of 2D carbon allotropes", journal: "Carbon 203, 611-619", year: "2023", doi: "10.1016/j.carbon.2022.11.077" }
        ]
      }
    }
    if (id === 'biphenylene') {
      return {
        isSpecific: true,
        title: "Biphenylene Network (r4¹·6¹·8¹)",
        synthesis: "Synthesized experimentally on Au(111) substrate via Ullmann coupling of terphenyl precursors (Fan et al., Science 372:852, 2021).",
        electronic: "Metallic character featuring anisotropic Dirac nodal lines and high Fermi velocity (Luo et al., Sci. Rep. 11:19008, 2021).",
        mechanics: "In-plane stiffness Y₂D = 259.7 N/m, Poisson's ratio ν = 0.20 (Luo et al., 2021). Retains ~76% of pristine graphene's stiffness.",
        energetics: "Formation energy ΔE = +0.456 eV/atom relative to graphene (Standard experimental benchmark for viable 2D allotropes).",
        catalysis: "Spontaneous hydrogen chemisorption at 4-ring and 8-ring bridgeheads with near-zero free energy (ΔG_H* → 0 eV).",
        citations: [
          { authors: "Fan, Q., Yan, L., Tripp, M. W. et al.", title: "Biphenylene network: A non-benzenoid carbon allotrope", journal: "Science", year: "2021", doi: "10.1126/science.abg4509" },
          { authors: "Luo, Y., Ren, C., Xu, Y. et al.", title: "First-principles study of two-dimensional biphenylene: Dirac cone, mechanical and optical properties", journal: "Sci. Rep.", year: "2021", doi: "10.1038/s41598-021-98261-0" },
          { authors: "Macmillan, L., Girão, E. C. & Meunier, V.", title: "Graph embedding tensor: unifying topological description, symmetry detection, and structure generation for two-dimensional carbon allotropes", journal: "npj Comput. Mater. 11, 1932", year: "2025", doi: "10.1038/s41524-025-01932-8" }
        ]
      }
    }
    if (id === 'graphene') {
      return {
        isSpecific: true,
        title: "Pristine Graphene (h6₁)",
        synthesis: "Isolated experimentally by mechanical exfoliation of graphite (Novoselov & Geim, Science 306:666, 2004; Nobel Prize 2010).",
        electronic: "Zero-gap semimetal governed by massless Dirac fermions at the K and K' valleys with Fermi velocity v_F ≈ 10⁶ m/s.",
        mechanics: "Intrinsic 2D Young's modulus Y₂D ≈ 340 N/m (E ≈ 1.0 TPa, Lee et al., Science 2008), intrinsic tensile strength ~130 GPa.",
        energetics: "Global minimum of sp² carbon (ΔE = 0.000 eV/atom). Defines the zero-energy reference datum for all 2D carbon allotropes.",
        catalysis: "Inert basal plane with highly endothermic hydrogen adsorption (ΔG_H* = +1.86 eV).",
        citations: [
          { authors: "Novoselov, K. S., Geim, A. K., Morozov, S. V. et al.", title: "Electric Field Effect in Atomically Thin Carbon Films", journal: "Science", year: "2004", doi: "10.1126/science.1102896" },
          { authors: "Castro Neto, A. H., Guinea, F., Peres, N. M. R. et al.", title: "The electronic properties of graphene", journal: "Rev. Mod. Phys.", year: "2009", doi: "10.1103/RevModPhys.81.109" },
          { authors: "Macmillan, L., Girão, E. C. & Meunier, V.", title: "Graph embedding tensor: unifying topological description, symmetry detection, and structure generation for two-dimensional carbon allotropes", journal: "npj Comput. Mater. 11, 1932", year: "2025", doi: "10.1038/s41524-025-01932-8" }
        ]
      }
    }
    return {
      isSpecific: false,
      title: allotrope?.name || '2D Carbon Allotrope',
      synthesis: "Theoretical planar or quasi-planar monolayer modeled via high-symmetry non-hexagonal polygon partitioning (Girão et al., Carbon 2023).",
      electronic: "Crystallographic unit cell and symmetry established. Topological Dirac arbitration governed by wallpaper group and ring incidence (Macmillan et al., npj Comput. Mater. 2025).",
      mechanics: `Relaxed in-plane 2D unit cell: a = ${effA.toFixed(3)} Å, b = ${effB.toFixed(3)} Å, density = ${Number(allotrope?.density_g_cm3 || allotrope?.density || 0.35).toFixed(3)} g/cm³.`,
      energetics: `PBE-D3 ground state formation energy ΔE = +${Number(allotrope?.energy != null ? allotrope.energy : allotrope?.delta_e_ev_per_atom || 0).toFixed(3)} eV/atom above graphene.`,
      catalysis: "Non-hexagonal ring boundaries and Wyckoff coordination geometries establish site-resolved Sabatier activity baselines.",
      citations: [
        { authors: "Macmillan, L., Girão, E. C. & Meunier, V.", title: "Graph embedding tensor: unifying topological description, symmetry detection, and structure generation for two-dimensional carbon allotropes", journal: "npj Comput. Mater. 11, 1932", year: "2025", doi: "10.1038/s41524-025-01932-8" },
        { authors: "Girão, E. C., Liang, L., Rodrigues, V. et al.", title: "Taxonomy and properties of 2D carbon allotropes", journal: "Carbon 203, 611-619", year: "2023", doi: "10.1016/j.carbon.2022.11.077" },
        { authors: "Girão, E. C. et al.", title: "2D Carbon Allotropes Catalog and CIF Structures", journal: "Mendeley Data, V2", year: "2023", doi: "10.17632/fs42cypny7.2" }
      ]
    }
  }, [allotrope, effA, effB])

  // Download CIF file helper
  const handleDownloadCif = () => {
    if (isPhoth) {
      const a = document.createElement('a')
      a.href = '/calculations/photh/photh_graphene_vasp.cif'
      a.download = 'photh_graphene_vasp.cif'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }
    const content = allotrope?.cif_content || allotrope?.cifContent || ''
    if (!content) return
    const blob = new Blob([content], { type: 'chemical/x-cif' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${allotrope?.id || 'allotrope'}_relaxed.cif`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Color helper for signed Bader net charge Q_net = Z_val - N_Bader
  // Positive (+): electron depletion -> terracotta/copper #c97b5d
  // Negative (-): electron accumulation -> deep forest/emerald #244b3e
  const getBaderColor = (charge) => {
    if (charge > 0.05) return '#c97b5d' // strong depletion
    if (charge > 0.00) return '#df9b7e' // mild depletion
    if (charge < -0.05) return '#1b4332' // strong accumulation
    if (charge < 0.00) return '#2d6a4f' // mild accumulation
    return '#52796f' // neutral
  }

  // Authentic in-plane cell area: A = |a x b| = a * b * sin(gamma)
  const gammaDeg = Number(allotrope?.in_plane_lattice?.angle || allotrope?.lattice?.gamma || (allotrope?.crystal_system === 'Hexagonal' ? 120 : 90))
  const gammaRad = (gammaDeg * Math.PI) / 180
  const authenticPlanarArea = allotrope?.planar_area_angstrom2
    ? Number(allotrope.planar_area_angstrom2)
    : (effA * effB * Math.sin(gammaRad))

  const structureRefs = useMemo(() => {
    return getReferencesForStructure(allotrope)
  }, [allotrope])

  const totalCellAtoms = allotrope?.natoms || (Array.isArray(allotrope?.atoms) ? allotrope.atoms.length : (isPhoth ? 10 : 2))

  // Didactic proportional supercell options based on lattice a/b aspect ratio
  const didacticSupercells = useMemo(() => {
    return computeDidacticSupercells(effA, effB, gammaDeg)
  }, [effA, effB, gammaDeg])

  // Typed scientific data availability model across structure, electronic, mechanical, and catalysis
  const scientificCoverage = useMemo(() => {
    return getScientificDataCoverage(allotrope)
  }, [allotrope])

  // True 2D monolayer physical areal mass density (mg/m²)
  const trueArealDensity = useMemo(() => {
    return computeArealDensityMgM2(totalCellAtoms, authenticPlanarArea)
  }, [totalCellAtoms, authenticPlanarArea])

  return (
    <section id="ab-initio-lab" className="workbench-lab-container" data-scroll-reveal>
      {/* 1. COMPACT PROFESSIONAL HEADER (Layer A: Structure Identity & Context) */}
      <header className="cad-structure-header">
        <div className="cad-header-left">
          {onBackToCatalog && (
            <button
              type="button"
              className="wb-back-to-catalog-btn"
              onClick={onBackToCatalog}
              title="Return to Materials Catalog"
            >
              <ArrowLeft size={13} />
              <span>Back to Materials Catalog</span>
            </button>
          )}
          <div className="cad-header-title-row">
            <h1 className="cad-structure-title">
              {isPhoth ? 'PHOTH-Graphene' : (isNamedAllotrope(allotrope) ? allotrope.name : `Allotrope ${allotrope?.code || allotrope?.id || ''}`)}
            </h1>
            <span className="cad-structure-formula">
              (<MathTex math={`\\text{C}_{${allotrope?.natoms || (Array.isArray(allotrope?.atoms) ? allotrope.atoms.length : (isPhoth ? 10 : 2))}}`} />)
            </span>
            <span className="cad-structure-badge-girao" title="Girão polygon taxonomy notation">
              <ScientificFormula text={isPhoth ? "r4¹·6¹·8¹ (#25)" : getGiraoNotation(allotrope)} />
            </span>
            <span className="cad-structure-badge-sym" title="Crystallographic space group and 2D wallpaper group">
              {allotrope?.space_group_symbol || allotrope?.spaceGroup || 'Pmm2 (#25)'} · 2D: {allotrope?.wallpaper_group || allotrope?.wallpaperGroup || 'pmm'}
            </span>
            <span className="cad-structure-badge-energy" title="DFT formation energy per atom relative to pristine graphene">
              <MathTex math={`\\Delta E = +${Number(allotrope?.energy != null ? allotrope.energy : allotrope?.delta_e_ev_per_atom || (isPhoth ? 0.539 : 0)).toFixed(3)}\\text{ eV/atom}`} />
            </span>
          </div>
        </div>

        <div className="cad-header-actions">
          {structureRefs && structureRefs.length > 0 && (
            <button
              type="button"
              className="cad-header-action-btn"
              onClick={() => setActiveModule('provenance')}
              title={`View ${structureRefs.length} literature references`}
            >
              <BookOpen size={13} />
              <span>Literature ({structureRefs.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenExportDrawer ? onOpenExportDrawer(allotrope) : handleDownloadCif()}
            className="cad-header-action-btn"
            title="Download Authentic Relaxed Unit Cell CIF or Configure Supercell"
          >
            <Download size={13} />
            <span>CIF Geometry</span>
          </button>
          {isPhoth && (
            <a
              href="./calculations/photh/bader_strained_summary.csv"
              download
              className="cad-header-action-btn"
              title="Download Complete Bader Charges CSV"
            >
              <FileSpreadsheet size={13} />
              <span>Export CSV</span>
            </a>
          )}
          <button
            type="button"
            className={`cad-header-action-btn ${isExpandedLattice ? 'active' : ''}`}
            onClick={() => setIsExpandedLattice(!isExpandedLattice)}
            title={isExpandedLattice ? "Side-by-side View with Inspector" : "Expand Viewport (Hide Inspector)"}
          >
            {isExpandedLattice ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isExpandedLattice ? "Side View" : "Expand"}</span>
          </button>
        </div>
      </header>

      {/* 2. PERSISTENT TELEMETRY & PARAMETER BAR */}
      <div className="cad-telemetry-bar">
        {/* Wyckoff Orbit Quick Selector */}
        <div className="cad-telemetry-group">
          <span className="cad-telemetry-label">Wyckoff Orbit:</span>
          <div className="cad-telemetry-pills" role="radiogroup" aria-label="Wyckoff site selector">
            {dynamicWyckoffSites.map((ws) => {
              const isSelected = selectedSite === ws.site
              return (
                <button
                  key={ws.site}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedSite(ws.site)
                    setSelectedObject({
                      type: 'orbit',
                      site: ws.site,
                      wyckoff: ws.wyckoff_letter || ws.wyckoff || '2d',
                      mult: ws.mult,
                      siteSymmetry: ws.site_symmetry || '.m.',
                      role: ws.role,
                      frac: [ws.x, ws.y, ws.z || 0],
                      cart: ws.cart,
                      baderCharge: currentBaderCharges[ws.site] !== undefined ? currentBaderCharges[ws.site] : ws.bader_0,
                      herEnergy: ws.dG_her_eV
                    })
                  }}
                  className={`cad-telemetry-pill ${isSelected ? 'active' : ''}`}
                  title={`Select site ${ws.site} (${ws.mult} atoms/cell) - ${ws.role}`}
                >
                  <span className="site-letter">{ws.site}</span>
                  <span className="site-mult">×{ws.mult}</span>
                </button>
              )
            })}
          </div>
        </div>

        {isPhoth ? (
          <>
            {/* Strain Tensor Mode */}
            <div className="cad-telemetry-group">
              <span className="cad-telemetry-label">Tensor:</span>
              <div className="cad-telemetry-pills">
                {data.strain_series.modes.map((m) => (
                  <button
                    key={m.id}
                    className={`cad-telemetry-pill ${strainMode === m.id ? 'active' : ''}`}
                    onClick={() => setStrainMode(m.id)}
                  >
                    {m.id === 'Biaxial' ? 'Biaxial' : m.id === 'X' ? 'Armchair (X)' : 'Zigzag (Y)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Strain Magnitude */}
            <div className="cad-telemetry-group">
              <span className="cad-telemetry-label">ε:</span>
              <div className="cad-telemetry-pills">
                {currentPoints.map((pt, idx) => (
                  <button
                    key={pt.strain_pct}
                    className={`cad-telemetry-pill ${strainIndex === idx ? 'active' : ''}`}
                    onClick={() => setStrainIndex(idx)}
                    title={`Apply ${pt.strain_pct} ${strainMode} strain`}
                  >
                    {pt.strain_pct}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Values HUD */}
            <div className="cad-telemetry-hud">
              <span className="hud-metric"><strong>a</strong> = {strainedLatticeA} Å</span>
              <span className="hud-sep">·</span>
              <span className="hud-metric"><strong>b</strong> = {strainedLatticeB} Å</span>
              <span className="hud-sep">·</span>
              <span className="hud-metric">
                <strong>Q<sub>net</sub>({selectedSite})</strong> ={' '}
                <span style={{ color: instSiteCharge >= 0 ? '#c97b5d' : '#1b4332', fontWeight: 700 }}>
                  {instSiteCharge >= 0 ? `+${instSiteCharge.toFixed(4)}` : instSiteCharge.toFixed(4)} e
                </span>
              </span>
              <span className="hud-sep">·</span>
              <span className="hud-metric">
                <strong><MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} /></strong> = +{activeHerEnergy.toFixed(2)} eV
              </span>
            </div>
          </>
        ) : (
          <div className="cad-telemetry-hud">
            <span className="hud-metric"><strong>a</strong> = {effA.toFixed(3)} Å</span>
            <span className="hud-sep">·</span>
            <span className="hud-metric"><strong>b</strong> = {effB.toFixed(3)} Å</span>
            <span className="hud-sep">·</span>
            <span className="hud-metric">
              <strong>Area</strong> = {authenticPlanarArea.toFixed(2)} Å²
            </span>
            <span className="hud-sep">·</span>
            <span className="hud-metric">
              <strong>σ<sub>2D</sub></strong> = {trueArealDensity ? `${trueArealDensity.toFixed(3)} mg/m²` : '0.760 mg/m²'}
            </span>
            <span className="hud-sep">·</span>
            <span className="hud-metric">
              <strong>d̄<sub>C-C</sub></strong> = {bondStats.avg} Å ({bondStats.count} bonds)
            </span>
            <span className="hud-sep">·</span>
            <span className="hud-metric" style={{ color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} /> {allotrope?.status === 'relaxed_dft' || isPhoth ? 'Relaxed PBE-D3' : 'Literature Ground State CIF'}
            </span>
          </div>
        )}
      </div>

      {/* 3. RESIZABLE SPLIT-PANE CAD WORKSPACE */}
      <div
        className={`cad-workspace-container ${isExpandedLattice ? 'expanded' : ''}`}
        ref={splitContainerRef}
        style={{
          gridTemplateColumns: isExpandedLattice
            ? '1fr 0px 0px'
            : `${splitRatio}% 8px calc(${100 - splitRatio}% - 8px)`
        }}
      >
        {/* VIEWPORT PANE (Left / Main) */}
        <div className="cad-viewport-pane">
          {/* Primary CAD Command Bar (Section 5: Selection | View | Cell | Overlays | Export) */}
          <div className="cad-command-bar">
            {/* Group 1: Selection Mode */}
            <div className="cad-cmd-group">
              <span className="cad-cmd-label">Select:</span>
              <div className="cad-cmd-btn-strip">
                <button
                  type="button"
                  className={`cad-cmd-btn ${selectionMode === 'atom' ? 'active' : ''}`}
                  onClick={() => setSelectionMode('atom')}
                  title="Atom picking mode"
                >
                  <Atom size={12} />
                  <span>Atom</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${selectionMode === 'orbit' ? 'active' : ''}`}
                  onClick={() => setSelectionMode('orbit')}
                  title="Wyckoff orbit picking mode"
                >
                  <CircleDot size={12} />
                  <span>Orbit</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${selectionMode === 'bond' ? 'active' : ''}`}
                  onClick={() => setSelectionMode('bond')}
                  title="Bond picking mode"
                >
                  <Share2 size={12} />
                  <span>Bond</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${selectionMode === 'ring' ? 'active' : ''}`}
                  onClick={() => setSelectionMode('ring')}
                  title="Ring polygon picking mode"
                >
                  <Hexagon size={12} />
                  <span>Ring</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${selectionMode === 'measure' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectionMode('measure')
                    setMeasurePoints({ p1: null, p2: null })
                  }}
                  title="Distance measurement caliper (Click two atoms in 3D)"
                >
                  <Compass size={12} />
                  <span>Measure</span>
                </button>
              </div>
            </div>

            {/* Group 2: View Controls */}
            <div className="cad-cmd-group">
              <span className="cad-cmd-label">View:</span>
              <div className="cad-cmd-btn-strip">
                <button
                  type="button"
                  className={`cad-cmd-btn ${!is2DMode ? 'active' : ''}`}
                  onClick={() => {
                    setIs2DMode(false)
                    setCameraView('iso')
                  }}
                  title="3D WebGL Orbit View [1]"
                >
                  <Box size={12} />
                  <span>3D</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${is2DMode && cameraView === 'top' ? 'active' : ''}`}
                  onClick={() => {
                    setIs2DMode(true)
                    setCameraView('top')
                  }}
                  title="2D Top Orthographic View along layer normal (c) [2]"
                >
                  <Grid size={12} />
                  <span>2D (c)</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${cameraView === 'side' ? 'active' : ''}`}
                  onClick={() => {
                    setIs2DMode(false)
                    setCameraView('side')
                  }}
                  title="Side View along (b) [3]"
                >
                  <span>Side (b)</span>
                </button>
                <button
                  type="button"
                  className="cad-cmd-btn"
                  onClick={() => setFitTrigger(prev => prev + 1)}
                  title="Fit structure to viewport bounds [F]"
                >
                  <Maximize size={12} />
                  <span>Fit [F]</span>
                </button>
                <button
                  type="button"
                  className="cad-cmd-btn"
                  onClick={() => setResetTrigger(prev => prev + 1)}
                  title="Reset camera orientation & zoom [R]"
                >
                  <RotateCcw size={12} />
                  <span>Reset [R]</span>
                </button>
              </div>
            </div>

            {/* Group 3: Didactic Supercell Repeats */}
            <div className="cad-cmd-group">
              <span className="cad-cmd-label">Cell:</span>
              <div className="cad-cmd-btn-strip">
                {didacticSupercells.options.map(sc => {
                  const isActive = supercellDim[0] === sc.dim[0] && supercellDim[1] === sc.dim[1]
                  return (
                    <button
                      key={sc.label}
                      type="button"
                      className={`cad-cmd-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSupercellDim(sc.dim)}
                      title={sc.reason ? `${sc.reason} (${totalCellAtoms * sc.dim[0] * sc.dim[1]} atoms)` : `Display ${sc.label} periodic supercell (${totalCellAtoms * sc.dim[0] * sc.dim[1]} atoms)`}
                    >
                      <span>{sc.label}</span>
                      {sc.tag === '★ Proportional' && <small style={{ fontSize: '9px', marginLeft: 2, color: '#ca8a04', fontWeight: 800 }}>★</small>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Group: Atom Sphere Sizing */}
            <div className="cad-cmd-group">
              <span className="cad-cmd-label">Atom Size:</span>
              <div className="cad-cmd-btn-strip">
                {[
                  { label: '0.6×', val: 0.6, title: 'Compact radius for dense supercells & small cavities' },
                  { label: '1.0×', val: 1.0, title: 'Standard crystallographic ball-and-stick' },
                  { label: '1.4×', val: 1.4, title: 'Enhanced atom visibility' },
                  { label: '2.0×', val: 2.0, title: 'Space-filling CPK style' }
                ].map(sz => (
                  <button
                    key={sz.label}
                    type="button"
                    className={`cad-cmd-btn ${atomScaleFactor === sz.val ? 'active' : ''}`}
                    onClick={() => setAtomScaleFactor(sz.val)}
                    title={sz.title}
                  >
                    <span>{sz.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group 4: Presentation Overlays */}
            <div className="cad-cmd-group">
              <span className="cad-cmd-label">Overlays:</span>
              <div className="cad-cmd-btn-strip">
                <button
                  type="button"
                  className={`cad-cmd-btn ${overlays.unitCell ? 'active' : ''}`}
                  onClick={() => setOverlays(prev => ({ ...prev, unitCell: !prev.unitCell }))}
                  title="Toggle unit cell boundaries"
                >
                  <span>Cell Box</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${overlays.atomLabels ? 'active' : ''}`}
                  onClick={() => setOverlays(prev => ({ ...prev, atomLabels: !prev.atomLabels }))}
                  title="Toggle atom site labels"
                >
                  <span>Labels</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${overlays.rings ? 'active' : ''}`}
                  onClick={() => setOverlays(prev => ({ ...prev, rings: !prev.rings }))}
                  title="Toggle 3D ring polygons"
                >
                  <span>Rings</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${overlays.axes ? 'active' : ''}`}
                  onClick={() => setOverlays(prev => ({ ...prev, axes: !prev.axes }))}
                  title="Toggle crystallographic axes (a, b)"
                >
                  <span>Axes</span>
                </button>
                <button
                  type="button"
                  className={`cad-cmd-btn ${overlays.bondLengths ? 'active' : ''}`}
                  onClick={() => {
                    setOverlays(prev => ({ ...prev, bondLengths: !prev.bondLengths }))
                    setShowBondLengths(!showBondLengths)
                  }}
                  title="Toggle DFT bond length badges"
                >
                  <span>Bonds</span>
                </button>
                {isPhoth && (
                  <button
                    type="button"
                    className={`cad-cmd-btn ${overlays.hydrogen ? 'active' : ''}`}
                    onClick={() => setOverlays(prev => ({ ...prev, hydrogen: !prev.hydrogen }))}
                    title="Toggle H* adatom chemisorption site geometry"
                  >
                    <span>H* Adatom</span>
                  </button>
                )}
              </div>
            </div>

            {/* Group 5: Screenshot Export */}
            <div className="cad-cmd-group" style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className="cad-cmd-btn"
                onClick={handleScreenshotExport}
                title="Capture publication-ready PNG snapshot of current WebGL scene"
              >
                <Camera size={12} />
                <span>Snapshot</span>
              </button>
            </div>
          </div>

          {/* Active Caliper Instruction Banner when in Measure Mode */}
          {selectionMode === 'measure' && (
            <div className="cad-caliper-banner">
              <div className="caliper-info">
                <Compass size={14} className="caliper-icon" />
                <span>
                  {!measurePoints.p1
                    ? 'Distance Measurement: Click first atom in 3D lattice'
                    : !measurePoints.p2
                      ? `First atom C${measurePoints.p1.atomIndex || ''} selected. Click second atom.`
                      : `Measured distance: ${selectedObject?.distance ? selectedObject.distance.toFixed(3) : '-'} Å between C${measurePoints.p1.atomIndex} and C${measurePoints.p2.atomIndex}`}
                </span>
              </div>
              {measurePoints.p1 && (
                <button
                  type="button"
                  className="caliper-reset-btn"
                  onClick={() => {
                    setMeasurePoints({ p1: null, p2: null })
                    setSelectedObject(null)
                  }}
                >
                  Clear Caliper
                </button>
              )}
            </div>
          )}

          {/* WebGL Canvas Viewport */}
          <div className="cad-canvas-wrapper">
            <Interactive3DLattice
              ref={interactiveLatticeRef}
              allotrope={allotrope}
              selectionMode={selectionMode}
              selectedObject={selectedObject}
              onSelectObject={(obj) => {
                setSelectedObject(obj)
                if (obj?.siteLabel) setSelectedSite(obj.siteLabel)
                if (obj?.type === 'atom' && obj?.atomIndex != null) {
                  setSelectedAtomIndex(obj.atomIndex)
                }
              }}
              selectedSite={selectedSite}
              onSelectSite={(site) => {
                setSelectedSite(site)
                const ws = dynamicWyckoffSites.find(s => s.site === site)
                if (ws) {
                  setSelectedObject({
                    type: 'orbit',
                    site: ws.site,
                    wyckoff: ws.wyckoff_letter || ws.wyckoff || '2d',
                    mult: ws.mult,
                    siteSymmetry: ws.site_symmetry || '.m.',
                    role: ws.role,
                    frac: [ws.x, ws.y, ws.z || 0],
                    cart: ws.cart,
                    baderCharge: currentBaderCharges[ws.site] !== undefined ? currentBaderCharges[ws.site] : ws.bader_0,
                    herEnergy: ws.dG_her_eV
                  })
                }
              }}
              measurePoints={measurePoints}
              onMeasureSelect={handleMeasureAtomSelect}
              cameraView={cameraView}
              is2DMode={is2DMode}
              fitTrigger={fitTrigger}
              resetTrigger={resetTrigger}
              supercellDim={supercellDim}
              atomScaleFactor={atomScaleFactor}
              overlays={overlays}
              strainA={parseFloat(strainedLatticeA)}
              strainB={parseFloat(strainedLatticeB)}
              strainGeom={currentStrainGeom}
              currentBaderCharges={currentBaderCharges}
              showBondLengths={overlays.bondLengths}
              showLabels={overlays.atomLabels}
              siteMap={atomSiteMap}
            />

            {/* Non-intrusive Docked Ring Legend (Only when showRings is on, replacing the old permanent bottom strip!) */}
            {overlays.rings && (
              <div className="cad-docked-ring-legend" aria-label="Elementary ring legend">
                <span className="ring-legend-title">Rings:</span>
                {isPhoth ? (
                  <>
                    <button
                      type="button"
                      className={`ring-dock-pill ${selectedObject?.type === 'ring' && selectedObject?.size === 4 ? 'active' : ''}`}
                      style={{ background: '#fefce8', borderColor: '#ca8a04', color: '#854d0e' }}
                      onClick={() => setSelectedObject({ type: 'ring', size: 4, area: 2.15, label: '4-Ring (r4)', atoms: [1, 2, 3, 4] })}
                    >
                      4-Ring (2.15 Å² · r4)
                    </button>
                    <button
                      type="button"
                      className={`ring-dock-pill ${selectedObject?.type === 'ring' && selectedObject?.size === 6 ? 'active' : ''}`}
                      style={{ background: '#f0fdf4', borderColor: '#16a34a', color: '#15803d' }}
                      onClick={() => setSelectedObject({ type: 'ring', size: 6, area: 5.19, label: '6-Ring (r6)', atoms: [4, 5, 6, 7, 8, 9] })}
                    >
                      6-Ring (5.19 Å² · r6)
                    </button>
                    <button
                      type="button"
                      className={`ring-dock-pill ${selectedObject?.type === 'ring' && selectedObject?.size === 8 ? 'active' : ''}`}
                      style={{ background: '#fdf2f8', borderColor: '#db2777', color: '#be185d' }}
                      onClick={() => setSelectedObject({ type: 'ring', size: 8, area: 10.32, label: '8-Ring Pore (r8)', atoms: [1, 2, 5, 7, 8, 10, 9, 6] })}
                    >
                      8-Ring Pore (10.32 Å² · r8)
                    </button>
                  </>
                ) : allotrope?.rings ? (
                  Object.entries(allotrope.rings).map(([rSize, rCount]) => {
                    const isSelected = selectedObject?.type === 'ring' && selectedObject?.size === Number(rSize)
                    return (
                      <button
                        key={`dock-ring-${rSize}`}
                        type="button"
                        className={`ring-dock-pill ${isSelected ? 'active' : ''}`}
                        style={{
                          background: rSize === '6' ? '#f0fdf4' : rSize === '4' ? '#fefce8' : rSize === '8' ? '#fdf2f8' : '#f0f9ff',
                          borderColor: rSize === '6' ? '#16a34a' : rSize === '4' ? '#ca8a04' : rSize === '8' ? '#db2777' : '#0284c7',
                          color: rSize === '6' ? '#15803d' : rSize === '4' ? '#854d0e' : rSize === '8' ? '#be185d' : '#0369a1'
                        }}
                        onClick={() => setSelectedObject({ type: 'ring', size: Number(rSize), count: rCount, label: `${rSize}-Ring` })}
                      >
                        {rSize}-Ring (×{rCount})
                      </button>
                    )
                  })
                ) : (
                  <span className="ring-dock-pill" style={{ background: '#f0fdf4', borderColor: '#16a34a', color: '#15803d' }}>
                    6-Ring Network
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SPLITTER: Draggable Divider */}
        {!isExpandedLattice && (
          <div
            className="cad-split-divider"
            onMouseDown={handleSplitterMouseDown}
            title="Drag to resize Atomic Viewport and Scientific Inspector"
          >
            <div className="cad-divider-grip" />
          </div>
        )}

        {/* SCIENTIFIC INSPECTOR PANE (Right) */}
        {!isExpandedLattice && (
          <div className="cad-inspector-pane">
            <div className="cad-inspector-content">
              {/* Context-Aware Inspector Header (Section 7) */}
              {selectedObject?.type === 'measurement' ? (
                /* STATE 1: DISTANCE MEASUREMENT */
                <div className="inspector-section-card">
                  <div className="inspector-card-header">
                    <span className="inspector-eyebrow">GEOMETRIC CALIPER</span>
                    <h3 className="inspector-card-title">Interatomic Distance</h3>
                  </div>
                  <div className="inspector-metrics-grid">
                    <div className="inspector-metric-card">
                      <span className="metric-label">Euclidean Distance</span>
                      <strong className="metric-val highlight">
                        {selectedObject.distance ? `${selectedObject.distance.toFixed(4)} Å` : 'Picking Point 2...'}
                      </strong>
                      <span className="metric-sub">Cartesian 3D norm</span>
                    </div>
                    {selectedObject.delta && (
                      <div className="inspector-metric-card">
                        <span className="metric-label">Displacement |Δr|</span>
                        <strong className="metric-val">
                          ({selectedObject.delta[0].toFixed(3)}, {selectedObject.delta[1].toFixed(3)}, {selectedObject.delta[2].toFixed(3)}) Å
                        </strong>
                        <span className="metric-sub">Δx, Δy, Δz</span>
                      </div>
                    )}
                  </div>
                  <div className="inspector-caliper-points">
                    <div className="caliper-pt-row">
                      <span className="pt-pin">P1</span>
                      <span className="pt-desc">
                        Atom C{selectedObject.p1?.atomIndex != null ? selectedObject.p1.atomIndex : ''} ({selectedObject.p1?.siteLabel || 'C1'})
                      </span>
                      <span className="pt-coords">
                        Frac ({selectedObject.p1?.frac?.[0]?.toFixed(3) || '0'}, {selectedObject.p1?.frac?.[1]?.toFixed(3) || '0'})
                      </span>
                    </div>
                    {selectedObject.p2 && (
                      <div className="caliper-pt-row">
                        <span className="pt-pin">P2</span>
                        <span className="pt-desc">
                          Atom C{selectedObject.p2?.atomIndex != null ? selectedObject.p2.atomIndex : ''} ({selectedObject.p2?.siteLabel || 'C2'})
                        </span>
                        <span className="pt-coords">
                          Frac ({selectedObject.p2?.frac?.[0]?.toFixed(3) || '0'}, {selectedObject.p2?.frac?.[1]?.toFixed(3) || '0'})
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="inspector-action-btn"
                    onClick={() => {
                      setMeasurePoints({ p1: null, p2: null })
                      setSelectedObject(null)
                    }}
                  >
                    Reset Measurement Caliper
                  </button>
                </div>
              ) : selectedObject?.type === 'bond' ? (
                /* STATE 2: BOND SELECTED */
                <div className="inspector-section-card">
                  <div className="inspector-card-header">
                    <span className="inspector-eyebrow">COVALENT INTERACTION</span>
                    <h3 className="inspector-card-title">
                      Bond C{selectedObject.atomA} — C{selectedObject.atomB}
                    </h3>
                  </div>
                  <div className="inspector-metrics-grid">
                    <div className="inspector-metric-card">
                      <span className="metric-label">Equilibrium Length</span>
                      <strong className="metric-val highlight">
                        {typeof selectedObject.distance === 'number' ? selectedObject.distance.toFixed(3) : selectedObject.distance} Å
                      </strong>
                      <span className="metric-sub">
                        {Number(selectedObject.distance) < 1.40 ? 'Localized Double Bond' : Number(selectedObject.distance) <= 1.45 ? 'Aromatic sp² Bond' : 'Single σ-Bond'}
                      </span>
                    </div>
                    <div className="inspector-metric-card">
                      <span className="metric-label">Periodic Connection</span>
                      <strong className="metric-val">
                        {selectedObject.isPeriodic ? 'Trans-Boundary' : 'Intra-Cell'}
                      </strong>
                      <span className="metric-sub">Unit cell topology</span>
                    </div>
                  </div>
                  <div className="inspector-site-tag-row">
                    <span className="inspector-site-tag">Endpoints: C{selectedObject.atomA} ↔ C{selectedObject.atomB}</span>
                    <button
                      type="button"
                      className="inspector-text-btn"
                      onClick={() => setSelectedObject(null)}
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              ) : selectedObject?.type === 'ring' ? (
                /* STATE 3: RING SELECTED */
                <div className="inspector-section-card">
                  <div className="inspector-card-header">
                    <span className="inspector-eyebrow">TOPOLOGICAL DEFECT / CYCLE</span>
                    <h3 className="inspector-card-title">{selectedObject.label || `${selectedObject.size}-Member Ring`}</h3>
                  </div>
                  <div className="inspector-metrics-grid">
                    <div className="inspector-metric-card">
                      <span className="metric-label">Polygon Vertices</span>
                      <strong className="metric-val highlight">{selectedObject.size} Carbons</strong>
                      <span className="metric-sub">{selectedObject.size === 6 ? 'Standard Benzenoid' : selectedObject.size === 4 ? 'Cyclobutadiene Strain' : `${selectedObject.size}-Ring Non-Hexagonal`}</span>
                    </div>
                    {selectedObject.area && (
                      <div className="inspector-metric-card">
                        <span className="metric-label">Planar Area</span>
                        <strong className="metric-val">{Number(selectedObject.area).toFixed(2)} Å²</strong>
                        <span className="metric-sub">Polygon projection</span>
                      </div>
                    )}
                  </div>
                  <div className="inspector-site-tag-row">
                    <span className="inspector-site-tag">Cycle vertices: {selectedObject.atoms ? selectedObject.atoms.map(a => `C${a}`).join(' - ') : `${selectedObject.size} sites`}</span>
                    <button
                      type="button"
                      className="inspector-text-btn"
                      onClick={() => setSelectedObject(null)}
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              ) : selectedObject?.type === 'atom' ? (
                /* STATE 4: ATOM SELECTED */
                <div className="inspector-section-card">
                  <div className="inspector-card-header">
                    <div>
                      <span className="inspector-eyebrow">ATOMIC SITE INSPECTOR</span>
                      <h3 className="inspector-card-title">
                        Atom C{selectedObject.atomIndex != null ? selectedObject.atomIndex : (selectedObject.id || 1)}
                        <span className="title-orbit-tag">({selectedObject.siteLabel || selectedSite})</span>
                      </h3>
                      <span className="inspector-coords-sub">
                        Frac: ({selectedObject.frac?.[0]?.toFixed(4) || currentSiteInfo.x.toFixed(4)}, {selectedObject.frac?.[1]?.toFixed(4) || currentSiteInfo.y.toFixed(4)}, {Number(selectedObject.frac?.[2] || currentSiteInfo.z || 0).toFixed(4)})
                      </span>
                    </div>
                    <div className="site-wyckoff-badge">
                      <span>Wyckoff {currentSiteInfo.wyckoff_letter || '2d'} · Mult: {currentSiteInfo.mult} ({currentSiteInfo.site_symmetry || '.m.'})</span>
                      <div style={{ marginTop: '2px', color: '#11362d', fontWeight: 700 }}>
                        {isPhoth ? `${currentStrainPct} ${strainMode}` : 'PBE-D3 Ground State'}
                      </div>
                    </div>
                  </div>

                  {isPhoth ? (
                    <div className="inspector-metrics-grid">
                      <div className="inspector-metric-card">
                        <span className="metric-label">Bader Net Charge</span>
                        <strong className="metric-val" style={{ color: instSiteCharge >= 0 ? '#c97b5d' : '#1b4332' }}>
                          {instSiteCharge >= 0 ? `+${instSiteCharge.toFixed(4)}` : instSiteCharge.toFixed(4)} e
                        </strong>
                        <span className="metric-sub">
                          ΔQ(ε): {deltaQ >= 0 ? `+${deltaQ.toFixed(4)}` : deltaQ.toFixed(4)} e
                        </span>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="metric-label">Hydrogen Adsorption</span>
                        <strong className="metric-val" style={{ color: activeHerEnergy <= 0.10 ? '#15803d' : '#9a3412' }}>
                          +{activeHerEnergy.toFixed(2)} eV
                        </strong>
                        <span className="metric-sub">
                          {activeHerEnergy <= 0.10 ? 'Optimal Sabatier Window' : 'Endothermic Volmer'}
                        </span>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="metric-label">Chemical Topology</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#164230' }}>
                          {currentSiteInfo.ring_junction || currentSiteInfo.role}
                        </span>
                        {currentSiteInfo.poav1_theta && (
                          <span className="metric-sub" style={{ color: '#c97b5d', fontWeight: 700 }}>
                            POAV1 θ_p = {currentSiteInfo.poav1_theta}°
                          </span>
                        )}
                      </div>
                      <div className="inspector-metric-card">
                        <span className="metric-label">Equilibrium (0%)</span>
                        <strong className="metric-val" style={{ color: eqSiteCharge >= 0 ? '#c97b5d' : '#1b4332' }}>
                          {eqSiteCharge >= 0 ? `+${eqSiteCharge.toFixed(4)}` : eqSiteCharge.toFixed(4)} e
                        </strong>
                        <span className="metric-sub">Z_val = 4.0 e</span>
                      </div>
                    </div>
                  ) : (
                    <div className="inspector-metrics-grid">
                      <div className="inspector-metric-card">
                        <span className="metric-label">Cartesian Coordinates</span>
                        <strong className="metric-val">
                          ({((selectedObject.frac?.[0] || currentSiteInfo.x) * effA).toFixed(3)}, {((selectedObject.frac?.[1] || currentSiteInfo.y) * effB).toFixed(3)}, 0.000) Å
                        </strong>
                        <span className="metric-sub">Real-space (x, y, z)</span>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="metric-label">Coordination</span>
                        <strong className="metric-val">3-Fold (sp²)</strong>
                        <span className="metric-sub">Planar Network</span>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="metric-label">Crystallographic Orbit</span>
                        <strong className="metric-val">Wyckoff {currentSiteInfo.wyckoff_letter || '2d'}</strong>
                        <span className="metric-sub">Multiplicity ×{currentSiteInfo.mult}</span>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="metric-label">Topological Role</span>
                        <strong className="metric-val">{currentSiteInfo.role || 'C-C Vertex'}</strong>
                        <span className="metric-sub">{currentSiteInfo.ring_junction || 'Polygon Vertex'}</span>
                      </div>
                    </div>
                  )}

                  <div className="inspector-action-row">
                    <button
                      type="button"
                      className="inspector-action-btn"
                      onClick={() => {
                        setSelectedObject({
                          type: 'orbit',
                          site: currentSiteInfo.site,
                          wyckoff: currentSiteInfo.wyckoff_letter || '2d',
                          mult: currentSiteInfo.mult,
                          siteSymmetry: currentSiteInfo.site_symmetry,
                          role: currentSiteInfo.role
                        })
                      }}
                    >
                      Highlight All Equivalent Atoms (×{currentSiteInfo.mult})
                    </button>
                    <button
                      type="button"
                      className="inspector-text-btn"
                      onClick={() => setSelectedObject(null)}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              ) : selectedObject?.type === 'orbit' ? (
                /* STATE 5: WYCKOFF ORBIT SELECTED */
                <div className="inspector-section-card">
                  <div className="inspector-card-header">
                    <div>
                      <span className="inspector-eyebrow">SYMMETRY ORBIT</span>
                      <h3 className="inspector-card-title">
                        Wyckoff Orbit {selectedObject.site} ({selectedObject.wyckoff || '2d'})
                      </h3>
                    </div>
                    <div className="site-wyckoff-badge">
                      <span>Multiplicity ×{selectedObject.mult} · {selectedObject.siteSymmetry || '.m.'}</span>
                    </div>
                  </div>
                  <div className="inspector-metrics-grid">
                    <div className="inspector-metric-card">
                      <span className="metric-label">Site Multiplicity</span>
                      <strong className="metric-val highlight">{selectedObject.mult} atoms/cell</strong>
                      <span className="metric-sub">Symmetry equivalent</span>
                    </div>
                    <div className="inspector-metric-card">
                      <span className="metric-label">Point Symmetry</span>
                      <strong className="metric-val">{selectedObject.siteSymmetry || '.m.'}</strong>
                      <span className="metric-sub">Site stabilizer</span>
                    </div>
                    {isPhoth && (
                      <div className="inspector-metric-card">
                        <span className="metric-label">Bader Charge</span>
                        <strong className="metric-val" style={{ color: instSiteCharge >= 0 ? '#c97b5d' : '#1b4332' }}>
                          {instSiteCharge >= 0 ? `+${instSiteCharge.toFixed(4)}` : instSiteCharge.toFixed(4)} e
                        </strong>
                        <span className="metric-sub">Net valence balance</span>
                      </div>
                    )}
                    <div className="inspector-metric-card">
                      <span className="metric-label">Structural Role</span>
                      <strong className="metric-val">{selectedObject.role || currentSiteInfo.role || 'Ring Boundary'}</strong>
                      <span className="metric-sub">Carbon skeleton</span>
                    </div>
                  </div>
                  <div className="inspector-site-tag-row">
                    <span className="inspector-site-tag">All {selectedObject.mult} sites highlighted in 3D lattice</span>
                    <button
                      type="button"
                      className="inspector-text-btn"
                      onClick={() => setSelectedObject(null)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE 6: DEFAULT / STRUCTURE OVERVIEW */
                <div className="inspector-section-card">
                  <div className="inspector-card-header">
                    <div>
                      <span className="inspector-eyebrow">CRYSTALLOGRAPHIC OVERVIEW</span>
                      <h3 className="inspector-card-title">
                        {isNamedAllotrope(allotrope) ? allotrope.name : `Allotrope ${allotrope?.code || allotrope?.id || 'PHOTH'}`}
                      </h3>
                      <span className="inspector-coords-sub">
                        {allotrope?.space_group_symbol || allotrope?.spaceGroup || 'Pmm2 (#25)'} · Wallpaper: {allotrope?.wallpaper_group || allotrope?.wallpaperGroup || 'pmm'}
                      </span>
                    </div>
                  </div>

                  <div className="inspector-metrics-grid">
                    <div className="inspector-metric-card">
                      <span className="metric-label">Planar Cell Area</span>
                      <strong className="metric-val highlight">
                        {authenticPlanarArea.toFixed(2)} Å²
                      </strong>
                      <span className="metric-sub">
                        Specific: {(authenticPlanarArea / totalCellAtoms).toFixed(3)} Å²/atom
                      </span>
                    </div>
                    <div className="inspector-metric-card">
                      <span className="metric-label">Relative Energy</span>
                      <strong className="metric-val" style={{ color: Number(allotrope?.energy != null ? allotrope.energy : allotrope?.delta_e_ev_per_atom || (isPhoth ? 0.539 : 0)) <= 0.456 ? '#15803d' : '#9a3412' }}>
                        +{Number(allotrope?.energy != null ? allotrope.energy : allotrope?.delta_e_ev_per_atom || (isPhoth ? 0.539 : 0)).toFixed(3)} eV
                      </strong>
                      <span className="metric-sub">
                        {Number(allotrope?.energy != null ? allotrope.energy : allotrope?.delta_e_ev_per_atom || (isPhoth ? 0.539 : 0)) <= 0.456 ? '≤ Biphenylene Benchmark' : '> Biphenylene (+0.456 eV)'}
                      </span>
                    </div>
                    <div className="inspector-metric-card">
                      <span className="metric-label">Monolayer Buckling</span>
                      <strong className="metric-val" style={{ color: Number(allotrope?.buckling_height_angstrom || 0) === 0 ? '#15803d' : '#b45309' }}>
                        {Number(allotrope?.buckling_height_angstrom || 0).toFixed(3)} Å
                      </strong>
                      <span className="metric-sub">
                        {Number(allotrope?.buckling_height_angstrom || 0) === 0 ? 'Strictly Planar (Δz = 0)' : 'Buckled / Corrugated'}
                      </span>
                    </div>
                    <div className="inspector-metric-card">
                      <span className="metric-label">2D Areal Density</span>
                      <strong className="metric-val">
                        {trueArealDensity ? `${trueArealDensity.toFixed(3)} mg/m²` : '0.760 mg/m²'}
                      </strong>
                      <span className="metric-sub">Monolayer mass σ</span>
                    </div>
                    <div className="inspector-metric-card">
                      <span className="metric-label">Inequivalent Sites</span>
                      <strong className="metric-val">{dynamicWyckoffSites.length} Orbits</strong>
                      <span className="metric-sub">{totalCellAtoms} total atoms/unit cell</span>
                    </div>
                  </div>

                  <div className="inspector-hint-box">
                    <span className="hint-icon">💡</span>
                    <span className="hint-text">
                      Click an atom, bond, or ring in the 3D lattice or use the Wyckoff pills above to inspect localized crystallographic and electronic properties.
                    </span>
                  </div>
                </div>
              )}

              {/* All Symmetry Sites Strip (Accessible non-WebGL site selector) */}
              <div className="site-distribution-strip">
                <div className="dist-strip-head">
                  <span>All Symmetry Sites ({dynamicWyckoffSites.length} Inequivalent)</span>
                  <span>Click to Focus</span>
                </div>
                <div className="dist-bars-grid">
                  {dynamicWyckoffSites.map((ws) => {
                    const q = currentBaderCharges[ws.site] !== undefined ? currentBaderCharges[ws.site] : ws.bader_0
                    const isTarget = ws.site === selectedSite
                    const isPos = q >= 0
                    return (
                      <div
                        key={ws.site}
                        className={`dist-row ${isTarget ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSite(ws.site)
                          setSelectedObject({
                            type: 'orbit',
                            site: ws.site,
                            wyckoff: ws.wyckoff_letter || ws.wyckoff || '2d',
                            mult: ws.mult,
                            siteSymmetry: ws.site_symmetry || '.m.',
                            role: ws.role,
                            frac: [ws.x, ws.y, ws.z || 0],
                            cart: ws.cart,
                            baderCharge: currentBaderCharges[ws.site] !== undefined ? currentBaderCharges[ws.site] : ws.bader_0,
                            herEnergy: ws.dG_her_eV
                          })
                        }}
                      >
                        <strong>{ws.site}</strong>
                        <div className="dist-track">
                          <div
                            className="dist-bar"
                            style={{
                              width: `${Math.min(100, isPhoth ? Math.abs(q) * 800 : (ws.mult / (allotrope?.natoms || 10)) * 100)}%`,
                              background: isPhoth ? (isPos ? '#c97b5d' : '#1b4332') : (isTarget ? '#1b4332' : '#52796f')
                            }}
                          />
                        </div>
                        <span className="dist-val">
                          {isPhoth ? (q >= 0 ? `+${q.toFixed(3)}` : q.toFixed(3)) : `×${ws.mult}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* LAYER C: PROGRESSIVE DISCLOSURE ACCORDIONS */}
              {/* Accordion 1: Full Wyckoff Partitioning Matrix */}
              <div className="cad-accordion-card">
                <button
                  type="button"
                  className="disclosure-toggle-btn"
                  onClick={() => setShowWyckoffTable(!showWyckoffTable)}
                >
                  <span>Full Wyckoff Partitioning Matrix</span>
                  {showWyckoffTable ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {showWyckoffTable && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="disclosure-body"
                  >
                    <table className="disclosure-wyckoff-table">
                      <thead>
                        <tr>
                          <th>Site</th>
                          <th>Mult</th>
                          <th>Frac (x, y)</th>
                          {isPhoth ? (
                            <>
                              <th>Q₀ (e)</th>
                              <th>Q(ε)</th>
                              <th>ΔG_H*</th>
                            </>
                          ) : (
                            <>
                              <th>Cart (x, y) Å</th>
                              <th>Role</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {dynamicWyckoffSites.map((ws) => {
                          const qInst = currentBaderCharges[ws.site] !== undefined ? currentBaderCharges[ws.site] : ws.bader_0
                          return (
                            <tr
                              key={ws.site}
                              className={ws.site === selectedSite ? 'active-row' : ''}
                              onClick={() => {
                                setSelectedSite(ws.site)
                                setSelectedObject({
                                  type: 'orbit',
                                  site: ws.site,
                                  wyckoff: ws.wyckoff_letter || ws.wyckoff || '2d',
                                  mult: ws.mult,
                                  siteSymmetry: ws.site_symmetry || '.m.',
                                  role: ws.role,
                                  frac: [ws.x, ws.y, ws.z || 0],
                                  cart: ws.cart,
                                  baderCharge: qInst,
                                  herEnergy: ws.dG_her_eV
                                })
                              }}
                            >
                              <td><strong>{ws.site}</strong></td>
                              <td>{ws.mult}</td>
                              <td>({ws.x.toFixed(3)}, {ws.y.toFixed(3)})</td>
                              {isPhoth ? (
                                <>
                                  <td>{ws.bader_0 >= 0 ? `+${ws.bader_0.toFixed(4)}` : ws.bader_0.toFixed(4)}</td>
                                  <td style={{ color: qInst >= 0 ? '#c97b5d' : '#1b4332' }}>
                                    {qInst >= 0 ? `+${qInst.toFixed(4)}` : qInst.toFixed(4)}
                                  </td>
                                  <td style={{ color: ws.dG_her_eV <= 0.10 ? '#15803d' : '#9a3412' }}>
                                    +{ws.dG_her_eV.toFixed(2)} eV
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>({(ws.cart?.[0] || 0).toFixed(2)}, {(ws.cart?.[1] || 0).toFixed(2)})</td>
                                  <td>{ws.role}</td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </div>

              {/* Accordion 2: Physical Conventions & DFT Parameters */}
              <div className="cad-accordion-card">
                <button
                  type="button"
                  className="disclosure-toggle-btn"
                  onClick={() => setShowConventions(!showConventions)}
                >
                  <span>{isPhoth ? 'Physical Conventions & Bader Reference' : 'DFT Ground State Relaxation Parameters'}</span>
                  {showConventions ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {showConventions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="disclosure-body"
                  >
                    {isPhoth ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <strong>Bader Convention:</strong> Q<sub>net</sub> = Z<sub>val</sub> − N<sub>Bader</sub> (Z<sub>val</sub> = 4.0 e). Positive values denote electron depletion; negative denote accumulation.
                        </div>
                        <div>
                          <strong>HER Energetics:</strong> <MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} /> is the thermodynamic chemisorption free energy, not a kinetic activation barrier. At +2% strain, C₁ reaches +0.08 eV.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', lineHeight: '1.5' }}>
                        <div>
                          <strong>Code & Pseudopotentials:</strong> VASP (PAW potentials, C 2s² 2p²).
                        </div>
                        <div>
                          <strong>Functional:</strong> GGA-PBE with Grimme D2/D3 van der Waals dispersion corrections.
                        </div>
                        <div>
                          <strong>Convergence Thresholds:</strong> Plane-wave kinetic cutoff <MathTex math="E_{\mathrm{cut}} = 500\text{ eV}" inline={true} />, force convergence <MathTex math="|F_i| < 0.01\text{ eV/\AA}" inline={true} />, energy tolerance <MathTex math="10^{-6}\text{ eV}" inline={true} />.
                        </div>
                        <div>
                          <strong>Monolayer Isolation:</strong> Vacuum spacing <MathTex math="c \approx 20\text{ \AA}" inline={true} /> prevents spurious interlayer interaction.
                        </div>
                        <div>
                          <strong>Provenance Source:</strong> Girão et al., <em>Carbon</em> 203 (2023) 611-619; Mendeley Data V2, DOI: 10.17632/fs42cypny7.2.
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* 4. COMPACT ANALYSIS TABS */}
      <div className="workbench-tabs-bar" role="tablist" aria-label="Analysis modules">
        {[
          { id: 'cdd', code: '01', title: 'CDD Slices & Breathing', icon: Layers },
          { id: 'bands', code: '02', title: 'Electronic Bands (PBE vs HSE06)', icon: Activity },
          { id: 'bader', code: '03', title: 'Bader Charge Explorer', icon: Atom },
          { id: 'her', code: '04', title: 'HER Catalytic Studio', icon: FlaskConical },
          { id: 'strain', code: '05', title: 'Elastic Basin & Mechanics', icon: TrendingUp },
          { id: 'provenance', code: '06', title: 'Provenance & Export', icon: Cpu }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeModule === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`wb-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveModule(tab.id)}
            >
              <Icon size={14} className="tab-icon" />
              <span className="tab-code">{tab.code}</span>
              <span className="tab-title">{tab.title}</span>
            </button>
          )
        })}
      </div>

      {/* 5. ACTIVE MODULE WORKSPACE PANELS */}
      <main className="pulmify-module-workspace">
        {/* ==================================================================== */}
        {/* NON-PHOTH ALLOTROPES: LITERATURE BENCHMARKS & COMPUTATIONAL STATUS  */}
        {/* ==================================================================== */}
        {!isPhoth && activeModule !== 'provenance' && (
          <div className="module-panel literature-status-panel">
            {/* Context-aware, honest empty state depending on activeModule */}
            {activeModule === 'cdd' && (
              <div className="module-empty-state-card">
                <div className="empty-state-head">
                  <div>
                    <span className="module-kicker">01 — 3D CHARGE DENSITY DIFFERENCE (CDD)</span>
                    <h3 className="empty-state-title">
                      First-Principles Electron Density Not Yet Calculated
                    </h3>
                    <p className="empty-state-desc">
                      No 3D electronic charge density distribution (<MathTex math="\rho(\mathbf{r})" inline={true} />) or differential isosurface is recorded for this allotrope. Full CDD analysis requires converged self-consistent electron density FFT grids (<MathTex math="\mathrm{CHGCAR}" inline={true} />) for both pristine and strained lattice configurations.
                    </p>
                  </div>
                  <div className="panel-actions-cluster">
                    <button
                      className="btn-download-asset"
                      onClick={() => onSelectAllotrope?.('photh_graphene')}
                      title="Switch to PHOTH-graphene reference suite to view authentic CDD isosurfaces"
                    >
                      <FlaskConical size={13} /> Load PHOTH Reference Suite
                    </button>
                    <button
                      className="btn-download-asset"
                      onClick={handleDownloadCif}
                    >
                      <Download size={13} /> Download Relaxed CIF
                    </button>
                  </div>
                </div>

                <div className="empty-state-metrics-grid">
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Covalent Network</span>
                    <strong className="empty-metric-val">{bondStats.count} bonds</strong>
                    <span className="empty-metric-sub">Planar 3-connected sp²</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Mean C-C Distance</span>
                    <strong className="empty-metric-val">{bondStats.avg} Å</strong>
                    <span className="empty-metric-sub">Min: {bondStats.min} Å · Max: {bondStats.max} Å</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">2D Areal Density (σ)</span>
                    <strong className="empty-metric-val">{trueArealDensity ? `${trueArealDensity.toFixed(3)} mg/m²` : '0.760 mg/m²'}</strong>
                    <span className="empty-metric-sub">Physical monolayer mass</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Planar Unit Cell Area</span>
                    <strong className="empty-metric-val">{authenticPlanarArea.toFixed(2)} Å²</strong>
                    <span className="empty-metric-sub">Lattice a={effA.toFixed(3)} Å, b={effB.toFixed(3)} Å</span>
                  </div>
                </div>
              </div>
            )}

            {activeModule === 'bands' && (
              <div className="module-empty-state-card">
                <div className="empty-state-head">
                  <div>
                    <span className="module-kicker">02 — ELECTRONIC BANDS & DIRAC TOPOLOGY</span>
                    <h3 className="empty-state-title">
                      First-Principles Eigenvalue Dispersion Not Yet Calculated
                    </h3>
                    <p className="empty-state-desc">
                      No converged Kohn–Sham electronic band eigenvalues or density of states are registered for this allotrope. Band structures, Fermi velocities, and screened hybrid functional corrections (HSE06) require a non-SCF k-path run from a converged self-consistent charge density.
                    </p>
                  </div>
                  <div className="panel-actions-cluster">
                    <button
                      className="btn-download-asset"
                      onClick={() => onSelectAllotrope?.('photh_graphene')}
                      title="Inspect authentic VASP GGA-PBE and HSE06 band dispersion for PHOTH-graphene"
                    >
                      <Activity size={13} /> Load PHOTH Reference Suite
                    </button>
                    <button
                      className="btn-download-asset"
                      onClick={handleDownloadCif}
                    >
                      <Download size={13} /> Download Relaxed CIF
                    </button>
                  </div>
                </div>

                <div className="empty-state-metrics-grid">
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Plane Symmetry</span>
                    <strong className="empty-metric-val">{allotrope?.wallpaper_group || 'pmm'}</strong>
                    <span className="empty-metric-sub">{allotrope?.space_group_symbol || 'Pmm2 (#25)'}</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Formation Energy (ΔE)</span>
                    <strong className="empty-metric-val">
                      {allotrope?.energy != null ? `+${Number(allotrope.energy).toFixed(3)} eV` : allotrope?.delta_e_ev_per_atom ? `+${Number(allotrope.delta_e_ev_per_atom).toFixed(3)} eV` : 'Pending DFT'}
                    </strong>
                    <span className="empty-metric-sub">Literature ground state</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Inequivalent Sites</span>
                    <strong className="empty-metric-val">{dynamicWyckoffSites.length} Orbits</strong>
                    <span className="empty-metric-sub">{totalCellAtoms} atoms/unit cell</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Brillouin Zone Path</span>
                    <strong className="empty-metric-val">Γ — X — M — Y — Γ</strong>
                    <span className="empty-metric-sub">Derived from 2D plane group</span>
                  </div>
                </div>
              </div>
            )}

            {activeModule === 'bader' && (
              <div className="module-empty-state-card">
                <div className="empty-state-head">
                  <div>
                    <span className="module-kicker">03 — BADER ATOMIC CHARGE EXPLORER</span>
                    <h3 className="empty-state-title">
                      Grid-Based Bader Charge Partitioning Not Yet Calculated
                    </h3>
                    <p className="empty-state-desc">
                      Bader charge transfer calculation requires all-electron or core-restored valence electron density grids (<MathTex math="\mathrm{CHGCAR} + \mathrm{AECCAR0/2}" inline={true} />) processed through the Henkelman zero-flux surface partitioning algorithm. Crystallographic Wyckoff partitioning classifies symmetry-equivalent atoms with geometric exactness below, but physical charge transfer <MathTex math="\Delta Q" inline={true} /> requires first-principles charge density.
                    </p>
                  </div>
                  <div className="panel-actions-cluster">
                    <button
                      className="btn-download-asset"
                      onClick={() => onSelectAllotrope?.('photh_graphene')}
                      title="Inspect authentic Henkelman Bader charge partitioning for PHOTH-graphene"
                    >
                      <Atom size={13} /> Load PHOTH Reference Suite
                    </button>
                    <button
                      className="btn-download-asset"
                      onClick={handleDownloadCif}
                    >
                      <Download size={13} /> Download Relaxed CIF
                    </button>
                  </div>
                </div>

                {/* Derived Wyckoff Symmetry Partitioning Table */}
                <div style={{ marginTop: '14px', overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ font: '700 12px "DM Mono", monospace', color: '#113826', textTransform: 'uppercase' }}>
                      Crystallographic Wyckoff Orbit Decomposition (Derived Geometry)
                    </span>
                    <span style={{ fontSize: '11px', color: '#637d6e' }}>
                      {dynamicWyckoffSites.length} Inequivalent Sites · Neutral Cell Geometry
                    </span>
                  </div>
                  <table className="pipeline-matrix-table" style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Orbit Site</th>
                        <th>Wyckoff Letter</th>
                        <th>Multiplicity</th>
                        <th>Site Stabilizer</th>
                        <th>Fractional Coordinates (x, y)</th>
                        <th>Structural Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dynamicWyckoffSites.map(ws => (
                        <tr key={ws.site}>
                          <td><strong>{ws.site}</strong></td>
                          <td>{ws.wyckoff_letter || ws.wyckoff || 'a'}</td>
                          <td>×{ws.mult} atoms/cell</td>
                          <td><code>{ws.site_symmetry || '.m.'}</code></td>
                          <td>({ws.x.toFixed(3)}, {ws.y.toFixed(3)})</td>
                          <td>{ws.role || 'Basal Skeleton'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeModule === 'her' && (
              <div className="module-empty-state-card">
                <div className="empty-state-head">
                  <div>
                    <span className="module-kicker">04 — HYDROGEN EVOLUTION REACTION (HER)</span>
                    <h3 className="empty-state-title">
                      Chemisorption Free Energies (<MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} />) Not Yet Calculated
                    </h3>
                    <p className="empty-state-desc">
                      Calculation of thermodynamic hydrogen chemisorption free energy requires full ionic relaxation of hydrogen-adsorbed slab supercells: <MathTex math="\Delta G_{\mathrm{H^*}} = \Delta E_{\mathrm{DFT}} + \Delta E_{\mathrm{ZPE}} - T\Delta S_{\mathrm{H}}" inline={true} />. Ring-vertex coordination classifies candidate chemisorption positions below, but authentic Sabatier activity requires DFT total energy minimization and vibrational zero-point corrections.
                    </p>
                  </div>
                  <div className="panel-actions-cluster">
                    <button
                      className="btn-download-asset"
                      onClick={() => onSelectAllotrope?.('photh_graphene')}
                      title="Inspect authentic HER adsorption free energy volcano and strain tuning in PHOTH"
                    >
                      <FlaskConical size={13} /> Load PHOTH Reference Suite
                    </button>
                    <button
                      className="btn-download-asset"
                      onClick={handleDownloadCif}
                    >
                      <Download size={13} /> Download Relaxed CIF
                    </button>
                  </div>
                </div>

                <div className="empty-state-metrics-grid">
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Candidate Adsorption Sites</span>
                    <strong className="empty-metric-val">{dynamicWyckoffSites.length} inequivalent sites</strong>
                    <span className="empty-metric-sub">Ring-boundary vertices</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Ring Topology</span>
                    <strong className="empty-metric-val">{allotrope?.rings ? Object.entries(allotrope.rings).map(([k, v]) => `${k}-Ring (×${v})`).join(', ') : 'Hexagonal sp²'}</strong>
                    <span className="empty-metric-sub">Elementary cycle basis</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Coordination Number</span>
                    <strong className="empty-metric-val">3-Fold sp² Carbon</strong>
                    <span className="empty-metric-sub">Euler invariant V − E + F = 0</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Catalytic Status</span>
                    <strong className="empty-metric-val" style={{ color: '#b45309' }}>Adsorption DFT Pending</strong>
                    <span className="empty-metric-sub">Requires H-slab relaxation</span>
                  </div>
                </div>
              </div>
            )}

            {activeModule === 'strain' && (
              <div className="module-empty-state-card">
                <div className="empty-state-head">
                  <div>
                    <span className="module-kicker">05 — ELASTIC BASIN & 2D MECHANICS</span>
                    <h3 className="empty-state-title">
                      21-Point DFT Dynamic Strain Series Not Yet Calculated
                    </h3>
                    <p className="empty-state-desc">
                      Evaluating non-linear 2D elastic stiffness, Poisson contraction, and strain-energy basins requires relaxing atomic coordinates across a 21-point biaxial and uniaxial strain grid (<MathTex math="\varepsilon \in [-3\%, +3\%]" inline={true} />). This calculation campaign has not yet been performed for this structure.
                    </p>
                  </div>
                  <div className="panel-actions-cluster">
                    <button
                      className="btn-download-asset"
                      onClick={() => onSelectAllotrope?.('photh_graphene')}
                      title="Inspect authentic 21-point dynamic strain basins and Poisson deformation for PHOTH"
                    >
                      <TrendingUp size={13} /> Load PHOTH Reference Suite
                    </button>
                    <button
                      className="btn-download-asset"
                      onClick={handleDownloadCif}
                    >
                      <Download size={13} /> Download Relaxed CIF
                    </button>
                  </div>
                </div>

                <div className="empty-state-metrics-grid">
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Equilibrium Lattice</span>
                    <strong className="empty-metric-val">a={effA.toFixed(3)} Å, b={effB.toFixed(3)} Å</strong>
                    <span className="empty-metric-sub">γ = {gammaDeg}°</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Cell Aspect Ratio</span>
                    <strong className="empty-metric-val">{didacticSupercells.ratio.toFixed(2)}</strong>
                    <span className="empty-metric-sub">{didacticSupercells.reason}</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Planar Area (A)</span>
                    <strong className="empty-metric-val">{authenticPlanarArea.toFixed(2)} Å²</strong>
                    <span className="empty-metric-sub">Ground state V₀</span>
                  </div>
                  <div className="empty-metric-box">
                    <span className="empty-metric-label">Mechanical Status</span>
                    <strong className="empty-metric-val" style={{ color: '#b45309' }}>Strain Grid Pending</strong>
                    <span className="empty-metric-sub">Requires 21 VASP runs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scientific Data Coverage & Provenance Matrix */}
            <div className="coverage-matrix-card">
              <div className="coverage-matrix-header">
                <div className="coverage-matrix-title-wrap">
                  <Database size={15} className="coverage-icon" />
                  <h5 className="coverage-matrix-title">Scientific Data Coverage & Provenance Matrix</h5>
                </div>
                <span className="coverage-matrix-tag">
                  Typed Data Availability Model · Zero Unverified Claims
                </span>
              </div>

              <div className="coverage-domains-grid">
                {Object.entries(scientificCoverage.domains).map(([domKey, dom]) => (
                  <div key={domKey} className="coverage-domain-card">
                    <div className="coverage-domain-head">
                      <span className="domain-label">{dom.title}</span>
                      <span className="domain-desc">{dom.description}</span>
                    </div>
                    <div className="coverage-items-list">
                      {dom.items.map(item => (
                        <div key={item.id} className={`coverage-item-row status-${item.status}`}>
                          <div className="item-name-col">
                            <span className="item-name">{item.name}</span>
                            <span className="item-provenance">{item.provenance}</span>
                          </div>
                          <div className="item-status-col">
                            <span className={`coverage-status-badge ${item.status}`}>
                              <span className="coverage-dot" />
                              {item.status === 'available' && 'Available'}
                              {item.status === 'derived' && 'Derived'}
                              {item.status === 'literature_reported' && 'Literature'}
                              {item.status === 'predicted_ml' && 'Predicted (ML)'}
                              {item.status === 'not_calculated' && 'Not Calculated'}
                            </span>
                            {item.value && (
                              <span className="item-value">{item.value}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peer-Reviewed Literature Citations Block */}
            <div className="lit-citations-block">
              <div className="lit-citations-title">
                <BookOpen size={14} />
                <span>Verified Peer-Reviewed Literature & Computational Provenance</span>
              </div>
              {litBenchmark.citations.map((cit, idx) => (
                <div key={idx} className="lit-citation-item">
                  <strong>{cit.authors}</strong> ({cit.year}). &ldquo;{cit.title}&rdquo;. <em>{cit.journal}</em>.
                  {cit.doi && (
                    <>
                      {' '}
                      <a
                        href={`https://doi.org/${cit.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        DOI: {cit.doi}
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* NON-PHOTH ALLOTROPES: MODULE 06 PROVENANCE & RAW CIF EXPORT         */}
        {/* ==================================================================== */}
        {!isPhoth && activeModule === 'provenance' && (
          <div className="module-panel literature-status-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">06 — GROUND STATE PROVENANCE & CIF EXPORT</span>
                <h3 className="panel-title">
                  VASP PAW-PBE Ground State Relaxation Parameters & Structure File
                </h3>
                <p className="panel-desc">
                  Complete ground state crystallographic metadata, DFT relaxation thresholds, and raw Crystallographic Information File (CIF) for <strong>{allotrope?.name || 'this allotrope'}</strong>.
                </p>
              </div>

              <div className="panel-actions-cluster">
                <button
                  className="btn-download-asset"
                  onClick={handleDownloadCif}
                >
                  <Download size={13} /> Download Relaxed CIF
                </button>
                <button
                  className="btn-download-asset"
                  onClick={() => handleCopy(allotrope?.cif_content || allotrope?.cifContent || '', 'cif_raw')}
                >
                  {copiedField === 'cif_raw' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedField === 'cif_raw' ? 'CIF Copied' : 'Copy CIF Text'}
                </button>
              </div>
            </div>

            {/* VASP Ground State Relaxation Specs */}
            <div className="dft-engine-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className="dft-spec-card">
                <div className="spec-card-head">
                  <Database size={15} />
                  <h5>VASP Ground-State Relaxation Methodology</h5>
                </div>
                <ul className="spec-bullet-list">
                  <li><strong>Engine:</strong> Vienna Ab initio Simulation Package (VASP)</li>
                  <li><strong>Pseudopotential:</strong> Projector Augmented-Wave (PAW) method (C 08Apr2002)</li>
                  <li><strong>Exchange-Correlation:</strong> GGA-PBE with Grimme D3 van der Waals correction</li>
                  <li><strong>Plane-Wave Cutoff:</strong> ENCUT = 500 eV</li>
                  <li><strong>SCF Convergence:</strong> EDIFF = 1.0 &times; 10<sup>-6</sup> eV</li>
                  <li><strong>Force Convergence:</strong> EDIFFG = -0.01 eV/Å (Max force on any atom &lt; 0.01 eV/Å)</li>
                  <li><strong>Vacuum Spacing:</strong> c &approx; 20 Å (Prevents spurious periodic image interaction)</li>
                  <li><strong>Brillouin Zone Mesh:</strong> Monkhorst-Pack grid with reciprocal spacing &lt; 0.02 Å<sup>-1</sup></li>
                </ul>
              </div>

              <div className="dft-spec-card">
                <div className="spec-card-head">
                  <Cpu size={15} />
                  <h5>Crystallographic Metrics & Ground-State Stability</h5>
                </div>
                <ul className="spec-bullet-list">
                  <li><strong>Allotrope Title:</strong> {allotrope?.name || '2D Carbon'}</li>
                  <li><strong>Girão Notation:</strong> {allotrope?.symbol || getGiraoNotation(allotrope)}</li>
                  <li><strong>Unit Cell Formula:</strong> {allotrope?.formula || 'C'}{allotrope?.natoms || allotrope?.atoms?.length || ''} ({allotrope?.natoms || allotrope?.atoms?.length || 0} atoms/cell)</li>
                  <li><strong>Space Group:</strong> {allotrope?.space_group || allotrope?.spaceGroup || 'P1'}</li>
                  <li><strong>Lattice Constants:</strong> a = {effA.toFixed(3)} Å, b = {effB.toFixed(3)} Å</li>
                  <li><strong>Planar Cell Area:</strong> {Number(allotrope?.planar_area_angstrom2 || (effA * effB)).toFixed(2)} Å²</li>
                  <li><strong>Buckling Height (Δz):</strong> {allotrope?.buckling_height_angstrom != null ? Number(allotrope.buckling_height_angstrom).toFixed(3) : '0.000'} Å {Number(allotrope?.buckling_height_angstrom || 0) > 0.05 ? '(Corrugated)' : '(Planar)'}</li>
                  <li><strong>Formation Energy (ΔE):</strong> {allotrope?.energy != null ? `+${Number(allotrope.energy).toFixed(3)} eV/atom (Literature Reported)` : allotrope?.delta_e_ev_per_atom ? `+${Number(allotrope.delta_e_ev_per_atom).toFixed(3)} eV/atom (Literature Reported)` : 'Pending DFT Ground State'}</li>
                  <li><strong>2D Areal Mass Density (σ):</strong> {trueArealDensity ? `${trueArealDensity.toFixed(3)} mg/m²` : '0.760 mg/m²'} (Monolayer areal formulation)</li>
                </ul>
              </div>
            </div>

            {/* Raw CIF File Code Viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: '700 12px "DM Mono", monospace', color: '#164230', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Raw Crystallographic Information File (CIF)
                </span>
                <span style={{ font: '11px "DM Mono", monospace', color: '#4a6d5c' }}>
                  {allotrope?.id ? `${allotrope.id}.cif` : 'structure.cif'}
                </span>
              </div>
              <pre className="cif-code-viewer">
                {allotrope?.cif_content || allotrope?.cifContent || '# No raw CIF embedded for this structure\n# Available via Mendeley Data: 10.17632/fs42cypny7.2'}
              </pre>
            </div>

            {/* Literature Citation */}
            <div className="lit-citations-block">
              <div className="lit-citations-title">
                <BookOpen size={14} />
                <span>Primary Crystallographic Data & Methodological Citations</span>
              </div>
              <div className="lit-citation-item">
                <strong>Macmillan, L., Girão, E. C. & Meunier, V.</strong> (2025). &ldquo;Graph embedding tensor: unifying topological description, symmetry detection, and structure generation for two-dimensional carbon allotropes&rdquo;. <em>npj Comput. Mater. 11</em>, 1932. <a href="https://doi.org/10.1038/s41524-025-01932-8" target="_blank" rel="noopener noreferrer">DOI: 10.1038/s41524-025-01932-8</a>
              </div>
              <div className="lit-citation-item">
                <strong>Girão, E. C., Liang, L., Rodrigues, V. et al.</strong> (2023). &ldquo;Taxonomy and properties of 2D carbon allotropes&rdquo;. <em>Carbon 203</em>, 611-619. <a href="https://doi.org/10.1016/j.carbon.2022.11.077" target="_blank" rel="noopener noreferrer">DOI: 10.1016/j.carbon.2022.11.077</a>
              </div>
              <div className="lit-citation-item">
                <strong>Girão, E. C. et al.</strong> (2023). &ldquo;2D Carbon Allotropes Catalog and CIF Structures&rdquo;. <em>Mendeley Data, V2</em>. <a href="https://doi.org/10.17632/fs42cypny7.2" target="_blank" rel="noopener noreferrer">DOI: 10.17632/fs42cypny7.2</a>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 01: CHARGE DENSITY DIFFERENCE STUDIO                         */}
        {/* ==================================================================== */}
        {/* ==================================================================== */}
        {/* MODULE 01: CHARGE DENSITY DIFFERENCE STUDIO                         */}
        {/* ==================================================================== */}
        {isPhoth && activeModule === 'cdd' && (
          <div className="module-panel cdd-studio-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">01 — CHARGE DENSITY DIFFERENCE STUDIO</span>
                <h3 className="panel-title">2D Planar Slices & 3D Volumetric Breathing under Strain</h3>
                <p className="panel-desc">
                  {cddFieldMode === 'total_rho' ? (
                    <>
                      <strong>Mode A: Total Valence Density</strong> <MathTex math="\rho(\mathbf{r}) \in [0.05, 2.20]\text{ e/\AA}^3" inline={true} /> (sequential dark purple to gold), highlighting covalent bond localization along the carbon ring edges.
                    </>
                  ) : (
                    <>
                      <strong>Mode B: Strain Charge Difference</strong> evaluated on matched fractional coordinates <MathTex math="\Delta\rho(\mathbf{s}) = \rho_{\mathrm{strained}}(\mathbf{s}) - \rho_{\mathrm{relaxed}}(\mathbf{s})" inline={true} /> with symmetric diverging colormap centered at <MathTex math="0.000\text{ e/\AA}^3" inline={true} /> (Teal = depletion, Amber = accumulation).
                    </>
                  )}
                </p>
              </div>

              <div className="panel-actions-cluster">
                {/* Field Mode Selector */}
                <div className="view-mode-toggles" style={{ marginRight: '6px' }}>
                  <button
                    className={`toggle-pill ${cddFieldMode === 'total_rho' ? 'active' : ''}`}
                    onClick={() => setCddFieldMode('total_rho')}
                    title="Mode A: Total Valence Density ρ(r) in e/Å³ (Sequential colormap [0.05, 2.20] e/Å³)"
                  >
                    Mode A: Total ρ(r)
                  </button>
                  <button
                    className={`toggle-pill ${cddFieldMode === 'delta_rho' ? 'active' : ''}`}
                    onClick={() => setCddFieldMode('delta_rho')}
                    title="Mode B: Strain Charge Difference Δρ(s) = ρ_strained(s) - ρ_relaxed(s) on matched fractional grid"
                  >
                    Mode B: Strain Δρ(s)
                  </button>
                </div>

                <div className="view-mode-toggles">
                  <button
                    className={`toggle-pill ${cddViewMode === '3d_anim' ? 'active' : ''}`}
                    onClick={() => setCddViewMode('3d_anim')}
                  >
                    3D Breathing Loop
                  </button>
                  <button
                    className={`toggle-pill ${cddViewMode === '2d_contour' ? 'active' : ''}`}
                    onClick={() => setCddViewMode('2d_contour')}
                  >
                    2D Publication Slice
                  </button>
                </div>
                <a
                  href={cddViewMode === '3d_anim' ? currentModeInfo.gif : (cddSliceZ === 0.525 ? (data.visual_assets.cdd_slice_z045 || '/calculations/photh/fig_ccd_2d_slice_z045.png') : cddSliceZ === 0.55 ? (data.visual_assets.cdd_slice_z055 || '/calculations/photh/fig_ccd_2d_slice_z055.png') : (data.visual_assets.cdd_slice_z050 || '/calculations/photh/fig_ccd_2d_slice_z050.png'))}
                  download
                  className="btn-download-asset"
                >
                  <Download size={13} /> Download {cddViewMode === '3d_anim' ? 'GIF' : 'PNG'}
                </a>
              </div>
            </div>

            <div className="cdd-viewport-grid">
              {/* Media Viewport */}
              <div className="cdd-media-card">
                <div className="media-top-banner">
                  <div className="mode-chips">
                    {data.strain_series.modes.map((m) => (
                      <button
                        key={m.id}
                        className={`chip-mode-btn ${strainMode === m.id ? 'active' : ''}`}
                        onClick={() => setStrainMode(m.id)}
                      >
                        {m.id === 'Biaxial' ? 'Biaxial Breathing' : m.id === 'X' ? 'Armchair (X)' : 'Zigzag (Y)'}
                      </button>
                    ))}
                  </div>
                  <span className="banner-badge subtle">
                    {cddViewMode === '3d_anim'
                      ? (isCddLooping ? '60-Frame Continuous Deformation Loop' : `Static: ${currentStrainPct}`)
                      : `2D Planar Slice (z = ${cddSliceZ.toFixed(3)})`}
                  </span>
                </div>

                <div className="cdd-image-wrapper">
                  {cddViewMode === '3d_anim' ? (
                    <img
                      src={currentModeInfo.gif}
                      alt={`CDD ${strainMode} Breathing Animation`}
                      className="cdd-main-feed"
                    />
                  ) : (
                    <img
                      src={
                        cddSliceZ === 0.525
                          ? (data.visual_assets.cdd_slice_z045 || '/calculations/photh/fig_ccd_2d_slice_z045.png')
                          : cddSliceZ === 0.55
                            ? (data.visual_assets.cdd_slice_z055 || '/calculations/photh/fig_ccd_2d_slice_z055.png')
                            : (data.visual_assets.cdd_slice_z050 || '/calculations/photh/fig_ccd_2d_slice_z050.png')
                      }
                      alt={`2D CDD Topological Slice (z = ${cddSliceZ.toFixed(3)})`}
                      className="cdd-main-feed"
                    />
                  )}
                </div>

                <div className="media-playback-bar">
                  {cddViewMode === '3d_anim' ? (
                    <button
                      className={`btn-playback-toggle ${isCddLooping ? 'active' : ''}`}
                      onClick={() => setIsCddLooping(!isCddLooping)}
                    >
                      {isCddLooping ? <><Pause size={13} /> Pause Breathing</> : <><Play size={13} /> Play Breathing</>}
                    </button>
                  ) : (
                    <button
                      className="btn-playback-toggle"
                      onClick={() => setCddViewMode('3d_anim')}
                    >
                      <Layers size={13} /> Return to 3D Breathing Loop
                    </button>
                  )}
                  <span className="playback-caption" title="1 e/Bohr³ ≈ 6.7483 e/Å³">
                    {cddFieldMode === 'total_rho'
                      ? 'Total Density Scale: 0.050 – 2.200 e/Å³ (0.007 – 0.326 e/Bohr³)'
                      : 'Isovalue boundaries: ±0.0135 e/Å³ (±0.002 e/Bohr³) · Teal = depletion, Amber = accumulation'}
                  </span>
                </div>
              </div>

              {/* Physical Parameters & Depth HUD */}
              <div className="cdd-telemetry-card">
                <div className="telemetry-block">
                  <span className="block-title">PLANAR SLICE DEPTH CONTROL</span>
                  <div className="slice-depth-selector">
                    <button
                      className={`slice-btn ${cddSliceZ === 0.50 && cddViewMode === '2d_slice' ? 'active' : ''}`}
                      onClick={() => {
                        setCddSliceZ(0.50)
                        setCddViewMode('2d_slice')
                      }}
                    >
                      z = 0.50 (Δz = 0.0 Å · Basal σ-Bonding Plane)
                    </button>
                    <button
                      className={`slice-btn ${cddSliceZ === 0.525 && cddViewMode === '2d_slice' ? 'active' : ''}`}
                      onClick={() => {
                        setCddSliceZ(0.525)
                        setCddViewMode('2d_slice')
                      }}
                    >
                      z = 0.525 (Δz = ±0.5 Å · π-Orbital Lobe Maximum)
                    </button>
                    <button
                      className={`slice-btn ${cddSliceZ === 0.55 && cddViewMode === '2d_slice' ? 'active' : ''}`}
                      onClick={() => {
                        setCddSliceZ(0.55)
                        setCddViewMode('2d_slice')
                      }}
                    >
                      z = 0.550 (Δz = ±1.0 Å · Evanescent Tail / Vacuum Frontier)
                    </button>
                  </div>
                </div>

                <div className="telemetry-block">
                  <span className="block-title">FFT AUGMENTATION GRID SPECS</span>
                  <div className="grid-specs-table">
                    <div className="spec-item">
                      <span>NGXF × NGYF × NGZF</span>
                      <strong>160 × 90 × 440</strong>
                    </div>
                    <div className="spec-item">
                      <span>Slice Height (<MathTex math="c \cdot z" inline={true} />)</span>
                      <strong>{(cddSliceZ * 20.0).toFixed(2)} Å</strong>
                    </div>
                    <div className="spec-item">
                      <span>Peak Density (<MathTex math="\rho_{\max}" inline={true} />)</span>
                      <strong>{cddSliceZ === 0.50 ? '2.20' : cddSliceZ === 0.525 ? '0.62' : '0.14'} e/Å³</strong>
                    </div>
                    <div className="spec-item">
                      <span>Dipole Correction</span>
                      <strong>Enabled (IDIPOL = 3)</strong>
                    </div>
                  </div>
                </div>

                <div className="telemetry-block highlight-block">
                  <span className="block-title">PHYSICAL VOLUMETRIC INTERPRETATION</span>
                  <p>
                    {cddViewMode === '3d_anim' ? (
                      <>
                        Under <strong>{currentStrainPct} {strainMode}</strong> strain, the localized electron density undergoes anisotropic polarization. Bond-elongated regions along the 8-ring vertex experience substantial &pi;-charge depletion, directing excess valence electron density into the rigid 4-ring shared edge.
                      </>
                    ) : cddSliceZ === 0.50 ? (
                      <>
                        At <strong>z = 0.50 (Δz = 0.0 Å · Basal σ-Bonding Plane)</strong>, atomic nuclei and covalent bonds reside directly in the mirror plane. Maximum valence density reaches <strong>2.20 e/Å³</strong> along the rigid shared 4-ring edges, while the 8-ring pores exhibit interstitial cavity depletion.
                      </>
                    ) : cddSliceZ === 0.525 ? (
                      <>
                        At <strong>z = 0.525 (Δz = ±0.5 Å · π-Orbital Lobe Maximum)</strong>, in-plane σ-core density fades and Carbon 2p_z (&pi;/&pi;*) orbital lobes reach their spatial antinode maximum (peak density <strong>0.62 e/Å³</strong>), sustaining continuous electronic conjugation across the network.
                      </>
                    ) : (
                      <>
                        At <strong>z = 0.550 (Δz = ±1.0 Å · Evanescent Tail / Vacuum Frontier)</strong>, electron density displays evanescent exponential decay into vacuum (peak density <strong>0.14 e/Å³</strong>). Governed by the 4.62 eV work function barrier, this plane delineates the interfacial electrostatic contact potential.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 02: ELECTRONIC BAND LABORATORY                                */}
        {/* ==================================================================== */}
        {isPhoth && activeModule === 'bands' && (
          <div className="module-panel bands-lab-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">02 — ELECTRONIC BAND LABORATORY</span>
                <h3 className="panel-title">Coupled Fat Bands, Projected DOS & Screened Hybrid HSE06 Arbitration</h3>
                <p className="panel-desc">
                  Anisotropic Dirac cone dispersion along the canonical orthorhombic k-path (&Gamma; &ndash; X &ndash; S &ndash; Y &ndash; &Gamma;). Resolving semilocal GGA-PBE zero-gap state with hybrid HSE06 exact exchange.
                </p>
              </div>

              <div className="panel-actions-cluster">
                <div className="view-mode-toggles">
                  <button
                    className={`toggle-pill ${bandsViewMode === 'coupled_anim' ? 'active' : ''}`}
                    onClick={() => setBandsViewMode('coupled_anim')}
                  >
                    Coupled Bands + PDOS Loop
                  </button>
                  <button
                    className={`toggle-pill ${bandsViewMode === 'pbe_vs_hse' ? 'active' : ''}`}
                    onClick={() => setBandsViewMode('pbe_vs_hse')}
                  >
                    PBE vs. HSE06 Comparison
                  </button>
                  <button
                    className={`toggle-pill ${bandsViewMode === 'pristine_coupled' ? 'active' : ''}`}
                    onClick={() => setBandsViewMode('pristine_coupled')}
                  >
                    Pristine State (High-Res)
                  </button>
                </div>
              </div>
            </div>

            <div className="bands-workspace-grid">
              <div className="bands-main-card">
                <div className="card-topline-nav">
                  <div className="mode-chips">
                    {bandsViewMode === 'coupled_anim' && data.strain_series.modes.map((m) => (
                      <button
                        key={m.id}
                        className={`chip-mode-btn ${strainMode === m.id ? 'active' : ''}`}
                        onClick={() => setStrainMode(m.id)}
                      >
                        {m.id === 'Biaxial' ? 'Biaxial Breathing' : m.id === 'X' ? 'Armchair (X)' : 'Zigzag (Y)'}
                      </button>
                    ))}
                  </div>

                  <a
                    href={bandsViewMode === 'coupled_anim' ? bandsModeInfo.gif : bandsViewMode === 'pbe_vs_hse' ? data.visual_assets.band_structure : data.visual_assets.band_pdos_coupled_pristine}
                    download
                    className="btn-download-asset"
                  >
                    <Download size={13} /> Export Asset
                  </a>
                </div>

                <div className="bands-image-container">
                  {bandsViewMode === 'coupled_anim' && (
                    <img
                      src={bandsModeInfo.gif}
                      alt={`Coupled Band + PDOS ${strainMode} Animation`}
                      className="bands-feed-img"
                    />
                  )}
                  {bandsViewMode === 'pbe_vs_hse' && (
                    <NativeBandsPbeHse onExportPng={() => {}} />
                  )}
                  {bandsViewMode === 'pristine_coupled' && (
                    <img
                      src={data.visual_assets.band_pdos_coupled_pristine}
                      alt="Pristine Equilibrium Coupled Fat Bands & PDOS"
                      className="bands-feed-img"
                    />
                  )}
                </div>

                <div className="bands-caption-strip">
                  <span>
                    {bandsViewMode === 'coupled_anim'
                      ? 'Coupled 60-frame breathing dynamics linking C(2p_z) fat band dispersion with projected density of states [-4.0, +4.0] eV.'
                      : bandsViewMode === 'pbe_vs_hse'
                        ? 'Native arbitration across high-symmetry k-path: Γ(0,0) → X(π/a, 0) → S(π/a, π/b) → Y(0, π/b) → Γ(0,0).'
                        : 'Unperturbed equilibrium ground state showing semi-metallic Dirac point crossing at Fermi level.'}
                  </span>
                </div>
              </div>

              {/* Band Metrics Sidebar */}
              <div className="bands-telemetry-sidebar">
                <div className="gap-kpi-card">
                  <span className="gap-kpi-label">PBE BAND GAP (E_g)</span>
                  <div className="gap-kpi-val">
                    <strong>0.00 eV</strong>
                    <span className="gap-state">Semi-metallic Dirac node</span>
                  </div>
                </div>

                <div className="gap-kpi-card hse">
                  <span className="gap-kpi-label">HSE06 SCREENED HYBRID GAP</span>
                  <div className="gap-kpi-val">
                    <strong>0.042 eV</strong>
                    <span className="gap-state">Narrow-gap semiconductor</span>
                  </div>
                </div>

                <div className="telemetry-block">
                  <span className="block-title">ANISOTROPIC FERMI VELOCITIES</span>
                  <div className="kpi-mini-grid">
                    <div>
                      <span>v<sub>F,x</sub> (Armchair)</span>
                      <strong>6.8 × 10⁵ m/s</strong>
                    </div>
                    <div>
                      <span>v<sub>F,y</sub> (Zigzag)</span>
                      <strong>4.2 × 10⁵ m/s</strong>
                    </div>
                  </div>
                </div>

                <div className="telemetry-block reciprocal-instrument-block">
                  <div className="reciprocal-header-row">
                    <span className="block-title">RECIPROCAL SPACE TOPOLOGY</span>
                    <span className="reciprocal-badge-ortho">Pmm2 · Orthorhombic BZ</span>
                  </div>

                  <div className="reciprocal-svg-viewport">
                    <svg viewBox="0 0 340 290" className="reciprocal-svg" aria-label="First Brillouin Zone & High-Symmetry Path">
                      <defs>
                        <marker id="arrowB1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
                        </marker>
                        <marker id="arrowB2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
                        </marker>
                        <marker id="arrowPath" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                          <path d="M 0 2 L 7 5 L 0 8 z" fill="#1d4ed8" />
                        </marker>
                      </defs>

                      {/* Clean neutral canvas */}
                      <rect x="0" y="0" width="340" height="290" fill="#fafaf6" rx="8" />

                      {/* Subdued Cartesian reciprocal grid */}
                      <line x1="20" y1="175" x2="330" y2="175" stroke="#d5dfd1" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="145" y1="20" x2="145" y2="275" stroke="#d5dfd1" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="330" y="194" fill="#476856" fontSize="11" fontFamily="DM Mono" fontWeight="700" textAnchor="end">k_x (Å⁻¹)</text>
                      <text x="136" y="22" fill="#476856" fontSize="11" fontFamily="DM Mono" fontWeight="700" textAnchor="end">k_y (Å⁻¹)</text>

                      {/* Center Gamma is at (145, 175). Scale: 1 Å^-1 = 95px */}
                      {/* 1st Brillouin Zone boundary */}
                      <rect
                        x={145 - 42}
                        y={175 - 75}
                        width={84}
                        height={150}
                        fill="#ffffff"
                        stroke="#11362d"
                        strokeWidth="1.8"
                        rx="2"
                      />

                      {/* Irreducible Brillouin Zone (IBZ) quadrant [0, kx_max] x [0, ky_max] */}
                      <rect
                        x={145}
                        y={175 - 75}
                        width={42}
                        height={75}
                        fill="rgba(56, 189, 248, 0.22)"
                        stroke="#0284c7"
                        strokeWidth="1.4"
                      />
                      <text x={145 + 21} y={175 - 34} fill="#0369a1" fontSize="11" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                        IBZ
                      </text>

                      {/* Reciprocal Basis Vector b1 (Red Arrow along kx) */}
                      <line
                        x1="145"
                        y1="175"
                        x2={145 + 84}
                        y2="175"
                        stroke="#dc2626"
                        strokeWidth="2.2"
                        markerEnd="url(#arrowB1)"
                      />
                      <text x={145 + 42} y="162" fill="#dc2626" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                        b₁ = 0.880 Å⁻¹
                      </text>

                      {/* Reciprocal Basis Vector b2 (Red Arrow along ky) */}
                      <line
                        x1="145"
                        y1="175"
                        x2="145"
                        y2={175 - 150}
                        stroke="#dc2626"
                        strokeWidth="2.2"
                        markerEnd="url(#arrowB2)"
                      />
                      <text x="156" y="32" fill="#dc2626" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="start">
                        b₂ = 1.577 Å⁻¹
                      </text>

                      {/* High-Symmetry Band Path (Gamma -> X -> S -> Y -> Gamma) */}
                      <line x1="145" y1="175" x2={145 + 42} y2="175" stroke="#2563eb" strokeWidth="2.4" />
                      <line x1={145 + 42} y1="175" x2={145 + 42} y2={175 - 75} stroke="#2563eb" strokeWidth="2.4" />
                      <line x1={145 + 42} y1={175 - 75} x2="145" y2={175 - 75} stroke="#2563eb" strokeWidth="2.4" />
                      <line x1="145" y1={175 - 75} x2="145" y2={175} stroke="#2563eb" strokeWidth="2.4" />
                      {/* Secondary branch Gamma -> S */}
                      <line x1="145" y1="175" x2={145 + 42} y2={175 - 75} stroke="#2563eb" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.75" />

                      {/* Directional Path Arrow Markers */}
                      <line x1="145" y1="175" x2={145 + 24} y2="175" stroke="none" markerEnd="url(#arrowPath)" />
                      <line x1={145 + 42} y1="175" x2={145 + 42} y2={175 - 42} stroke="none" markerEnd="url(#arrowPath)" />
                      <line x1={145 + 42} y1={175 - 75} x2={145 + 18} y2={175 - 75} stroke="none" markerEnd="url(#arrowPath)" />
                      <line x1="145" y1={175 - 75} x2="145" y2={175 - 32} stroke="none" markerEnd="url(#arrowPath)" />

                      {/* High-Symmetry K-Points */}
                      {/* Gamma (0, 0) */}
                      <g
                        onMouseEnter={() => setHoveredKpoint('Γ')}
                        onMouseLeave={() => setHoveredKpoint(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx="145" cy="175" r="5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="136" y="195" fill="#1e3a8a" fontSize="11.5" fontFamily="DM Mono" fontWeight="700" textAnchor="end">Γ (0,0)</text>
                      </g>

                      {/* X (1/2, 0) */}
                      <g
                        onMouseEnter={() => setHoveredKpoint('X')}
                        onMouseLeave={() => setHoveredKpoint(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx={145 + 42} cy="175" r="5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
                        <text x={145 + 42} y="197" fill="#1e3a8a" fontSize="11.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">X (π/a, 0)</text>
                      </g>

                      {/* S (1/2, 1/2) */}
                      <g
                        onMouseEnter={() => setHoveredKpoint('S')}
                        onMouseLeave={() => setHoveredKpoint(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx={145 + 42} cy={175 - 75} r="5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
                        <text x={145 + 50} y={175 - 78} fill="#1e3a8a" fontSize="11.5" fontFamily="DM Mono" fontWeight="700" textAnchor="start">S (π/a, π/b)</text>
                      </g>

                      {/* Y (0, 1/2) */}
                      <g
                        onMouseEnter={() => setHoveredKpoint('Y')}
                        onMouseLeave={() => setHoveredKpoint(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx="145" cy={175 - 75} r="5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="134" y={175 - 78} fill="#1e3a8a" fontSize="11.5" fontFamily="DM Mono" fontWeight="700" textAnchor="end">Y (0, π/b)</text>
                      </g>

                      {/* Active K-Point Hover Banner */}
                      {hoveredKpoint && (
                        <g transform="translate(170, 262)">
                          <rect x="-155" y="-14" width="310" height="22" rx="4" fill="#11362d" />
                          <text x="0" y="1" fill="#ffffff" fontSize="9" fontFamily="DM Mono" fontWeight="600" textAnchor="middle">
                            {hoveredKpoint === 'Γ' && 'Γ (0, 0): Zone Center · Dirac Cone Crossing at E_F'}
                            {hoveredKpoint === 'X' && 'X (0.440, 0) Å⁻¹: Armchair Edge Zone Boundary'}
                            {hoveredKpoint === 'S' && 'S (0.440, 0.789) Å⁻¹: Corner High-Symmetry Node'}
                            {hoveredKpoint === 'Y' && 'Y (0, 0.789) Å⁻¹: Zigzag Edge Zone Boundary'}
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>

                  <div className="reciprocal-meta-footer">
                    <div className="rmeta-item">
                      <span><MathTex math="b_1\ \mathrm{(Armchair)}:" inline={true} /></span>
                      <strong><MathTex math={`${(2 * Math.PI / parseFloat(strainedLatticeA)).toFixed(3)}\\ \\mathrm{\\AA}^{-1}`} inline={true} /></strong>
                    </div>
                    <div className="rmeta-item">
                      <span><MathTex math="b_2\ \mathrm{(Zigzag)}:" inline={true} /></span>
                      <strong><MathTex math={`${(2 * Math.PI / parseFloat(strainedLatticeB)).toFixed(3)}\\ \\mathrm{\\AA}^{-1}`} inline={true} /></strong>
                    </div>
                    <div className="rmeta-item">
                      <span><MathTex math="\mathrm{Path\ Sequence}:" inline={true} /></span>
                      <strong><MathTex math="\Gamma \rightarrow X \rightarrow S \rightarrow Y \rightarrow \Gamma \rightarrow S" inline={true} /></strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 03: BADER CHARGE EXPLORER                                    */}
        {/* ==================================================================== */}
        {isPhoth && activeModule === 'bader' && (
          <div className="module-panel bader-explorer-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">03 — BADER CHARGE EXPLORER</span>
                <h3 className="panel-title">Symmetry-Resolved Electronic Charge Redistribution</h3>
                <p className="panel-desc">
                  Henkelman fast grid partitioning across Wyckoff sites (C₁ &ndash; C₆). Monitored under &plusmn;3% strain with sign standardization: Q<sub>net</sub> = Z<sub>val</sub> &minus; N<sub>Bader</sub>.
                </p>
              </div>

              <div className="panel-actions-cluster">
                <div className="view-mode-toggles">
                  <button
                    className={`toggle-pill ${baderViewMode === 'anim' ? 'active' : ''}`}
                    onClick={() => setBaderViewMode('anim')}
                  >
                    Breathing Animation
                  </button>
                  <button
                    className={`toggle-pill ${baderViewMode === 'profiles' ? 'active' : ''}`}
                    onClick={() => setBaderViewMode('profiles')}
                  >
                    Static Charge Profiles
                  </button>
                  <button
                    className={`toggle-pill ${baderViewMode === 'composite' ? 'active' : ''}`}
                    onClick={() => setBaderViewMode('composite')}
                  >
                    Composite Comparison
                  </button>
                </div>
                <a
                  href={data.visual_assets.raw_bader_csv}
                  download
                  className="btn-download-asset"
                >
                  <FileSpreadsheet size={13} /> Export Bader CSV
                </a>
              </div>
            </div>

            <div className="bader-workspace-grid">
              {/* Visualizer Feed */}
              <div className="bader-media-card">
                <div className="media-top-banner">
                  <div className="mode-chips">
                    <button
                      className={`chip-mode-btn ${strainMode === 'biaxial' ? 'active' : ''}`}
                      onClick={() => setStrainMode('biaxial')}
                    >
                      Biaxial Breathing
                    </button>
                    <button
                      className={`chip-mode-btn ${strainMode === 'uniaxial_x' ? 'active' : ''}`}
                      onClick={() => setStrainMode('uniaxial_x')}
                    >
                      Armchair (X)
                    </button>
                    <button
                      className={`chip-mode-btn ${strainMode === 'uniaxial_y' ? 'active' : ''}`}
                      onClick={() => setStrainMode('uniaxial_y')}
                    >
                      Zigzag (Y)
                    </button>
                  </div>
                  <span className="banner-badge">Active Mode: {baderModeInfo.title}</span>
                </div>

                <div className="bader-media-frame">
                  {baderViewMode === 'anim' && (
                    <img
                      src={baderModeInfo.gif}
                      alt={`Bader ${strainMode} Breathing Animation`}
                      className="bader-feed-img"
                    />
                  )}
                  {baderViewMode === 'profiles' && (
                    <img
                      src={data.visual_assets.bader_charge_profiles}
                      alt="Bader Charge Profiles"
                      className="bader-feed-img"
                    />
                  )}
                  {baderViewMode === 'composite' && (
                    <img
                      src={data.visual_assets.bader_composite}
                      alt="Bader Pristine vs Strained Composite"
                      className="bader-feed-img"
                    />
                  )}
                </div>

                <div className="media-playback-bar">
                  <span className="playback-caption">
                    Current active state: <strong>{currentStrainPct} {strainMode}</strong> · Selected Wyckoff site: <strong>{selectedSite}</strong>
                  </span>
                </div>
              </div>

              {/* Wyckoff Table */}
              <div className="bader-table-card">
                <span className="card-kicker">SORTABLE WYCKOFF SITE PARTITIONING MATRIX</span>
                <div className="table-responsive">
                  <table className="pulmify-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Mult</th>
                        <th>Frac (x, y)</th>
                        <th>Q₀ (e)</th>
                        <th>Q({currentStrainPct})</th>
                        <th>ΔQ</th>
                        <th>HER ΔG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.wyckoff_sites.map((ws) => {
                        const isSelected = selectedSite === ws.site
                        const qCurr = currentBaderCharges[ws.site] !== undefined ? currentBaderCharges[ws.site] : ws.bader_0
                        const dq = qCurr - ws.bader_0
                        return (
                          <tr
                            key={ws.site}
                            className={isSelected ? 'selected-row' : ''}
                            onClick={() => setSelectedSite(ws.site)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td><span className="site-cell-pill">{ws.site}</span></td>
                            <td>{ws.mult}</td>
                            <td>({ws.x.toFixed(3)}, {ws.y.toFixed(3)})</td>
                            <td style={{ color: ws.bader_0 >= 0 ? '#c97b5d' : '#244b3e' }}>
                              {ws.bader_0 >= 0 ? `+${ws.bader_0.toFixed(4)}` : ws.bader_0.toFixed(4)}
                            </td>
                            <td style={{ color: qCurr >= 0 ? '#c97b5d' : '#244b3e', fontWeight: '700' }}>
                              {qCurr >= 0 ? `+${qCurr.toFixed(4)}` : qCurr.toFixed(4)}
                            </td>
                            <td style={{ color: dq >= 0 ? '#b45309' : '#15803d' }}>
                              {dq >= 0 ? `+${dq.toFixed(4)}` : dq.toFixed(4)}
                            </td>
                            <td>
                              <span className={`her-tag ${ws.dG_her_eV <= 0.30 ? 'optimal' : ''}`}>
                                +{ws.dG_her_eV.toFixed(2)} eV
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="table-footnote">
                  <span>* Click any table row to focus and synchronize the live unit-cell lattice map.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 04: HER REACTION ENERGY STUDIO                                */}
        {/* ==================================================================== */}
        {isPhoth && activeModule === 'her' && (
          <div className="module-panel her-studio-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">04 — HER REACTION ENERGY STUDIO</span>
                <h3 className="panel-title">Multi-Site Gibbs Free Energy Reaction Coordinates (<MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} />)</h3>
                <p className="panel-desc">
                  Hydrogen evolution reaction energetics via DFT chemisorption with zero-point vibrational entropy corrections. Demonstrating strain-promoted Sabatier optimization.
                </p>
              </div>

              <div className="panel-actions-cluster">
                <a
                  href={data.visual_assets.her_profile}
                  download
                  className="btn-download-asset"
                >
                  <Download size={13} /> Export Reaction Figure
                </a>
              </div>
            </div>

            <div className="her-content-card">
              <div className="her-filter-toolbar">
                <div className="filter-chips-row">
                  <span className="filter-lbl">FOCUS REACTION PATH:</span>
                  <button
                    className={`filter-btn ${herFilterSite === 'ALL' ? 'active' : ''}`}
                    onClick={() => setHerFilterSite('ALL')}
                  >
                    All 6 Sites Comparison
                  </button>
                  {data.wyckoff_sites.map((ws) => (
                    <button
                      key={ws.site}
                      className={`filter-btn ${herFilterSite === ws.site ? 'active' : ''}`}
                      onClick={() => {
                        setHerFilterSite(ws.site)
                        setSelectedSite(ws.site)
                      }}
                    >
                      {ws.site} (+{ws.dG_her_eV.toFixed(2)} eV)
                    </button>
                  ))}
                </div>

                <label className="strain-modulation-toggle">
                  <input
                    type="checkbox"
                    checked={showHerStrain}
                    onChange={(e) => setShowHerStrain(e.target.checked)}
                  />
                  <span>Display +2% Biaxial Tensile Modulation on C₁ (+0.08 eV)</span>
                </label>
              </div>

              {/* Native High-Precision SVG Reaction Coordinates */}
              <div className="her-svg-viewport">
                <svg viewBox="0 0 900 340" className="her-reaction-svg" aria-label="HER Gibbs Free Energy Diagram">
                  {/* Baseline 0.00 eV */}
                  <line x1="50" y1="270" x2="850" y2="270" stroke="#b4cbbb" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="42" y="273" fill="#698f75" fontSize="10" fontFamily="DM Mono" textAnchor="end">0.00 eV</text>

                  {/* Optimal Sabatier Window (|dG| <= 0.10 eV) */}
                  <rect x="50" y="253" width="800" height="34" fill="#4ade80" opacity="0.12" rx="4" />
                  <text x="845" y="247" fill="#15803d" fontSize="9.5" fontFamily="DM Mono" fontWeight="700" textAnchor="end">
                    Sabatier Optimal Window (|ΔG| ≤ 0.10 eV)
                  </text>

                  {/* State 1: H+ + e- */}
                  <line x1="60" y1="270" x2="180" y2="270" stroke="#1f5841" strokeWidth="3.5" />
                  <text x="120" y="295" fill="#1f5841" fontSize="11" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                    H⁺ + e⁻ + *
                  </text>
                  <text x="120" y="310" fill="#587a66" fontSize="9.5" fontFamily="DM Mono" textAnchor="middle">
                    Initial Solvated (0.00 eV)
                  </text>

                  {/* State 3: 1/2 H2 (Desorbed gas) */}
                  <line x1="660" y1="270" x2="780" y2="270" stroke="#1f5841" strokeWidth="3.5" />
                  <text x="720" y="295" fill="#1f5841" fontSize="11" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                    ½ H₂ + *
                  </text>
                  <text x="720" y="310" fill="#587a66" fontSize="9.5" fontFamily="DM Mono" textAnchor="middle">
                    Desorbed Gas (0.00 eV)
                  </text>

                  {/* Energy Plateaus for Sites with Collision-Free Staggered Anchoring */}
                  {(() => {
                    const siteColors = {
                      C1: '#1f5841',
                      C2: '#2b6e4e',
                      C6: '#498565',
                      C5: '#6b9880',
                      C3: '#8caea0',
                      C4: '#a3b8ad'
                    }
                    const scaleY = (ev) => 270 - ev * 170

                    // Non-colliding staggered label X offsets along the 340px plateau (x in [260, 600])
                    const labelOffsets = {
                      C4: 430, // center (top level +1.15 eV)
                      C3: 345, // left column (+0.95 eV)
                      C5: 515, // right column (+0.82 eV) -> completely disjoint horizontally from C3 & C6!
                      C6: 345, // left column (+0.74 eV)
                      C2: 430, // center (+0.53 eV)
                      C1: 430  // center (+0.25 eV)
                    }

                    return data.wyckoff_sites.map((ws) => {
                      const isVisible = herFilterSite === 'ALL' || herFilterSite === ws.site
                      if (!isVisible) return null

                      const yLevel = scaleY(ws.dG_her_eV)
                      const isTarget = selectedSite === ws.site
                      const strokeColor = siteColors[ws.site] || '#285e3d'
                      const strokeWidth = isTarget ? 3.5 : 2.0
                      const lx = labelOffsets[ws.site] || 430
                      const labelText = `${ws.site}: +${ws.dG_her_eV.toFixed(2)} eV${ws.site === 'C1' ? ' (Optimal Pristine)' : ''}`
                      const pillW = labelText.length * 6.8 + 14

                      return (
                        <g
                          key={ws.site}
                          onClick={() => {
                            setSelectedSite(ws.site)
                            setHerFilterSite(ws.site)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Ramp from State 1 */}
                          <line x1="180" y1="270" x2="260" y2={yLevel} stroke={strokeColor} strokeWidth={isTarget ? 1.8 : 1} strokeDasharray="3 3" opacity={isTarget ? 1 : 0.65} />
                          {/* Intermediate Plateau */}
                          <line x1="260" y1={yLevel} x2="600" y2={yLevel} stroke={strokeColor} strokeWidth={strokeWidth} />
                          
                          {/* Collision-Free Translucent White Pill Backdrop */}
                          <rect
                            x={lx - pillW / 2}
                            y={yLevel - 15}
                            width={pillW}
                            height="16"
                            rx="3"
                            fill="#ffffff"
                            stroke={strokeColor}
                            strokeWidth={isTarget ? 1.5 : 0.8}
                            opacity="0.96"
                          />
                          {/* Text Label */}
                          <text
                            x={lx}
                            y={yLevel - 3.5}
                            fill={strokeColor}
                            fontSize={isTarget ? 10.5 : 9}
                            fontFamily="DM Mono"
                            fontWeight={isTarget ? 700 : 600}
                            textAnchor="middle"
                          >
                            {labelText}
                          </text>

                          {/* Ramp to State 3 */}
                          <line x1="600" y1={yLevel} x2="660" y2="270" stroke={strokeColor} strokeWidth={isTarget ? 1.8 : 1} strokeDasharray="3 3" opacity={isTarget ? 1 : 0.65} />
                        </g>
                      )
                    })
                  })()}

                  {/* Strained C1 Plateau (+2% Biaxial) - Bold High-Contrast Terracotta Banner */}
                  {showHerStrain && (herFilterSite === 'ALL' || herFilterSite === 'C1') && (() => {
                    const yStrained = 270 - 0.08 * 170 // y = 256.4
                    const isTarget = selectedSite === 'C1'
                    const bannerText = "C₁ under +2% Tensile Strain: +0.08 eV (Platinum-like Thermoneutrality)"
                    const bannerW = bannerText.length * 6.8 + 20

                    return (
                      <g>
                        <line x1="180" y1="270" x2="250" y2={yStrained} stroke="#c97b5d" strokeWidth="2.0" strokeDasharray="3 3" />
                        <line x1="250" y1={yStrained} x2="610" y2={yStrained} stroke="#c97b5d" strokeWidth={3.8} />
                        
                        {/* High-visibility contrast pill */}
                        <rect
                          x={430 - bannerW / 2}
                          y={yStrained - 18}
                          width={bannerW}
                          height="17"
                          rx="4"
                          fill="#11362d"
                          stroke="#c97b5d"
                          strokeWidth="1.2"
                        />
                        <text x="430" y={yStrained - 5} fill="#fef08a" fontSize="9.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                          {bannerText}
                        </text>
                        <line x1="610" y1={yStrained} x2="660" y2="270" stroke="#c97b5d" strokeWidth="2.0" strokeDasharray="3 3" />
                      </g>
                    )
                  })()}
                </svg>
              </div>

              {/* Kinetic & Thermodynamic Distinctions Callout */}
              <div className="her-disclaimer-grid">
                <div className="disclaimer-card">
                  <span className="d-title">THERMODYNAMICS VS. KINETICS</span>
                  <p>
                    <MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} /> is the <strong>thermodynamic chemisorption free energy</strong> (<MathTex math="\Delta G_{\mathrm{H^*}} = \Delta E_{\mathrm{DFT}} + \Delta E_{\mathrm{ZPE}} - T\Delta S" inline={true} />). A value of +0.08 eV represents optimal bond thermodynamics for hydrogen desorption without overbinding, but <strong>does not replace explicit kinetic activation barrier (<MathTex math="\Delta G^\ddagger" inline={true} />) evaluation</strong>.
                  </p>
                </div>
                <div className="disclaimer-card">
                  <span className="d-title">SABATIER CATALYTIC RANKING</span>
                  <p>
                    Basal catalytic activity follows <strong>C₁ &gt; C₂ &gt; C₆ &gt; C₅ &gt; C₃ &gt; C₄</strong>. Under tensile strain, bond dilation elevates the local p_z band center, facilitating proton-coupled electron transfer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 05: STRAIN & BREATHING SIMULATOR                              */}
        {/* ==================================================================== */}
        {isPhoth && activeModule === 'strain' && (
          <div className="module-panel strain-sim-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">05 — STRAIN & BREATHING SIMULATOR</span>
                <h3 className="panel-title">In-Plane Elastic Regime & Harmonic Basin Mechanics</h3>
                <p className="panel-desc">
                  Ground state energy variation E(&epsilon;) and lattice parameters over &plusmn;3% deformations. Validating Born stability conditions (c₁₁ &gt; 0, c₁₁c₂₂ &minus; c₁₂² &gt; 0).
                </p>
              </div>

              <div className="panel-actions-cluster">
                <a
                  href={data.visual_assets.elasticity_curve}
                  download
                  className="btn-download-asset"
                >
                  <Download size={13} /> Export Elasticity Curve
                </a>
              </div>
            </div>

            <div className="strain-sim-grid">
              <div className="sim-visual-card">
                <div className="sim-card-nav-row">
                  <div className="mode-chips">
                    <button
                      className={`chip-mode-btn ${elasticityMode === 'Biaxial' ? 'active' : ''}`}
                      onClick={() => { setElasticityMode('Biaxial'); setStrainMode('Biaxial'); }}
                    >
                      Biaxial Breathing
                    </button>
                    <button
                      className={`chip-mode-btn ${elasticityMode === 'X' ? 'active' : ''}`}
                      onClick={() => { setElasticityMode('X'); setStrainMode('X'); }}
                    >
                      Armchair (X)
                    </button>
                    <button
                      className={`chip-mode-btn ${elasticityMode === 'Y' ? 'active' : ''}`}
                      onClick={() => { setElasticityMode('Y'); setStrainMode('Y'); }}
                    >
                      Zigzag (Y)
                    </button>
                    <button
                      className={`chip-mode-btn ${elasticityMode === 'All' ? 'active' : ''}`}
                      onClick={() => setElasticityMode('All')}
                    >
                      All 3 Modes Combined
                    </button>
                  </div>

                  <div className="view-mode-toggles">
                    <button
                      className={`toggle-pill ${elasticityTab === 'energy' ? 'active' : ''}`}
                      onClick={() => setElasticityTab('energy')}
                    >
                      Harmonic Basin E(ε)
                    </button>
                    <button
                      className={`toggle-pill ${elasticityTab === 'lattice' ? 'active' : ''}`}
                      onClick={() => setElasticityTab('lattice')}
                    >
                      Lattice Evolution a, b
                    </button>
                  </div>
                </div>

                {/* Native High-Precision SVG Simulator Viewport */}
                <div className="elasticity-svg-viewport">
                  {elasticityTab === 'energy' ? (
                    <svg viewBox="0 0 680 340" className="elasticity-svg" aria-label="Harmonic Energy Basin Diagram">
                      {/* Subdued Background & Cartesian Axes */}
                      <rect x="0" y="0" width="680" height="340" fill="#ffffff" rx="8" />

                      {/* Hookean Linear Elastic Regime (±2% shaded region) */}
                      <rect x="163" y="45" width="374" height="235" fill="rgba(34, 197, 94, 0.06)" rx="4" />
                      <text x="415" y="62" fill="#15803d" fontSize="9.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                        Hookean Elastic Harmonic Basin (±2% Linear Regime)
                      </text>

                      {/* Coordinate Grid: X mapping ε in [-0.03, +0.03] -> x in [70, 630]. Width = 560px (93.33px per 1%) */}
                      {[-0.03, -0.02, -0.01, 0.00, 0.01, 0.02, 0.03].map((eps) => {
                        const px = 70 + (eps + 0.03) * (560 / 0.06)
                        const pctStr = `${eps > 0 ? '+' : ''}${(eps * 100).toFixed(0)}%`
                        return (
                          <g key={`x-grid-${eps}`}>
                            <line x1={px} y1="45" x2={px} y2="280" stroke="#e2ece0" strokeWidth="1" strokeDasharray="3 3" />
                            <text x={px} y="296" fill="#4a6e57" fontSize="9.5" fontFamily="DM Mono" textAnchor="middle">
                              {pctStr}
                            </text>
                          </g>
                        )
                      })}
                      <text x="350" y="316" fill="#12281e" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                        Applied Mechanical Strain ε = ΔL / L₀
                      </text>

                      {/* Coordinate Grid: Y mapping ΔE in [-0.05, 0.80] eV -> y in [280, 50]. Height = 230px */}
                      {[0.00, 0.20, 0.40, 0.60, 0.80].map((ev) => {
                        const py = 280 - (ev - (-0.05)) * (230 / 0.85)
                        return (
                          <g key={`y-grid-${ev}`}>
                            <line x1="70" y1={py} x2="630" y2={py} stroke="#e2ece0" strokeWidth="1" strokeDasharray="3 3" />
                            <text x="62" y={py + 3.5} fill="#4a6e57" fontSize="9.5" fontFamily="DM Mono" textAnchor="end">
                              {ev.toFixed(2)}
                            </text>
                          </g>
                        )
                      })}
                      <text x="24" y="165" fill="#12281e" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle" transform="rotate(-90 24 165)">
                        Strain Energy ΔE (eV / unit cell)
                      </text>

                      {/* Parabolic Harmonic Basin Curves: ΔE = 1/2 * k * ε² */}
                      {(() => {
                        const modesToPlot = elasticityMode === 'All'
                          ? ['Biaxial', 'X', 'Y']
                          : [elasticityMode]

                        const curveStyles = {
                          Biaxial: { color: '#15803d', label: 'Biaxial (c₁₁+c₂₂+2c₁₂)' },
                          X: { color: '#0d9488', label: 'Armchair X (c₁₁ = 261.2 N/m)' },
                          Y: { color: '#c97b5d', label: 'Zigzag Y (c₂₂ = 257.1 N/m)' }
                        }

                        return modesToPlot.map((mKey) => {
                          const pts = data.strain_series.points[mKey] || []
                          if (pts.length < 2) return null

                          // Build SVG path string through DFT points
                          const pathStr = pts.map((pt, pIdx) => {
                            const px = 70 + (pt.strain + 0.03) * (560 / 0.06)
                            const py = 280 - (pt.dE_strain_eV - (-0.05)) * (230 / 0.85)
                            return `${pIdx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
                          }).join(' ')

                          return (
                            <path
                              key={`curve-${mKey}`}
                              d={pathStr}
                              fill="none"
                              stroke={curveStyles[mKey].color}
                              strokeWidth={mKey === strainMode ? '3.0' : '2.0'}
                              strokeLinecap="round"
                              opacity={mKey === strainMode || elasticityMode === 'All' ? 1.0 : 0.4}
                            />
                          )
                        })
                      })()}

                      {/* Discrete DFT Converged Data Points */}
                      {(() => {
                        const modesToPlot = elasticityMode === 'All'
                          ? ['Biaxial', 'X', 'Y']
                          : [elasticityMode]

                        const pointColors = {
                          Biaxial: '#15803d',
                          X: '#0d9488',
                          Y: '#c97b5d'
                        }

                        return modesToPlot.map((mKey) => {
                          const pts = data.strain_series.points[mKey] || []
                          return pts.map((pt, pIdx) => {
                            const px = 70 + (pt.strain + 0.03) * (560 / 0.06)
                            const py = 280 - (pt.dE_strain_eV - (-0.05)) * (230 / 0.85)
                            const isCurrent = (mKey === strainMode && pIdx === strainIndex)

                            return (
                              <g
                                key={`pt-${mKey}-${pIdx}`}
                                onClick={() => {
                                  setStrainMode(mKey)
                                  setStrainIndex(pIdx)
                                  setElasticityMode(mKey)
                                }}
                                onMouseEnter={() => setHoveredStrainPoint({ ...pt, mode: mKey, px, py })}
                                onMouseLeave={() => setHoveredStrainPoint(null)}
                                style={{ cursor: 'pointer' }}
                              >
                                {isCurrent && (
                                  <circle
                                    cx={px}
                                    cy={py}
                                    r="10"
                                    fill="none"
                                    stroke={pointColors[mKey]}
                                    strokeWidth="1.8"
                                    strokeDasharray="3 2"
                                  />
                                )}
                                <circle
                                  cx={px}
                                  cy={py}
                                  r={isCurrent ? '5.5' : '4.2'}
                                  fill={pointColors[mKey]}
                                  stroke="#ffffff"
                                  strokeWidth="1.6"
                                />
                              </g>
                            )
                          })
                        })
                      })()}

                      {/* Active Hover Tooltip */}
                      {hoveredStrainPoint && (
                        <g transform={`translate(${Math.min(520, Math.max(160, hoveredStrainPoint.px))}, ${Math.max(70, hoveredStrainPoint.py - 28)})`}>
                          <rect
                            x="-110"
                            y="-20"
                            width="220"
                            height="24"
                            rx="5"
                            fill="#11362d"
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                          <text x="0" y="-4" fill="#ffffff" fontSize="9.5" fontFamily="DM Mono" fontWeight="600" textAnchor="middle">
                            {hoveredStrainPoint.mode} ({hoveredStrainPoint.strain_pct}): ΔE = +{hoveredStrainPoint.dE_strain_eV.toFixed(4)} eV
                          </text>
                        </g>
                      )}

                      {/* Legend Bar inside SVG (Stacked 3-row, Non-Colliding) */}
                      <g transform="translate(75, 48)">
                        <rect x="0" y="0" width="168" height="58" rx="6" fill="rgba(255, 255, 255, 0.95)" stroke="#cbd5e1" strokeWidth="1" />
                        <circle cx="14" cy="14" r="4" fill="#15803d" />
                        <text x="24" y="17.5" fill="#11362d" fontSize="9" fontFamily="DM Mono" fontWeight="600">Biaxial (Breathing)</text>
                        <circle cx="14" cy="30" r="4" fill="#0d9488" />
                        <text x="24" y="33.5" fill="#11362d" fontSize="9" fontFamily="DM Mono" fontWeight="600">Uniaxial X (Armchair)</text>
                        <circle cx="14" cy="46" r="4" fill="#c97b5d" />
                        <text x="24" y="49.5" fill="#11362d" fontSize="9" fontFamily="DM Mono" fontWeight="600">Uniaxial Y (Zigzag)</text>
                      </g>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 680 340" className="elasticity-svg" aria-label="Lattice Deformation Diagram">
                      {/* Subdued Background */}
                      <rect x="0" y="0" width="680" height="340" fill="#ffffff" rx="8" />

                      {/* Title Header */}
                      <text x="350" y="32" fill="#11362d" fontSize="11" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                        Direct Lattice Dilation & Transverse Poisson Coupling (a₀ = 7.141 Å, b₀ = 3.984 Å)
                      </text>

                      {/* Coordinate Grid: X mapping ε in [-0.03, +0.03] */}
                      {[-0.03, -0.02, -0.01, 0.00, 0.01, 0.02, 0.03].map((eps) => {
                        const px = 70 + (eps + 0.03) * (560 / 0.06)
                        const pctStr = `${eps > 0 ? '+' : ''}${(eps * 100).toFixed(0)}%`
                        return (
                          <g key={`x-lat-grid-${eps}`}>
                            <line x1={px} y1="45" x2={px} y2="280" stroke="#e2ece0" strokeWidth="1" strokeDasharray="3 3" />
                            <text x={px} y="296" fill="#4a6e57" fontSize="9.5" fontFamily="DM Mono" textAnchor="middle">
                              {pctStr}
                            </text>
                          </g>
                        )
                      })}
                      <text x="350" y="316" fill="#12281e" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                        Deformation Coordinate ε
                      </text>

                      {/* Left Y Axis: Lattice a(ε) in [6.90, 7.38] Å -> y in [280, 50] */}
                      {[6.92, 7.03, 7.14, 7.25, 7.36].map((a_val) => {
                        const py = 280 - (a_val - 6.90) * (230 / 0.48)
                        return (
                          <g key={`y-lat-a-${a_val}`}>
                            <line x1="70" y1={py} x2="630" y2={py} stroke="#eef4ec" strokeWidth="1" strokeDasharray="2 2" />
                            <text x="62" y={py + 3.5} fill="#15803d" fontSize="9.5" fontFamily="DM Mono" fontWeight="600" textAnchor="end">
                              {a_val.toFixed(2)} Å
                            </text>
                          </g>
                        )
                      })}
                      <text x="24" y="165" fill="#15803d" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle" transform="rotate(-90 24 165)">
                        Lattice Parameter a (Armchair)
                      </text>

                      {/* Right Y Axis: Lattice b(ε) in [3.86, 4.10] Å */}
                      {[3.86, 3.92, 3.98, 4.04, 4.10].map((b_val) => {
                        const py = 280 - (b_val - 3.86) * (230 / 0.24)
                        return (
                          <g key={`y-lat-b-${b_val}`}>
                            <text x="638" y={py + 3.5} fill="#c97b5d" fontSize="9.5" fontFamily="DM Mono" fontWeight="600">
                              {b_val.toFixed(2)} Å
                            </text>
                          </g>
                        )
                      })}
                      <text x="668" y="165" fill="#c97b5d" fontSize="10.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle" transform="rotate(90 668 165)">
                        Lattice Parameter b (Zigzag)
                      </text>

                      {/* Lattice a line (Armchair response) */}
                      {(() => {
                        const a0 = 7.1406
                        const ptsA = [-0.03, -0.02, -0.01, 0.00, 0.01, 0.02, 0.03].map((eps) => {
                          const valA = a0 * (1 + eps)
                          const px = 70 + (eps + 0.03) * (560 / 0.06)
                          const py = 280 - (valA - 6.90) * (230 / 0.48)
                          return `${px},${py}`
                        }).join(' ')

                        const b0 = 3.9836
                        const ptsB = [-0.03, -0.02, -0.01, 0.00, 0.01, 0.02, 0.03].map((eps) => {
                          const valB = b0 * (1 + eps)
                          const px = 70 + (eps + 0.03) * (560 / 0.06)
                          const py = 280 - (valB - 3.86) * (230 / 0.24)
                          return `${px},${py}`
                        }).join(' ')

                        return (
                          <g>
                            <polyline points={ptsA} fill="none" stroke="#15803d" strokeWidth="2.8" />
                            <polyline points={ptsB} fill="none" stroke="#c97b5d" strokeWidth="2.8" strokeDasharray="5 3" />
                          </g>
                        )
                      })()}

                      {/* Dynamic Indicator Marker for Active Strained State */}
                      {(() => {
                        const px = 70 + (currentStrainVal + 0.03) * (560 / 0.06)
                        return (
                          <g>
                            <line x1={px} y1="45" x2={px} y2="280" stroke="#11362d" strokeWidth="1.8" strokeDasharray="4 2" />
                            <circle cx={px} cy="280" r="5" fill="#11362d" />
                            <text x={px} y="40" fill="#11362d" fontSize="9.5" fontFamily="DM Mono" fontWeight="700" textAnchor="middle">
                              Active: {currentStrainPct}
                            </text>
                          </g>
                        )
                      })()}

                      {/* Legend */}
                      <g transform="translate(80, 52)">
                        <rect x="0" y="0" width="240" height="42" rx="6" fill="rgba(255, 255, 255, 0.94)" stroke="#d5dfd1" strokeWidth="1" />
                        <line x1="12" y1="14" x2="32" y2="14" stroke="#15803d" strokeWidth="2.5" />
                        <text x="38" y="17.5" fill="#15803d" fontSize="9" fontFamily="DM Mono" fontWeight="700">a(ε) Armchair Dilatancy</text>
                        <line x1="12" y1="28" x2="32" y2="28" stroke="#c97b5d" strokeWidth="2.5" strokeDasharray="4 2" />
                        <text x="38" y="31.5" fill="#c97b5d" fontSize="9" fontFamily="DM Mono" fontWeight="700">b(ε) Zigzag Dilatancy</text>
                      </g>
                    </svg>
                  )}
                </div>

                <div className="sim-footer-caption">
                  <span>
                    <strong>DFT Harmonic Basin Mechanics:</strong> Quadratic parabolic fit confirming exceptional 2D in-plane stiffness c₁₁ = 261.2 N/m, c₂₂ = 257.1 N/m. Validating unconditional Born mechanical stability against shear or acoustic phonon collapse.
                  </span>
                </div>
              </div>

              <div className="sim-telemetry-card">
                {/* Born Mechanical Stability Card */}
                <div className="born-stability-box">
                  <div className="bs-header-row">
                    <ShieldCheck size={18} color="#15803d" />
                    <span className="bs-title">BORN MECHANICAL STABILITY: SATISFIED</span>
                  </div>
                  <div className="bs-criteria-list">
                    <div className="bs-crit-item">
                      <Check size={13} color="#15803d" />
                      <span>Criterion 1: <MathTex math="c_{11} > 0" inline={true} /></span>
                      <strong>261.2 N/m &gt; 0 (PASS)</strong>
                    </div>
                    <div className="bs-crit-item">
                      <Check size={13} color="#15803d" />
                      <span>Criterion 2: <MathTex math="c_{22} > 0" inline={true} /></span>
                      <strong>257.1 N/m &gt; 0 (PASS)</strong>
                    </div>
                    <div className="bs-crit-item">
                      <Check size={13} color="#15803d" />
                      <span>Criterion 3: <MathTex math="c_{11}c_{22} - c_{12}^2 > 0" inline={true} /></span>
                      <strong>63,626 N²/m² &gt; 0 (PASS)</strong>
                    </div>
                  </div>
                  <span className="bs-note">
                    Verifies complete stability under homogeneous in-plane deformations within the ±3% elastic limit.
                  </span>
                </div>

                <div className="elastic-metrics-table">
                  <div className="em-row">
                    <span>Stiffness <MathTex math="c_{11}" inline={true} /> (Armchair)</span>
                    <strong>{data.elasticity.c11} N/m</strong>
                  </div>
                  <div className="em-row">
                    <span>Stiffness <MathTex math="c_{22}" inline={true} /> (Zigzag)</span>
                    <strong>{data.elasticity.c22} N/m</strong>
                  </div>
                  <div className="em-row">
                    <span>Cross-coupling <MathTex math="c_{12}" inline={true} /></span>
                    <strong>{data.elasticity.c12} N/m</strong>
                  </div>
                  <div className="em-row">
                    <span>Young's Modulus <MathTex math="Y_x" inline={true} /> (Armchair)</span>
                    <strong>{data.elasticity.young_modulus_armchair_x} N/m</strong>
                  </div>
                  <div className="em-row">
                    <span>Young's Modulus <MathTex math="Y_y" inline={true} /> (Zigzag)</span>
                    <strong>{data.elasticity.young_modulus_zigzag_y} N/m</strong>
                  </div>
                  <div className="em-row">
                    <span>Poisson's Ratio <MathTex math="\nu_{xy}" inline={true} /></span>
                    <strong>{data.elasticity.poisson_xy}</strong>
                  </div>
                  <div className="em-row">
                    <span>Poisson's Ratio <MathTex math="\nu_{yx}" inline={true} /></span>
                    <strong>{data.elasticity.poisson_yx}</strong>
                  </div>
                  <div className="em-row highlight">
                    <span>Graphene Stiffness Retention</span>
                    <strong>{data.elasticity.graphene_stiffness_retention_pct}%</strong>
                  </div>
                </div>

                <div className="strained-geometry-hud">
                  <span className="block-title">INSTANTANEOUS LATTICE GEOMETRY ({currentStrainPct})</span>
                  <div className="geom-grid">
                    <div>
                      <span>Lattice a</span>
                      <strong>{strainedLatticeA} Å</strong>
                    </div>
                    <div>
                      <span>Lattice b</span>
                      <strong>{strainedLatticeB} Å</strong>
                    </div>
                    <div>
                      <span>Cell Area</span>
                      <strong>{(parseFloat(strainedLatticeA) * parseFloat(strainedLatticeB)).toFixed(2)} Å²</strong>
                    </div>
                    <div>
                      <span>Total DFT Energy</span>
                      <strong>{currentPoint.energy_eV?.toFixed(4)} eV</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 06: CALCULATION PROVENANCE & EXPORT                          */}
        {/* ==================================================================== */}
        {isPhoth && activeModule === 'provenance' && (
          <div className="module-panel provenance-panel">
            <div className="panel-header-strip">
              <div>
                <span className="module-kicker">06 — CALCULATION PROVENANCE & EXPORT</span>
                <h3 className="panel-title">VASP Computational Engine Specs & Reproducible Artifacts</h3>
                <p className="panel-desc">
                  Complete PAW POTCAR metadata, exact input scripts (INCAR, KPOINTS), convergence thresholds, and raw CSV tables.
                </p>
              </div>

              <div className="panel-actions-cluster">
                <button
                  className="btn-download-asset"
                  onClick={() => handleCopy(JSON.stringify(data.dft_engine_specs, null, 2), 'dft_specs_json')}
                >
                  {copiedField === 'dft_specs_json' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedField === 'dft_specs_json' ? 'Specs Copied' : 'Copy Specs JSON'}
                </button>
              </div>
            </div>

            <div className="provenance-subnav">
              <button
                className={`prov-subbtn ${provTab === 'specs' ? 'active' : ''}`}
                onClick={() => setProvTab('specs')}
              >
                <Cpu size={13} /> Engine Specs & POTCAR
              </button>
              <button
                className={`prov-subbtn ${provTab === 'energy' ? 'active' : ''}`}
                onClick={() => setProvTab('energy')}
              >
                <FileSpreadsheet size={13} /> Energy vs. Strain (21 Points)
              </button>
              <button
                className={`prov-subbtn ${provTab === 'incar' ? 'active' : ''}`}
                onClick={() => setProvTab('incar')}
              >
                <Sliders size={13} /> VASP Input Scripts
              </button>
              <button
                className={`prov-subbtn ${provTab === 'literature' ? 'active' : ''}`}
                onClick={() => setProvTab('literature')}
              >
                <BookOpen size={13} /> Theoretical Literature & Strategy
              </button>
            </div>

            {provTab === 'specs' && (
              <div className="dft-engine-grid">
                <div className="dft-spec-card">
                  <div className="spec-card-head">
                    <Database size={15} />
                    <h5>PAW Pseudopotential Specs</h5>
                  </div>
                  <div className="spec-details-list">
                    <div className="spec-row">
                      <span>Potential Title</span>
                      <strong>{data.dft_engine_specs.paw_pseudopotential.titel}</strong>
                    </div>
                    <div className="spec-row">
                      <span>Valence Electrons</span>
                      <strong>{data.dft_engine_specs.paw_pseudopotential.valence_electrons} e⁻ (2s² 2p²)</strong>
                    </div>
                    <div className="spec-row">
                      <span>Cutoff Radius r_c</span>
                      <strong>{data.dft_engine_specs.paw_pseudopotential.cutoff_radius_rc_angstrom} Å (1.50 Bohr)</strong>
                    </div>
                    <div className="spec-row">
                      <span>Relativistic</span>
                      <strong>{data.dft_engine_specs.paw_pseudopotential.relativistic}</strong>
                    </div>
                    <div className="spec-row">
                      <span>SHA-256 Checksum</span>
                      <code className="checksum-code">{data.dft_engine_specs.paw_pseudopotential.sha256_checksum.slice(0, 24)}…</code>
                    </div>
                  </div>
                </div>

                <div className="dft-spec-card">
                  <div className="spec-card-head">
                    <Zap size={15} />
                    <h5>Exchange & Convergence</h5>
                  </div>
                  <div className="spec-details-list">
                    <div className="spec-row">
                      <span>PBE Dispersion</span>
                      <strong>{data.dft_engine_specs.exchange_correlation.dispersion_correction}</strong>
                    </div>
                    <div className="spec-row">
                      <span>HSE06 Screening</span>
                      <strong>{data.dft_engine_specs.exchange_correlation.screening_parameter} (25% Fock)</strong>
                    </div>
                    <div className="spec-row">
                      <span>SCF Threshold (EDIFF)</span>
                      <strong>{data.dft_engine_specs.convergence_criteria.electronic_scf_threshold}</strong>
                    </div>
                    <div className="spec-row">
                      <span>Ionic Forces (EDIFFG)</span>
                      <strong>{data.dft_engine_specs.convergence_criteria.ionic_force_threshold}</strong>
                    </div>
                    <div className="spec-row">
                      <span>Vacuum & Dipole</span>
                      <strong>c = 20.00 Å, LDIPOL = .TRUE.</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {provTab === 'energy' && (
              <div className="energy-table-card">
                <div className="table-header-flex">
                  <span>Authentic VASP Converged States across 3 Strain Modes</span>
                  <a href={data.visual_assets.raw_energy_csv} download className="btn-download-asset">
                    <Download size={13} /> Download raw CSV
                  </a>
                </div>
                <div className="table-responsive">
                  <table className="pulmify-table">
                    <thead>
                      <tr>
                        <th>Deformation Tensor</th>
                        <th>Strain Magnitude (<MathTex math="\varepsilon" inline={true} />)</th>
                        <th>Total Energy E (eV)</th>
                        <th>Relative <MathTex math="\Delta E" inline={true} /> (eV)</th>
                        <th>SCF Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.raw_energy_strain.map((row, idx) => {
                        const e0 = -86.77363644
                        const dE = row.total_energy_eV - e0
                        return (
                          <tr key={idx}>
                            <td><strong>{row.mode}</strong></td>
                            <td>{row.strain}</td>
                            <td className="code-font">{row.total_energy_eV.toFixed(8)}</td>
                            <td style={{ color: dE > 0 ? '#b45309' : '#15803d' }}>
                              {dE >= 0 ? `+${dE.toFixed(4)}` : dE.toFixed(4)}
                            </td>
                            <td><span className="status-tag converged">{row.convergence}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {provTab === 'incar' && (
              <div className="incar-grid">
                <div className="code-box-card">
                  <div className="code-head">
                    <span>INCAR · Ground State PBE-D3 Relaxation</span>
                    <button
                      className="btn-copy-code"
                      onClick={() => handleCopy(data.vasp_inputs.incar_pbe_relax, 'incar_pbe')}
                    >
                      {copiedField === 'incar_pbe' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'incar_pbe' ? 'Copied' : 'Copy INCAR'}
                    </button>
                  </div>
                  <pre className="code-block">{data.vasp_inputs.incar_pbe_relax}</pre>
                </div>

                <div className="code-box-card">
                  <div className="code-head">
                    <span>INCAR · Screened Hybrid HSE06 Static Evaluation</span>
                    <button
                      className="btn-copy-code"
                      onClick={() => handleCopy(data.vasp_inputs.incar_hse06_bands, 'incar_hse')}
                    >
                      {copiedField === 'incar_hse' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'incar_hse' ? 'Copied' : 'Copy INCAR'}
                    </button>
                  </div>
                  <pre className="code-block">{data.vasp_inputs.incar_hse06_bands}</pre>
                </div>
              </div>
            )}

            {provTab === 'literature' && (
              <div className="literature-strategy-container">
                {/* 1. Header Banner */}
                <div className="lit-strategy-banner">
                  <div className="lit-banner-left">
                    <span className="lit-eyebrow">THEORETICAL FOUNDATIONS & 2D CARBON ATLAS STRATEGY</span>
                    <h4>Scientific Literature & User Discovery Architecture</h4>
                    <p>
                      Anchored on published first-principles benchmarks (biphenylene HER & thermal persistence) and the 
                      coordinate-free rank-3 graph embedding tensor <MathTex math="\Phi_{v,e,f}" inline={true} /> for tolerance-free wallpaper symmetry.
                    </p>
                  </div>
                  <div className="lit-banner-actions">
                    <a href="./papers/41598_2021_Article_98261.pdf" download className="btn-lit-quickdownload">
                      <Download size={13} /> Luo et al. (Sci Rep 2021)
                    </a>
                    <a href="./papers/s41524-025-01932-8.pdf" download className="btn-lit-quickdownload">
                      <Download size={13} /> Macmillan et al. (npj 2025)
                    </a>
                  </div>
                </div>

                {/* 2. Published Papers Cards */}
                <div className="lit-papers-grid">
                  <div className="lit-paper-card">
                    <div className="lit-paper-header">
                      <div className="lit-journal-chip nature-chip">Nature · Scientific Reports 11, 19008 (2021)</div>
                      <span className="lit-paper-year">Sep 2021</span>
                    </div>
                    <h5>A first principles investigation on the structural, mechanical, electronic, and catalytic properties of biphenylene</h5>
                    <p className="lit-authors">Yi Luo, Chongdan Ren, Yujing Xu, Jin Yu, Sake Wang & Minglei Sun</p>
                    
                    <div className="lit-findings-list">
                      <div className="lit-finding-item">
                        <span className="finding-label">Experimental Synthesis Benchmark</span>
                        <p>Demonstrates that non-hexagonal <MathTex math="sp^2" inline={true} /> carbon allotropes with <MathTex math="\Delta E \le +0.456\text{ eV/atom}" inline={true} /> (biphenylene) are synthetically accessible via on-surface Ullmann-like coupling.</p>
                      </div>
                      <div className="lit-finding-item">
                        <span className="finding-label">Phonon & 4500 K Thermal Persistence</span>
                        <p>Zero imaginary phonon branches across the entire Brillouin zone; AIMD trajectories verify dynamic stability up to an ultra-high 4500 K melting point.</p>
                      </div>
                      <div className="lit-finding-item">
                        <span className="finding-label">Anisotropic Mechanics & Catalysis</span>
                        <p>In-plane stiffness <MathTex math="Y_{2D} = 259.7\text{ N/m}" inline={true} /> (armchair). Delocalized non-hexagonal rings yield near-zero HER <MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} /> overpotential, dramatically outperforming pristine graphene (<MathTex math="+1.86\text{ eV}" inline={true} />).</p>
                      </div>
                    </div>

                    <div className="lit-card-footer">
                      <a href="./papers/41598_2021_Article_98261.pdf" download className="btn-paper-download">
                        <Download size={14} /> Download PDF (6 Pages)
                      </a>
                      <a href="https://doi.org/10.1038/s41598-021-98261-9" target="_blank" rel="noreferrer" className="btn-paper-doi">
                        <ExternalLink size={13} /> DOI: 10.1038/s41598-021-98261-9
                      </a>
                    </div>
                  </div>

                  <div className="lit-paper-card">
                    <div className="lit-paper-header">
                      <div className="lit-journal-chip npj-chip">Nature · npj Computational Materials 11, 27 (2025)</div>
                      <span className="lit-paper-year">Jan 2025</span>
                    </div>
                    <h5>Graph embedding tensor: unifying topological description, symmetry detection, and structure generation for two-dimensional carbon allotropes</h5>
                    <p className="lit-authors">Lilac Macmillan, Eduardo Costa Girão & Vincent Meunier</p>
                    
                    <div className="lit-findings-list">
                      <div className="lit-finding-item">
                        <span className="finding-label">Rank-3 Embedding Tensor <MathTex math="\Phi_{v,e,f}" inline={true} /></span>
                        <p>Elevates vertices <MathTex math="v" inline={true} />, edges <MathTex math="e" inline={true} />, and polygonal faces <MathTex math="f" inline={true} /> to equal footing, producing a gauge-invariant, coordinate-free encoding obeying Euler characteristic <MathTex math="\chi = V - E + F = 0" inline={true} />.</p>
                      </div>
                      <div className="lit-finding-item">
                        <span className="finding-label">Tolerance-Free Wallpaper Symmetry</span>
                        <p>Maps <MathTex math="\Phi" inline={true} /> to flag graphs <MathTex math="\Omega" inline={true} /> to determine plane groups algebraically, eliminating numerical tolerance errors and coordinate jitter in space group recognition.</p>
                      </div>
                      <div className="lit-finding-item">
                        <span className="finding-label">Generative Discovery & Girão Rings</span>
                        <p>Iterative add-dimer Stone-Wales transformations generate all <MathTex math="N_F" inline={true} /> face crystals while auto-pruning isomorphic duplicates, formally establishing the <MathTex math="r4^1 \cdot 6^1 \cdot 8^1" inline={true} /> ring notation.</p>
                      </div>
                    </div>

                    <div className="lit-card-footer">
                      <a href="./papers/s41524-025-01932-8.pdf" download className="btn-paper-download">
                        <Download size={14} /> Download PDF (14 Pages)
                      </a>
                      <a href="https://doi.org/10.1038/s41524-025-01932-8" target="_blank" rel="noreferrer" className="btn-paper-doi">
                        <ExternalLink size={13} /> DOI: 10.1038/s41524-025-01932-8
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3. The Five Research Personas */}
                <div className="persona-matrix-card">
                  <div className="persona-matrix-head">
                    <div className="head-text">
                      <div className="tag-flex">
                        <UserCheck size={14} />
                        <span>RESEARCH-INFORMED USER PERSONAS & WORKFLOW ARCHITECTURE</span>
                      </div>
                      <h5>Five User Profiles for Carbon Atlas Discovery</h5>
                      <p>Serving different scientific questions without cluttering the interface.</p>
                    </div>
                    <div className="persona-pills">
                      {[
                        { id: 'dft', label: 'A · Computational DFT' },
                        { id: 'exp', label: 'B · Experimental Scientist' },
                        { id: 'student', label: 'C · Grad Student' },
                        { id: 'visitor', label: 'D · Curious Science' },
                        { id: 'catalysis', label: 'E · Catalysis & Defect' },
                      ].map(p => (
                        <button
                          key={p.id}
                          className={`persona-pill-btn ${activePersona === p.id ? 'active' : ''}`}
                          onClick={() => setActivePersona(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="persona-detail-box">
                    {activePersona === 'dft' && (
                      <div className="persona-active-view">
                        <div className="persona-question">
                          <strong>Key Scientific Question:</strong>
                          <em>“Which low-energy carbon allotropes have Dirac or semiconducting electronic profiles, and can I export a verified VASP supercell?”</em>
                        </div>
                        <div className="persona-columns">
                          <div className="col-card">
                            <span className="col-title">Primary Needs</span>
                            <ul>
                              <li>Strict Wyckoff fractional & Cartesian coordinate fidelity</li>
                              <li>Screened Hybrid HSE06 vs PBE bandgap comparison</li>
                              <li>Exact convergence thresholds (EDIFF = 10⁻⁸ eV, EDIFFG = 10⁻⁴ eV/Å)</li>
                              <li>One-click simulation-ready POSCAR supercells</li>
                            </ul>
                          </div>
                          <div className="col-card">
                            <span className="col-title">Main Frustration Avoided</span>
                            <p className="frustration-text">“Visual gloss without verifiable underlying DFT parameters and reproducible lattice vectors.”</p>
                            <span className="col-title" style={{ marginTop: '12px' }}>Carbon Atlas Feature</span>
                            <div className="feature-chip">Module 06 PAW SHA-256 + 21 Converged Strain States</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePersona === 'exp' && (
                      <div className="persona-active-view">
                        <div className="persona-question">
                          <strong>Key Scientific Question:</strong>
                          <em>“Which allotropes are structurally plausible, have experimental benchmarks, and could be synthesized via bottom-up molecular precursors?”</em>
                        </div>
                        <div className="persona-columns">
                          <div className="col-card">
                            <span className="col-title">Primary Needs</span>
                            <ul>
                              <li>Synthesis benchmark reference (<MathTex math="\Delta E \le +0.456\text{ eV/atom}" inline={true} /> biphenylene baseline)</li>
                              <li>Dynamical phonon stability (absence of imaginary soft modes)</li>
                              <li>Finite-temperature persistence (AIMD trajectories up to 4500 K)</li>
                              <li>Clear distinction between purely hypothetical vs synthesized lattices</li>
                            </ul>
                          </div>
                          <div className="col-card">
                            <span className="col-title">Main Frustration Avoided</span>
                            <p className="frustration-text">“Relative energy presented as an absolute guarantee of synthesizability without kinetic barriers.”</p>
                            <span className="col-title" style={{ marginTop: '12px' }}>Carbon Atlas Feature</span>
                            <div className="feature-chip">Biphenylene comparative stability threshold + Phonon verification</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePersona === 'student' && (
                      <div className="persona-active-view">
                        <div className="persona-question">
                          <strong>Key Scientific Question:</strong>
                          <em>“Why does this allotrope differ from graphene, how does strain alter the Dirac point, and how can I reproduce the calculations?”</em>
                        </div>
                        <div className="persona-columns">
                          <div className="col-card">
                            <span className="col-title">Primary Needs</span>
                            <ul>
                              <li>Pedagogical tooltips explaining Girão ring notation (<MathTex math="r4^1 \cdot 6^1 \cdot 8^1" inline={true} />)</li>
                              <li>Interactive reciprocal space topology and high-symmetry paths (<MathTex math="\Gamma \to \mathrm{X} \to \mathrm{S} \to \mathrm{Y} \to \Gamma" inline={true} />)</li>
                              <li>Full VASP INCAR inputs with explanatory tags</li>
                              <li>Direct physical units (Bader net charge in <MathTex math="e" inline={true} />, stiffness in N/m)</li>
                            </ul>
                          </div>
                          <div className="col-card">
                            <span className="col-title">Main Frustration Avoided</span>
                            <p className="frustration-text">“Dense specialist jargon presented without context, formula explanations, or units.”</p>
                            <span className="col-title" style={{ marginTop: '12px' }}>Carbon Atlas Feature</span>
                            <div className="feature-chip">Interactive Reciprocal Space Inspector + MathTex LaTeX Equations</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePersona === 'visitor' && (
                      <div className="persona-active-view">
                        <div className="persona-question">
                          <strong>Key Scientific Question:</strong>
                          <em>“How can the same carbon atoms arrange into such completely different geometric patterns and colors?”</em>
                        </div>
                        <div className="persona-columns">
                          <div className="col-card">
                            <span className="col-title">Primary Needs</span>
                            <ul>
                              <li>Real-time 3D orbit lattice manipulation (drag to rotate, scroll to zoom)</li>
                              <li>Visual polygon ring breakdown (4-, 5-, 6-, 7-, 8-member rings)</li>
                              <li>Color-coded charge redistribution (copper depletion vs emerald accumulation)</li>
                              <li>Plain-language crystallographic summaries</li>
                            </ul>
                          </div>
                          <div className="col-card">
                            <span className="col-title">Main Frustration Avoided</span>
                            <p className="frustration-text">“Being immediately overwhelmed by complex numerical arrays and dense VASP scripts.”</p>
                            <span className="col-title" style={{ marginTop: '12px' }}>Carbon Atlas Feature</span>
                            <div className="feature-chip">WebGL Three.js 3D Orbiting Lattice with Camera Presets</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePersona === 'catalysis' && (
                      <div className="persona-active-view">
                        <div className="persona-question">
                          <strong>Key Scientific Question:</strong>
                          <em>“Which carbon coordination sites become active for hydrogen adsorption (HER) under mechanical strain or functionalization?”</em>
                        </div>
                        <div className="persona-columns">
                          <div className="col-card">
                            <span className="col-title">Primary Needs</span>
                            <ul>
                              <li>Wyckoff site-resolved Bader charge redistribution <MathTex math="Q_{\mathrm{net}}(C_i)" inline={true} /></li>
                              <li>Volmer-Heyrovsky Gibbs free energy <MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} /> per coordination site</li>
                              <li>Chemisorbed hydrogen adatom geometry (<MathTex math="d_{\mathrm{C-H}} = 1.109\text{ Å}" inline={true} /> above <MathTex math="C_5" inline={true} />)</li>
                              <li>Charge Density Difference (CDD) isosurface visualization</li>
                            </ul>
                          </div>
                          <div className="col-card">
                            <span className="col-title">Main Frustration Avoided</span>
                            <p className="frustration-text">“Catalytic values disconnected from exact atomic site geometry and deformation states.”</p>
                            <span className="col-title" style={{ marginTop: '12px' }}>Carbon Atlas Feature</span>
                            <div className="feature-chip">Module 04 HER Adatom Simulator + Synchronized Wyckoff Bader Map</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Priority Roadmap Matrix (P0 - P3) & Next Milestone */}
                <div className="strategy-roadmap-grid">
                  <div className="roadmap-matrix-card">
                    <div className="matrix-head">
                      <Target size={15} />
                      <h5>Carbon Atlas v2.0 Scientific Feature Priorities</h5>
                    </div>
                    <div className="matrix-table-wrap">
                      <table className="matrix-table">
                        <thead>
                          <tr>
                            <th>Feature Pillar</th>
                            <th>Research Value</th>
                            <th>Audience Fit</th>
                            <th>Status / Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Interactive 3D Orbit Lattice</strong></td>
                            <td>High (Atomic coordination & bonds)</td>
                            <td>All 5 Personas</td>
                            <td><span className="priority-badge p0">P0 · Active (WebGL)</span></td>
                          </tr>
                          <tr>
                            <td><strong>Coordinate-Free Topology Filter</strong></td>
                            <td>Very High (Macmillan tensor <MathTex math="\Phi" inline={true} />)</td>
                            <td>Personas A, B, C</td>
                            <td><span className="priority-badge p0">P0 · Active (Girão)</span></td>
                          </tr>
                          <tr>
                            <td><strong>Calculated Provenance & Supercells</strong></td>
                            <td>Very High (Simulation reproducibility)</td>
                            <td>Personas A, C, E</td>
                            <td><span className="priority-badge p0">P0 · Active (POSCAR/CIF)</span></td>
                          </tr>
                          <tr>
                            <td><strong>Side-by-Side Dual Allotrope Compare</strong></td>
                            <td>Very High (Comparative discovery)</td>
                            <td>Personas A, B, C, D</td>
                            <td><span className="priority-badge p0-next">P0 · Next Milestone</span></td>
                          </tr>
                          <tr>
                            <td><strong>Electronic Bands (PBE vs HSE06)</strong></td>
                            <td>Very High (Exact Dirac cone & gaps)</td>
                            <td>Personas A, C</td>
                            <td><span className="priority-badge p1">P1 · Active (Module 02)</span></td>
                          </tr>
                          <tr>
                            <td><strong>Bader & CDD Volumetric Fields</strong></td>
                            <td>High (Site-specific charge transfer)</td>
                            <td>Personas A, E</td>
                            <td><span className="priority-badge p2">P2 · Active (Module 01/03)</span></td>
                          </tr>
                          <tr>
                            <td><strong>HER Catalytic Adsorption Explorer</strong></td>
                            <td>High (Volmer-Heyrovsky <MathTex math="\Delta G_{\mathrm{H^*}}" inline={true} />)</td>
                            <td>Persona E</td>
                            <td><span className="priority-badge p2">P2 · Active (Module 04)</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="next-milestone-card">
                    <div className="milestone-badge">RECOMMENDED NEXT MILESTONE</div>
                    <h4>Dual-Allotrope Side-by-Side Comparison Workspace</h4>
                    <p>
                      Connects the Carbon Atlas explorer directly with the Quantum Laboratory:
                      select two carbon allotropes (e.g. <strong>PHOTH</strong> vs <strong>Biphenylene</strong> vs <strong>Graphene</strong>)
                      and directly compare their:
                    </p>
                    <ul className="milestone-list">
                      <li><strong>Relative Energy Ranking:</strong> Comparative synthesis benchmark (<MathTex math="\Delta E \le +0.456\text{ eV/atom}" inline={true} />).</li>
                      <li><strong>Ring Composition & Symmetry:</strong> Girão notation vs plane wallpaper group.</li>
                      <li><strong>Electronic Dispersion:</strong> Superimposed Dirac points and band gap openings.</li>
                      <li><strong>Volmer-Heyrovsky Overpotential:</strong> Site-resolved HER Gibbs free energies.</li>
                    </ul>
                    <div className="milestone-footer-note">
                      Bridge between visual admiration and actionable simulation planning.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </section>
  )
}
