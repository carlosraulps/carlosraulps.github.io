import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Download, Sparkles, Scale, Layers, ChevronRight, Check } from 'lucide-react'
import { MathTex, ScientificFormula, getGiraoNotation, isNamedAllotrope } from './ScientificFormula'

export function StructureComparisonModal({
  isOpen,
  onClose,
  compareItems,
  onRemoveItem,
  onSelectStructure,
  onOpenExportDrawer,
  MiniStructure
}) {
  if (!isOpen || !compareItems || compareItems.length === 0) return null

  const referenceItem = compareItems[0]

  return (
    <AnimatePresence>
      <div className="compare-modal-backdrop" onClick={onClose}>
        <motion.div
          className="compare-modal-card"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="compare-modal-header">
            <div className="compare-modal-header-left">
              <span className="compare-eyebrow">
                <Scale size={13} />
                <span>SCIENTIFIC COMPARISON WORKBENCH</span>
              </span>
              <h3>Side-by-Side Crystallographic & Energetic Analysis</h3>
              <p className="compare-modal-subtitle">
                Comparing <strong>{compareItems.length} allotropes</strong> against reference baseline{' '}
                <strong>{referenceItem.literatureName || referenceItem.name}</strong>.
              </p>
            </div>
            <button className="compare-close-btn" onClick={onClose} aria-label="Close comparison">
              <X size={16} />
            </button>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <div className="compare-matrix-container">
            <table className="compare-matrix-table">
              <thead>
                <tr>
                  <th className="compare-metric-col">Property / Dimension</th>
                  {compareItems.map((item, idx) => (
                    <th key={item.id} className="compare-allotrope-col">
                      <div className="compare-col-header">
                        <div className="compare-col-sketch">
                          {MiniStructure && <MiniStructure item={item} />}
                        </div>
                        <div className="compare-col-info">
                          <span className="compare-col-rank">#{idx + 1} {idx === 0 ? '(Reference)' : ''}</span>
                          <strong className="compare-col-name">
                            {isNamedAllotrope(item) ? (
                              item.literatureName || item.name
                            ) : (
                              <ScientificFormula text={item.giraoSymbol || item.symbol || getGiraoNotation(item)} />
                            )}
                          </strong>
                          <span className="compare-col-girao">
                            <ScientificFormula text={item.giraoSymbol || item.symbol || getGiraoNotation(item)} />
                          </span>
                        </div>
                        <button
                          className="compare-col-remove"
                          onClick={() => onRemoveItem(item.id)}
                          title={`Remove ${item.name} from comparison`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 1. Relative Formation Energy (ΔE) */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Relative Energy (<MathTex math="\Delta E" />)</strong>
                    <small>DFT-PBE-D3 (eV / atom vs Graphene)</small>
                  </td>
                  {compareItems.map((item, idx) => {
                    const diff = item.energy - referenceItem.energy
                    return (
                      <td key={item.id} className="compare-data-cell">
                        <span className="compare-energy-val">
                          {Number(item.energy).toFixed(3)} <small>eV/atom</small>
                        </span>
                        {idx > 0 && (
                          <span className={`compare-diff-tag ${diff > 0 ? 'higher' : diff < 0 ? 'lower' : 'equal'}`}>
                            {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)} eV/atom
                          </span>
                        )}
                        {item.energy < 0.456 && (
                          <span className="biphenylene-feasible-badge" title="Below 0.456 eV biphenylene reference frontier">
                            Sub-Biphenylene
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* 2. Polygon Ring Composition */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Ring Topology</strong>
                    <small>Polygon distribution and count</small>
                  </td>
                  {compareItems.map((item) => {
                    const rings = Object.entries(item.rings || {})
                    return (
                      <td key={item.id} className="compare-data-cell">
                        <div className="compare-rings-list">
                          {rings.length > 0 ? (
                            rings.map(([n, count]) => (
                              <span key={n} className="compare-ring-badge">
                                <strong>{n}-gon</strong> <small>({count})</small>
                              </span>
                            ))
                          ) : (
                            <span>{item.polygonTypes?.map(p => `${p}-gon`).join(', ') || '–'}</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>

                {/* 3. 2D Symmetry & Space Group */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Crystallographic Symmetry</strong>
                    <small>2D System, Space Group, Wallpaper</small>
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="compare-data-cell">
                      <div className="compare-sym-block">
                        <strong>{item.system || item.crystal_system || '2D Monolayer'}</strong>
                        <span className="mono-code">{item.spaceGroup || item.space_group_symbol || 'P1'}</span>
                        {item.wallpaperGroup && (
                          <span className="mono-sub">Plane: {item.wallpaperGroup}</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 4. Lattice Parameters */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Lattice Constants</strong>
                    <small>In-plane axes a, b (Å) and γ angle</small>
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="compare-data-cell">
                      <div className="compare-lattice-params">
                        <span>a = {Number(item.latticeA || item.lattice_a || 2.468).toFixed(3)} Å</span>
                        <span>b = {Number(item.latticeB || item.lattice_b || 2.468).toFixed(3)} Å</span>
                        <span>γ = {Number(item.latticeGamma || 120.0).toFixed(1)}°</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 5. Unit Cell Basis Atoms */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Basis Size (N_atoms)</strong>
                    <small>Carbon atoms in crystallographic cell</small>
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="compare-data-cell">
                      <span className="compare-num-large">
                        {item.natoms || item.atoms?.length || (item.geometry?.fractional_coords?.length) || '–'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 6. Curvature & Invariants */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Curvature Invariants</strong>
                    <small>Lenosky μ₂ & Ring Entropy S_ring</small>
                  </td>
                  {compareItems.map((item) => {
                    const d = item.descriptors || {}
                    return (
                      <td key={item.id} className="compare-data-cell">
                        <div className="compare-desc-col">
                          <span>μ₂ = <strong>{Number(d.ring_variance_mu2 ?? item.mu2 ?? 0).toFixed(3)}</strong></span>
                          <span>S_ring = <strong>{Number(d.ring_entropy_shannon ?? item.shannon_entropy ?? 0).toFixed(3)}</strong> nats</span>
                        </div>
                      </td>
                    )
                  })}
                </tr>

                {/* 7. Action Row */}
                <tr>
                  <td className="compare-metric-col">
                    <strong>Workbench Actions</strong>
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="compare-data-cell">
                      <div className="compare-action-btns">
                        <button
                          className="compare-btn-inspect"
                          onClick={() => {
                            onSelectStructure(item.id)
                            onClose()
                          }}
                        >
                          Inspect in 3D <ArrowRight size={12} />
                        </button>
                        <button
                          className="compare-btn-export"
                          onClick={() => {
                            onSelectStructure(item.id)
                            onOpenExportDrawer && onOpenExportDrawer(item)
                          }}
                        >
                          <Download size={12} /> Export
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="compare-modal-footer">
            <span className="compare-footer-note">
              Calculations performed under standardized VASP DFT-PBE-D3 parameters with strictly z-normal coordinate alignment.
            </span>
            <button className="compare-footer-close-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
