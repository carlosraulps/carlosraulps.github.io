import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Copy, Check, Layers3, FlaskConical, Sliders, Box,
  Info, ExternalLink, ChevronRight, FileCode, Sparkles, Terminal
} from 'lucide-react'
import { MathTex, ScientificFormula, getGiraoNotation, isNamedAllotrope } from './ScientificFormula'
import { generateSupercellExport } from '../utils/supercellGenerator'
import { downloadFile } from '../data/scientificBibliography'

export function SupercellExportDrawer({ isOpen, onClose, allotrope }) {
  const [na, setNa] = useState(1)
  const [nb, setNb] = useState(1)
  const [vacuumLz, setVacuumLz] = useState(20)
  const [activeFormat, setActiveFormat] = useState('cif')
  const [copied, setCopied] = useState(false)

  // Presets
  const setSymmetricPreset = (val) => {
    setNa(val)
    setNb(val)
  }

  // Generate export dynamically
  const exportData = useMemo(() => {
    if (!allotrope) return null
    try {
      return generateSupercellExport(allotrope, activeFormat, {
        na,
        nb,
        vacuumLz
      })
    } catch (err) {
      console.error('Supercell export error:', err)
      return {
        content: `# Error generating export:\n${err.message}`,
        filename: 'export_error.txt',
        mime: 'text/plain',
        atomCount: 0,
        supercellLabel: `${na}x${nb}`
      }
    }
  }, [allotrope, activeFormat, na, nb, vacuumLz])

  if (!isOpen || !allotrope) return null

  const handleCopy = () => {
    if (exportData?.content) {
      navigator.clipboard?.writeText(exportData.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (exportData?.content && exportData?.filename) {
      downloadFile(exportData.filename, exportData.content, exportData.mime)
    }
  }

  const formatTabs = [
    { id: 'cif', label: 'CIF', ext: '.cif', desc: 'Crystallographic Information File' },
    { id: 'poscar', label: 'POSCAR', ext: '.vasp', desc: 'VASP Direct Coordinates' },
    { id: 'in', label: 'QE', ext: '.in', desc: 'Quantum ESPRESSO SCF' },
    { id: 'fdf', label: 'SIESTA', ext: '.fdf', desc: 'SIESTA with Pulay Mixing' },
    { id: 'xyz', label: 'XYZ', ext: '.xyz', desc: 'Extended Cartesian XYZ' },
    { id: 'json', label: 'JSON', ext: '.json', desc: 'Full Atomic & Lattice Schema' }
  ]

  const aBase = allotrope.latticeA || allotrope.lattice?.a_2d || allotrope.lattice?.a || 2.468
  const bBase = allotrope.latticeB || allotrope.lattice?.b_2d || allotrope.lattice?.b || 2.468
  const totalAtoms = (allotrope.natoms || allotrope.atoms?.length || 2) * na * nb

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-[#0d2117]/40 backdrop-blur-sm transition-opacity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Slide-over panel */}
        <motion.div
          className="relative w-full max-w-2xl bg-[#F6F4EC] text-[#113826] shadow-2xl flex flex-col h-full border-l border-[#113826]/20 z-10"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#113826]/15 bg-[#F6F4EC]/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#113826] text-[#E8DCC4] flex items-center justify-center shadow-inner">
                <Layers3 size={19} />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#113826]/70 flex items-center gap-2">
                  <span>CRYSTALLOGRAPHIC SUPERCELL BUILDER</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>DFT EXPORT</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-[#113826] flex items-center gap-2">
                  {isNamedAllotrope(allotrope) ? allotrope.name : `Allotrope ${allotrope.code || allotrope.id}`}
                  <span className="text-xs font-mono px-2 py-0.5 rounded border border-[#113826]/20 bg-[#ECE8DC] font-normal">
                    <ScientificFormula text={allotrope.giraoSymbol || allotrope.symbol || getGiraoNotation(allotrope)} />
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#113826]/10 text-[#113826]/70 hover:text-[#113826] transition-colors"
              aria-label="Close export drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Structure Quick Facts */}
            <div className="grid grid-cols-4 gap-3 p-3.5 rounded-lg border border-[#113826]/15 bg-[#ECE8DC]/50 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-[#113826]/60 block">Symmetry</span>
                <strong className="text-[#113826]">{allotrope.spaceGroup || 'P1'}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#113826]/60 block">Unit Cell</span>
                <strong className="text-[#113826]">{allotrope.natoms || 2} atoms</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#113826]/60 block">Formation ΔE</span>
                <strong className="text-[#113826]">+{Number(allotrope.energy ?? allotrope.delta_e_ev_per_atom ?? 0).toFixed(3)} eV</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#113826]/60 block">Total Atoms</span>
                <strong className="text-emerald-800 font-bold">{totalAtoms} atoms</strong>
              </div>
            </div>

            {/* In-Plane Supercell Steppers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-[#113826] font-semibold flex items-center gap-1.5">
                  <Sliders size={13} /> In-Plane Replication (N<sub>a</sub> × N<sub>b</sub> × 1)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSymmetricPreset(n)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                        na === n && nb === n
                          ? 'bg-[#113826] text-[#F6F4EC] font-bold'
                          : 'bg-[#ECE8DC] text-[#113826]/80 hover:bg-[#113826]/10'
                      }`}
                    >
                      {n}×{n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Na Stepper */}
                <div className="p-3 rounded-lg border border-[#113826]/20 bg-white/70">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-mono text-[#113826]/70">Vector <strong>a</strong> Multiplier (N<sub>a</sub>)</span>
                    <span className="text-xs font-mono font-bold text-[#113826]">{(aBase * na).toFixed(3)} Å</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={na <= 1}
                      onClick={() => setNa((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded border border-[#113826]/20 bg-[#F6F4EC] hover:bg-[#113826]/10 font-bold text-sm disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-base text-[#113826] bg-[#ECE8DC]/40 py-1 rounded">
                      {na}
                    </span>
                    <button
                      type="button"
                      disabled={na >= 8}
                      onClick={() => setNa((prev) => Math.min(8, prev + 1))}
                      className="w-8 h-8 rounded border border-[#113826]/20 bg-[#F6F4EC] hover:bg-[#113826]/10 font-bold text-sm disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Nb Stepper */}
                <div className="p-3 rounded-lg border border-[#113826]/20 bg-white/70">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-mono text-[#113826]/70">Vector <strong>b</strong> Multiplier (N<sub>b</sub>)</span>
                    <span className="text-xs font-mono font-bold text-[#113826]">{(bBase * nb).toFixed(3)} Å</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={nb <= 1}
                      onClick={() => setNb((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded border border-[#113826]/20 bg-[#F6F4EC] hover:bg-[#113826]/10 font-bold text-sm disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-base text-[#113826] bg-[#ECE8DC]/40 py-1 rounded">
                      {nb}
                    </span>
                    <button
                      type="button"
                      disabled={nb >= 8}
                      onClick={() => setNb((prev) => Math.min(8, prev + 1))}
                      className="w-8 h-8 rounded border border-[#113826]/20 bg-[#F6F4EC] hover:bg-[#113826]/10 font-bold text-sm disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Vacuum Thickness Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-[#113826] font-semibold flex items-center gap-1.5">
                  <Box size={13} /> Vacuum Thickness (L<sub>z</sub>) & Monolayer Centering
                </label>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Strictly z = 0.50 Centered
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[15, 20, 25].map((thickness) => (
                  <button
                    key={thickness}
                    type="button"
                    onClick={() => setVacuumLz(thickness)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      vacuumLz === thickness
                        ? 'border-[#113826] bg-[#113826] text-[#F6F4EC] shadow-sm'
                        : 'border-[#113826]/20 bg-white/70 text-[#113826] hover:bg-white'
                    }`}
                  >
                    <div className="text-sm font-mono font-bold">{thickness}.0 Å</div>
                    <div className={`text-[11px] ${vacuumLz === thickness ? 'text-[#E8DCC4]' : 'text-[#113826]/60'}`}>
                      {thickness === 15 ? 'Compact Slab' : thickness === 20 ? 'Standard DFT (Default)' : 'Ultra-Isolated Tail'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#113826] font-semibold flex items-center gap-1.5">
                <FileCode size={13} /> Target Simulation Package
              </label>
              <div className="grid grid-cols-3 gap-2">
                {formatTabs.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setActiveFormat(fmt.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      activeFormat === fmt.id
                        ? 'border-[#113826] bg-[#113826] text-[#F6F4EC] shadow-sm'
                        : 'border-[#113826]/20 bg-white/70 text-[#113826] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">{fmt.label}</span>
                      <span className={`text-[10px] font-mono ${activeFormat === fmt.id ? 'text-[#E8DCC4]' : 'text-[#113826]/50'}`}>
                        {fmt.ext}
                      </span>
                    </div>
                    <div className={`text-[10px] truncate ${activeFormat === fmt.id ? 'text-[#E8DCC4]/90' : 'text-[#113826]/60'}`}>
                      {fmt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Code Output Viewer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#113826]/70">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} /> {exportData?.filename}
                </span>
                <span>{exportData?.content.split('\n').length || 0} lines</span>
              </div>
              <div className="relative rounded-lg border border-[#113826]/25 bg-[#1F2923] text-[#E8DCC4] p-3.5 font-mono text-xs overflow-x-auto max-h-56 shadow-inner">
                <pre className="whitespace-pre">{exportData?.content}</pre>
              </div>
            </div>

            {/* Provenance and Citation Note */}
            <div className="p-3 rounded-lg border border-[#113826]/15 bg-[#ECE8DC]/30 text-xs text-[#113826]/80 flex items-start gap-2">
              <Info size={15} className="mt-0.5 text-[#113826]/60 flex-shrink-0" />
              <span>
                Space group is strictly set to <strong>P 1</strong> upon periodic replication (N<sub>a</sub> &gt; 1 or N<sub>b</sub> &gt; 1) to prevent crystallographic viewers (VESTA, Mercury) from applying duplicate fractional orbit symmetry operations.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 px-6 border-t border-[#113826]/15 bg-[#ECE8DC]/80 backdrop-blur-md flex items-center justify-between sticky bottom-0 z-20">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#113826]/25 bg-white text-[#113826] font-mono text-xs font-semibold hover:bg-[#F6F4EC] transition-colors shadow-sm"
            >
              {copied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#113826] text-[#F6F4EC] font-mono text-xs font-semibold hover:bg-[#0c291b] transition-colors shadow-md"
            >
              <Download size={14} />
              <span>Download {exportData?.filename}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
