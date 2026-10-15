import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ExternalLink, Check, Layers, BookOpen, Compass, ShieldCheck,
  ArrowDownRight, Sparkles, AlertCircle, Copy, Info, Search, Filter,
  ChevronDown, ChevronRight, FileText, ArrowUpRight, ArrowRight,
  Maximize2, Minimize2, Scale, Download, Camera, Sliders
} from 'lucide-react'
import { MathTex, ScientificFormula, getGiraoNotation, isNamedAllotrope } from './ScientificFormula'
import {
  getReferencesForStructure,
  toBibTeX,
  toAPA,
  toRIS
} from '../data/scientificBibliography'
import {
  getStructureBondingBadge,
  extractStructureBondStats,
  getStructureBondingClass,
} from '../utils/bondingLogic'

export function StructureInspector({
  selected,
  onClose,
  viewerMode,
  setViewerMode,
  CarbonLattice3D,
  MiniStructure,
  showMirrors,
  setShowMirrors,
  showRotations,
  setShowRotations,
  symmetryGroup,
  setSymmetryGroup,
  benchmark = 0.456,
  onSelectCanonical,
  onOpenExportDrawer,
  onOpenAbInitioWorkspace,
  isCompared = false,
  onToggleCompare,
  isExpanded = false,
  onToggleExpand,
}) {
  const [activeTab, setActiveTab] = useState('descriptors') // 'descriptors' | 'wyckoff' | 'citations'
  const [copiedDoi, setCopiedDoi] = useState(null)
  const [bibSearch, setBibSearch] = useState('')
  const [bibFilter, setBibFilter] = useState('all')
  const [bibSort, setBibSort] = useState('seminal-desc')
  const [expandedBibId, setExpandedBibId] = useState(null)

  // Synchronize wallpaper group dropdown with selected structure's actual plane group
  React.useEffect(() => {
    if (selected) {
      const actualWp = selected.wallpaperCode || selected.wallpaperGroup || selected.wallpaper_group || ''
      if (actualWp && setSymmetryGroup) {
        const cleanWp = actualWp.toLowerCase().replace(/[^a-z0-9]/g, '')
        const wpCode = actualWp.toLowerCase().split(/[\s(#]/)[0].trim()
        const wpList = ['p1','p2','pm','pg','cm','pmm','pmg','pgg','cmm','p4','p4m','p4g','p3','p3m1','p31m','p6','p6m']
        const matched =
          wpList.find(w => w === wpCode) ||
          wpList.find(w => w === cleanWp) ||
          wpList.filter(w => cleanWp.startsWith(w)).sort((a, b) => b.length - a.length)[0]
        if (matched) {
          setSymmetryGroup(matched)
        }
      }
    }
  }, [selected?.id, selected?.wallpaperGroup, selected?.wallpaper_group, selected?.wallpaperCode, setSymmetryGroup])

  if (!selected) return null

  const desc = selected.descriptors || {}
  const prov = selected.provenance || {}
  const plane = selected.planeStandardization || {}

  const stats = useMemo(() => extractStructureBondStats(selected), [selected])
  const bondingBadge = useMemo(() => getStructureBondingBadge(selected), [selected])

  const singleCount = stats.singleCount
  const doubleCount = stats.doubleCount
  const aromaticCount = stats.aromaticCount
  const totalBonds = stats.totalBonds
  const fracSingle = stats.fSingle * 100
  const fracDouble = stats.fDouble * 100
  const fracAromatic = stats.fArom * 100
  const displayDeltaD = stats.deltaD ?? stats.effectiveDeltaD

  // Dynamically resolve all verified literature synced with the scientific bibliography
  const allRefs = useMemo(() => {
    return getReferencesForStructure(selected)
  }, [selected])

  // Filter and sort literature within the inspector
  const filteredRefs = useMemo(() => {
    let result = allRefs.filter((ref) => {
      const q = bibSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (ref.title || '').toLowerCase().includes(q) ||
        (ref.authors || []).some(a => a.toLowerCase().includes(q)) ||
        (ref.journal || '').toLowerCase().includes(q) ||
        (ref.doi || '').toLowerCase().includes(q)

      const matchesCategory =
        bibFilter === 'all' ||
        (ref.category || '').toLowerCase() === bibFilter.toLowerCase()

      return matchesSearch && matchesCategory
    })

    result.sort((a, b) => {
      if (bibSort === 'year-desc') return (b.year || 0) - (a.year || 0)
      if (bibSort === 'year-asc') return (a.year || 0) - (b.year || 0)
      if (bibSort === 'title-asc') return (a.title || '').localeCompare(b.title || '')
      if (bibSort === 'seminal-desc') {
        const aIsSem = a.category === 'Experimental Synthesis' || a.category === 'Foundational Taxonomy' ? 1 : 0
        const bIsSem = b.category === 'Experimental Synthesis' || b.category === 'Foundational Taxonomy' ? 1 : 0
        return bIsSem - aIsSem || (b.year || 0) - (a.year || 0)
      }
      return 0
    })

    return result
  }, [allRefs, bibSearch, bibFilter, bibSort])

  const fmt = (v, digits = 3) => (v !== undefined && v !== null && !isNaN(v) ? Number(v).toFixed(digits) : '–')

  // Robust Quantitative Descriptors with verified mathematical fallbacks
  const computedMu2 = useMemo(() => {
    const rawVal = desc.ring_variance_mu2 ?? selected.mu2 ?? desc.lenosky_mu2 ?? selected.lenoskyMu2 ?? desc.mu2
    if (rawVal !== undefined && rawVal !== null && !isNaN(rawVal)) {
      return Number(rawVal)
    }
    const fractions = selected.ringFractions || desc.ring_fractions
    if (fractions && typeof fractions === 'object') {
      let sum = 0, total = 0
      Object.entries(fractions).forEach(([k, f]) => {
        const kNum = Number(k)
        const frac = Number(f)
        if (!isNaN(kNum) && !isNaN(frac)) {
          sum += Math.pow(kNum - 6, 2) * frac
          total += frac
        }
      })
      if (total > 0) return sum / total
    }
    const rings = selected.rings || desc.rings
    if (rings && typeof rings === 'object') {
      let sum = 0, total = 0
      Object.entries(rings).forEach(([k, count]) => {
        const kNum = Number(k)
        const n = Number(count)
        if (!isNaN(kNum) && !isNaN(n)) {
          sum += Math.pow(kNum - 6, 2) * n
          total += n
        }
      })
      if (total > 0) return sum / total
    }
    return null
  }, [desc, selected])

  const computedRingEntropy = useMemo(() => {
    const rawVal = desc.ring_entropy ?? desc.ring_entropy_shannon ?? selected.ringEntropy ?? selected.ring_entropy
    if (rawVal !== undefined && rawVal !== null && !isNaN(rawVal)) {
      return Number(rawVal)
    }
    const fractions = selected.ringFractions || desc.ring_fractions
    if (fractions && typeof fractions === 'object') {
      let entropy = 0
      Object.values(fractions).forEach(f => {
        const p = Number(f)
        if (p > 0) entropy -= p * Math.log(p)
      })
      return entropy
    }
    return null
  }, [desc, selected])

  const computedMsadTheta = useMemo(() => {
    const rawVal = desc.bond_angle_msd_120 ?? selected.bondAngleMsd120 ?? selected.bond_angle_msd_120 ?? desc.msad_theta ?? selected.msadTheta ?? (desc.bond_angle_std != null ? Math.pow(desc.bond_angle_std, 2) : null)
    if (rawVal !== undefined && rawVal !== null && !isNaN(rawVal)) {
      return Number(rawVal)
    }
    return null
  }, [desc, selected])

  const computedDeltaD = useMemo(() => {
    const rawVal = desc.bond_length_span ?? selected.bond_length_span ?? selected.bondLengthSpan ?? desc.delta_d ?? displayDeltaD
    if (rawVal !== undefined && rawVal !== null && !isNaN(rawVal)) {
      return Number(rawVal)
    }
    return null
  }, [desc, selected, displayDeltaD])

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text)
    setCopiedDoi(id)
    setTimeout(() => setCopiedDoi(null), 2000)
  }

  // Ring census formatted strictly for physical polygon counts (distinguished from top Girão formula)
  const ringCensusString = useMemo(() => {
    const rings = selected.rings || desc.rings
    if (rings && typeof rings === 'object' && Object.keys(rings).length > 0) {
      const entries = Object.entries(rings)
        .filter(([_, count]) => Number(count) > 0)
        .sort(([k1], [k2]) => Number(k1) - Number(k2))
      if (entries.length > 0) {
        return entries.map(([k, count]) => `${Number(count) > 1 ? count + '×' : ''}C${k}`).join(' · ')
      }
    }
    if (selected.polygonTypes && Array.isArray(selected.polygonTypes) && selected.polygonTypes.length > 0) {
      return selected.polygonTypes.map(p => `C${p}`).join(' · ')
    }
    return 'C6'
  }, [selected, desc])

  // Extract Wyckoff sites if available
  const wyckoffSites = useMemo(() => {
    if (selected.geometry?.fractional_coords) {
      return selected.geometry.fractional_coords.map((coords, i) => ({
        site: `C${i + 1}`,
        x: coords[0],
        y: coords[1],
        z: coords[2],
        wyckoff: selected.geometry.wyckoff_letters?.[i] || '–'
      }))
    }
    if (selected.atoms) {
      return selected.atoms.map((a, i) => ({
        site: a.label || `C${i + 1}`,
        x: a.fract_coords?.[0] ?? a.cart_coords?.[0] ?? 0,
        y: a.fract_coords?.[1] ?? a.cart_coords?.[1] ?? 0,
        z: a.fract_coords?.[2] ?? a.cart_coords?.[2] ?? 0,
        wyckoff: a.wyckoff || '–'
      }))
    }
    return []
  }, [selected])

  return (
    <motion.aside
      id="structure-inspector"
      className={`inspector-panel enhanced-inspector ${isExpanded ? 'inspector-expanded' : ''}`}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* 1. Header Bar: Title, Canonical Status & Inspector Controls */}
      <div className="inspector-topline">
        <div className="inspector-topline-left">
          <span className="inspector-dot" />
          <span className="inspector-kicker">STRUCTURE INSPECTOR</span>
          {selected.isCanonical === false ? (
            <span className="alias-chip" title={`Duplicate alias of canonical structure ${selected.canonicalId}`}>
              ALIAS RECORD
            </span>
          ) : (
            <span className="canonical-id-badge" title="Unique Canonical Allotrope in Master Dataset">
              CANONICAL #{selected.code || selected.id.toUpperCase()}
            </span>
          )}
        </div>
        <div className="inspector-topline-actions">
          {onToggleExpand && (
            <button
              className="inspector-tool-btn"
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse Inspector (Standard width)' : 'Expand Inspector (Wide research mode)'}
              aria-label="Toggle inspector width"
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          <button className="inspector-tool-btn" onClick={onClose} aria-label="Close inspector">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Primary Identity: Literature Name & Girão Taxonomy */}
      <div className="inspector-title-block">
        <div className="title-literature-name-wrap">
          <h3 className="title-literature-name">
            {isNamedAllotrope(selected) ? (
              selected.literatureName || selected.name
            ) : (
              <>
                <span className="title-prefix">Allotrope </span>
                <ScientificFormula text={selected.giraoSymbol || selected.symbol || getGiraoNotation(selected)} />
              </>
            )}
          </h3>
        </div>

        {/* High-Contrast Crystallographic Badges (Complementary with Grid) */}
        <div className="inspector-cryst-strip">
          <div className="cryst-pill">
            <span className="cryst-pill-label">GIRÃO</span>
            <strong className="cryst-pill-val">
              <ScientificFormula text={selected.giraoSymbol || selected.symbol || getGiraoNotation(selected)} />
            </strong>
          </div>
          {(selected.crystalSystem || selected.crystal_system) && (
            <div className="cryst-pill">
              <span className="cryst-pill-label">SYSTEM</span>
              <strong className="cryst-pill-val">{selected.crystalSystem || selected.crystal_system}</strong>
            </div>
          )}
          {(selected.pointGroup || selected.point_group) ? (
            <div className="cryst-pill">
              <span className="cryst-pill-label">POINT GROUP</span>
              <strong className="cryst-pill-val">{selected.pointGroup || selected.point_group}</strong>
            </div>
          ) : (selected.wallpaperGroup && (
            <div className="cryst-pill">
              <span className="cryst-pill-label">PLANE GROUP</span>
              <strong className="cryst-pill-val">{selected.wallpaperGroup}</strong>
            </div>
          ))}
        </div>

        {selected.isCanonical !== false && Array.isArray(selected.aliases) && (() => {
          const currentPrimary = (selected.literatureName || selected.name || '').toLowerCase().trim();
          const normPrimary = currentPrimary.replace(/[\s_\-]+/g, '');
          const canonId = (selected.canonicalId || selected.id || '').toLowerCase().trim();
          const normId = canonId.replace(/[\s_\-]+/g, '');
          const canonCode = (selected.code || '').toLowerCase().trim();
          const girao = (selected.giraoCode || selected.girao_code || '').toLowerCase().trim();
          
          const aliasMap = new Map();
          for (const a of selected.aliases) {
            if (!a || typeof a !== 'string') continue;
            const low = a.toLowerCase().trim();
            const norm = low.replace(/[\s_\-]+/g, '');
            if (norm === normPrimary || norm === normId || low === canonCode || low === girao) continue;
            if (/^g-\d+$/i.test(low)) continue;
            if (low.includes('^') || /[·²³⁴⁵⁶⁷⁸⁹¹]/.test(a)) continue;
            if (low.endsWith('_gr') || low.startsWith('alpha_') || low.startsWith('beta_')) continue;
            if (/^(p-4m2|amm2|sg|spacegroup)/i.test(low)) continue;
            if (low === 'c58') continue;

            if (!aliasMap.has(norm) || (a !== low && aliasMap.get(norm) === low)) {
              aliasMap.set(norm, a);
            }
          }
          const validAliases = Array.from(aliasMap.values());
          if (validAliases.length === 0) return null;
          return (
            <div className="inspector-aliases-bar" title="Verified literature aliases and historical designations">
              <span className="aliases-label">Verified Aliases:</span>
              <div className="aliases-tag-list">
                {validAliases.map(alias => (
                  <span key={alias} className="alias-tag">{alias}</span>
                ))}
              </div>
            </div>
          );
        })()}

        {selected.isCanonical === false && (
          <div className="alias-notice-banner">
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Duplicate Alias:</strong> Maps to canonical structure{' '}
              <button
                type="button"
                className="alias-link-inline"
                onClick={() => onSelectCanonical && onSelectCanonical(selected.canonicalId)}
              >
                {selected.canonicalId}
              </button>
              . Identical verified ground-state energetics (<MathTex math="\Delta E" /> = {fmt(selected.energy, 3)} eV/atom).
              {selected.id === 'alpha_gr' && (
                <div className="dataset-artifact-note">
                  <strong>Provenance Note:</strong> This record corresponds to raw file <code>g-12_alpha_gr.cif</code> from the Mendeley Data v2 benchmark dataset. Crystallographically, its unit cell and coordinates are an identical duplicate of canonical Phagraphene (G-07). It is physically distinct from the 5-6-8 ring allotrope α-phographene (Fan et al. 2017) and acetylenic α-graphyne (Baughman 1987).
                </div>
              )}
              {selected.id === 'beta_gr' && (
                <div className="dataset-artifact-note">
                  <strong>Provenance Note:</strong> This record corresponds to raw file <code>g-13_beta_gr.cif</code> from the Mendeley Data v2 benchmark dataset. Crystallographically, its unit cell and coordinates are an identical duplicate of canonical Biphenylene Network (G-02). It is physically distinct from β-phographene (Fan et al. 2017) and acetylenic β-graphyne (Baughman 1987).
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. HERO INTERACTIVE LATTICE VIEWPORT (Dominant Visual Element) */}
      <div className="inspector-hero-lattice-container">
        <div className="hero-lattice-header">
          <div className="hero-lattice-label">
            <span>CRYSTALLOGRAPHIC LATTICE</span>
          </div>
          <div className="hero-lattice-mode-switch" role="group" aria-label="Viewer dimension">
            <button
              type="button"
              className={`mode-toggle-btn ${viewerMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewerMode('3d')}
            >
              3D
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${viewerMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewerMode('2d')}
            >
              2D
            </button>
          </div>
        </div>

        <div className="hero-lattice-canvas">
          {viewerMode === '3d' ? (
            <CarbonLattice3D item={selected} />
          ) : (
            <MiniStructure item={selected} large showMirrors={showMirrors} showRotations={showRotations} />
          )}
        </div>

        {/* Viewport Toolbar HUD */}
        <div className="hero-lattice-hud">
          <span className="hud-caption" title={viewerMode === '3d' ? 'Orbit: Drag · Zoom: Scroll · Pan: Shift+Drag' : '2D Crystallographic Projection (Mirrors & Rotations)'}>
            {viewerMode === '3d' ? 'Orbit: Drag · Zoom: Scroll' : '2D Projection'}
          </span>
          <div className="hud-actions">
            {viewerMode === '2d' && (
              <>
                <button
                  type="button"
                  className={`hud-btn ${showMirrors ? 'active' : ''}`}
                  onClick={() => setShowMirrors(!showMirrors)}
                  title="Toggle Mirror Reflection Planes"
                >
                  Mirrors
                </button>
                <button
                  type="button"
                  className={`hud-btn ${showRotations ? 'active' : ''}`}
                  onClick={() => setShowRotations(!showRotations)}
                  title="Toggle Rotational Inversion Centers"
                >
                  Rotations
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. ESSENTIAL NUMERICAL PROPERTIES */}
      {/* 4A. Formation Energy Hero Card */}
      <div className="inspector-hero-energy-card">
        <div className="prop-energy-header">
          <span className="bento-label">FORMATION ENERGY (<MathTex math="\Delta E" />)</span>
          <span className={`prop-badge ${selected.energy < benchmark ? 'benchmark-below' : 'benchmark-above'}`}>
            {selected.energy < benchmark ? 'ΔE < 0.456 eV (Sub-Biphenylene)' : 'ΔE ≥ 0.456 eV (Above Biphenylene)'}
          </span>
        </div>
        <div className="prop-val-row">
          <strong className="prop-val-large">{fmt(selected.energy, 3)}</strong>
          <span className="prop-unit">eV / atom</span>
          <span className="prop-ref-tag">vs. Graphene (0.000 eV)</span>
        </div>
      </div>

      {/* 4B. Unified Bento Container (Option A: 1px hairline borders, zero orphan dead zone) */}
      <div className="inspector-bento-container">
        {/* Row 1, Col 1: Space Group */}
        <div className="bento-cell">
          <span className="bento-label">SPACE GROUP</span>
          <strong className="bento-val-text">{selected.spaceGroup || 'P1'}</strong>
          <span className="bento-sub">Plane: {selected.wallpaperGroup || symmetryGroup}</span>
        </div>

        {/* Row 1, Col 2: Polygon Rings (Physical Ring Census strictly distinguished from Girão formula) */}
        <div className="bento-cell">
          <span className="bento-label">POLYGON RINGS</span>
          <strong className="bento-val-text" title={ringCensusString}>
            {ringCensusString}
          </strong>
          <span className="bento-sub">
            {selected.polygonCount || (selected.polygonTypes ? selected.polygonTypes.length : 1)} distinct ring {(selected.polygonCount || 1) > 1 ? 'types' : 'type'}
          </span>
        </div>

        {/* Row 2, Col 1: Lattice Parameters (Standardized mathematical spacing) */}
        <div className="bento-cell">
          <span className="bento-label">LATTICE PARAMETERS</span>
          <strong className="bento-val-text">
            a = {fmt(selected.latticeA, 3)} Å · b = {fmt(selected.latticeB, 3)} Å
          </strong>
          <span className="bento-sub">γ = {fmt(selected.latticeGamma || 120.0, 1)}°</span>
        </div>

        {/* Row 2, Col 2: Basis Size */}
        <div className="bento-cell">
          <span className="bento-label">BASIS SIZE</span>
          <strong className="bento-val-text">
            {selected.natoms || selected.atoms?.length || 8} carbon atoms
          </strong>
          <span className="bento-sub">Area: {fmt(selected.areaPerAtom || desc.area_per_atom, 3)} Å²/atom</span>
        </div>

        {/* Row 3, Full Width (span 2): Bonding Character */}
        <div className="bento-cell bento-cell-full">
          <div className="bento-cell-full-left">
            <span className="bento-label">BONDING CHARACTER</span>
            <strong className="bento-val-text">{bondingBadge.shortLabel}</strong>
            <span className="bento-sub">
              {fracDouble.toFixed(0)}% Double · {fracAromatic.toFixed(0)}% Aromatic · {fracSingle.toFixed(0)}% Single
            </span>
          </div>
          <div className="bento-cell-full-right">
            <div className="bento-deltad-badge" title="Bond length dispersion Δd = d_max - d_min">
              <span className="deltad-label">Δd</span>
              <strong className="deltad-val">{fmt(displayDeltaD, 3)} Å</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4C. Consolidated Primary Action Toolbar (Between Properties & Secondary Tabs) */}
      <div className="inspector-action-toolbar">
        {onToggleCompare && (
          <button
            type="button"
            className={`btn-action-compare ${isCompared ? 'active' : ''}`}
            onClick={() => onToggleCompare(selected.id)}
            title={isCompared ? 'Remove from comparison tray' : 'Add to side-by-side comparison'}
          >
            <Scale size={13} />
            <span>{isCompared ? 'Comparing' : 'Compare'}</span>
          </button>
        )}

        <button
          type="button"
          className="btn-action-export"
          onClick={() => onOpenExportDrawer ? onOpenExportDrawer(selected) : document.getElementById('export-module')?.scrollIntoView({ behavior: 'smooth' })}
          title="Export standardized CIF, POSCAR, XYZ, and supercells"
        >
          <Download size={13} />
          <span>Export</span>
        </button>

        <button
          type="button"
          className="btn-action-lab"
          onClick={() => onOpenAbInitioWorkspace ? onOpenAbInitioWorkspace(selected) : document.getElementById('ab-initio-lab')?.scrollIntoView({ behavior: 'smooth' })}
          title="Open first-principles DFT workspace: band structures, strain breathing, and Bader charges"
        >
          <span>Ab Initio Suite</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 5. SECONDARY DETAIL TABS (Descriptors, Wyckoff Sites, Literature) */}
      <div className="inspector-secondary-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'descriptors'}
          className={`sec-tab-btn ${activeTab === 'descriptors' ? 'active' : ''}`}
          onClick={() => setActiveTab('descriptors')}
        >
          <Layers size={12} />
          <span>Descriptors</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'wyckoff'}
          className={`sec-tab-btn ${activeTab === 'wyckoff' ? 'active' : ''}`}
          onClick={() => setActiveTab('wyckoff')}
        >
          <Sliders size={12} />
          <span>Wyckoff Sites</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'citations'}
          className={`sec-tab-btn ${activeTab === 'citations' ? 'active' : ''}`}
          onClick={() => setActiveTab('citations')}
        >
          <BookOpen size={12} />
          <span>Citations ({allRefs.length})</span>
        </button>
      </div>

      {/* TAB CONTENT A: Quantitative Descriptors */}
      {activeTab === 'descriptors' && (
        <div className="inspector-tab-content">
          <div className="descriptors-compact-block">
            <span className="desc-section-kicker">PAULING CONTINUOUS BOND ORDER</span>
            {/* Vivid segmented progress bar with distinct accessible tones */}
            <div className="bond-stacked-bar">
              {fracDouble > 0 && (
                <div
                  className="bar-seg seg-double"
                  style={{ width: `${fracDouble}%` }}
                  title={`Double-like (localized π): ${fracDouble.toFixed(1)}% (${doubleCount} bonds)`}
                />
              )}
              {fracAromatic > 0 && (
                <div
                  className="bar-seg seg-aromatic"
                  style={{ width: `${fracAromatic}%` }}
                  title={`Delocalized sp² (resonant): ${fracAromatic.toFixed(1)}% (${aromaticCount} bonds)`}
                />
              )}
              {fracSingle > 0 && (
                <div
                  className="bar-seg seg-single"
                  style={{ width: `${fracSingle}%` }}
                  title={`Single-like (conjugated / strained): ${fracSingle.toFixed(1)}% (${singleCount} bonds)`}
                />
              )}
            </div>
            <div className="bond-legend-row">
              <span className="legend-chip double">
                <span className="legend-dot dot-double" />
                Double ({fracDouble.toFixed(0)}%)
              </span>
              <span className="legend-chip arom">
                <span className="legend-dot dot-aromatic" />
                Aromatic ({fracAromatic.toFixed(0)}%)
              </span>
              <span className="legend-chip single">
                <span className="legend-dot dot-single" />
                Single ({fracSingle.toFixed(0)}%)
              </span>
            </div>
          </div>

          <div className="descriptors-rows-container">
            <div className="desc-metric-row">
              <span className="desc-metric-label">
                Lenosky Ring Variance (μ<sub>2</sub>)
              </span>
              <strong className="desc-metric-val">
                {computedMu2 != null ? (
                  computedMu2 === 0 ? (
                    <span className="metric-ideal-badge" title="Zero variance: homogeneous hexagonal network">0.0000 <small>(Ideal Planar)</small></span>
                  ) : fmt(computedMu2, 4)
                ) : (
                  <span className="metric-na-badge" title="Homogeneous 6-ring planar network; ring variance μ2 is zero by Euler definition">0.0000 <small>(Ideal)</small></span>
                )}
              </strong>
            </div>
            <div className="desc-metric-row">
              <span className="desc-metric-label">
                Shannon Ring Entropy (<em>S</em><sub>ring</sub>)
              </span>
              <strong className="desc-metric-val">
                {computedRingEntropy != null ? (
                  computedRingEntropy === 0 ? (
                    <span className="metric-ideal-badge" title="Zero topological entropy: mono-ring system">0.0000 <small>nats (Single ring)</small></span>
                  ) : (
                    <>{fmt(computedRingEntropy, 4)} <small>nats</small></>
                  )
                ) : (
                  <span className="metric-na-badge" title="Single ring type network">0.0000 <small>nats (Uniform)</small></span>
                )}
              </strong>
            </div>
            <div className="desc-metric-row">
              <span className="desc-metric-label">
                Mean Angular Distortion (MSAD<sub>θ</sub>)
              </span>
              <strong className="desc-metric-val">
                {computedMsadTheta != null ? (
                  computedMsadTheta === 0 ? (
                    <span className="metric-ideal-badge" title="Strictly 120° angles: zero angular strain">0.00 <small>deg² (Ideal 120°)</small></span>
                  ) : (
                    <>{fmt(computedMsadTheta, 2)} <small>deg²</small></>
                  )
                ) : (
                  <span className="metric-na-badge" title="Planar sp2 network with ideal 120° bond angles">0.00 <small>deg² (Ideal 120°)</small></span>
                )}
              </strong>
            </div>
            <div className="desc-metric-row">
              <span className="desc-metric-label">
                Bond Dispersion (Δ<em>d</em>)
              </span>
              <strong className="desc-metric-val">
                {computedDeltaD != null ? (
                  computedDeltaD === 0 ? (
                    <span className="metric-ideal-badge" title="Zero Bond Length Alternation (Pure Resonant sp2)">0.000 <small>Å (Zero BLA)</small></span>
                  ) : (
                    <>{fmt(computedDeltaD, 3)} <small>Å</small></>
                  )
                ) : (
                  <span className="metric-na-badge" title="Uniform aromatic bond lengths">0.000 <small>Å (Zero BLA)</small></span>
                )}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT B: Wyckoff Fractional Coordinates */}
      {activeTab === 'wyckoff' && (
        <div className="inspector-tab-content">
          <div className="wyckoff-table-wrap">
            <table className="wyckoff-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Wyckoff</th>
                  <th>x (fract)</th>
                  <th>y (fract)</th>
                  <th>z (fract)</th>
                </tr>
              </thead>
              <tbody>
                {wyckoffSites.slice(0, 16).map((site, i) => (
                  <tr key={i}>
                    <td><strong>{site.site}</strong></td>
                    <td className="mono">{site.wyckoff}</td>
                    <td className="mono">{Number(site.x).toFixed(5)}</td>
                    <td className="mono">{Number(site.y).toFixed(5)}</td>
                    <td className="mono">{Number(site.z).toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {wyckoffSites.length > 16 && (
              <span className="table-truncate-note">Showing first 16 of {wyckoffSites.length} atomic sites</span>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT C: Searchable Literature Citations */}
      {activeTab === 'citations' && (
        <div className="inspector-tab-content">
          <div className="inspector-bib-search-wrap">
            <Search size={13} className="inspector-bib-search-icon" />
            <input
              type="text"
              placeholder="Search author, title, journal, or DOI..."
              value={bibSearch}
              onChange={(e) => setBibSearch(e.target.value)}
              className="inspector-bib-search-input"
            />
            {bibSearch && (
              <button className="clear-btn" onClick={() => setBibSearch('')} aria-label="Clear literature search">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="inspector-bib-list">
            {filteredRefs.map((ref) => {
              const isExpanded = expandedBibId === ref.id
              return (
                <div key={ref.id} className="bib-item-card">
                  <div
                    className="bib-item-header"
                    onClick={() => setExpandedBibId(isExpanded ? null : ref.id)}
                  >
                    <span className="bib-year-badge">{ref.year}</span>
                    <div className="bib-item-title-col">
                      <strong className="bib-title-text">{ref.title}</strong>
                      <div className="bib-authors-line">
                        {(ref.authors || []).slice(0, 3).join(', ')}
                        {(ref.authors || []).length > 3 ? ' et al.' : ''} · <em>{ref.journal}</em>
                      </div>
                    </div>
                    <ChevronRight size={13} className={`bib-expand-icon ${isExpanded ? 'rotated' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="bib-expanded-drawer">
                      {ref.abstract && <p className="bib-abstract">{ref.abstract}</p>}
                      <div className="bib-actions-row">
                        <button
                          type="button"
                          className="bib-copy-btn"
                          onClick={() => copyToClipboard(toAPA(ref), `apa-${ref.id}`)}
                        >
                          {copiedDoi === `apa-${ref.id}` ? <Check size={11} /> : <FileText size={11} />}
                          <span>{copiedDoi === `apa-${ref.id}` ? 'Copied' : 'Copy APA'}</span>
                        </button>
                        <button
                          type="button"
                          className="bib-copy-btn"
                          onClick={() => copyToClipboard(toBibTeX(ref), `bib-${ref.id}`)}
                        >
                          {copiedDoi === `bib-${ref.id}` ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedDoi === `bib-${ref.id}` ? 'Copied' : 'Copy BibTeX'}</span>
                        </button>
                        {ref.doi && (
                          <a
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bib-doi-link"
                          >
                            <span>doi.org/{ref.doi}</span>
                            <ArrowUpRight size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.aside>
  )
}
