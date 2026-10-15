import React, { useState, useMemo } from 'react'
import bandData from '../data/pbe_hse06_bands.json'
import { MathTex } from './ScientificFormula'

export default function NativeBandsPbeHse({ onExportPng }) {
  const [viewMode, setViewMode] = useState('dual') // 'dual' | 'overlay' | 'dirac_zoom'
  const [hoveredK, setHoveredK] = useState(null)

  const kDistsPbe = bandData.pbe.k_distances || bandData.k_distances_pbe || bandData.k_distances
  const kDistsHse = bandData.hse06.k_distances || bandData.k_distances_hse || bandData.k_distances
  const kMax = bandData.k_max
  const kPoints = bandData.k_points

  // Geometry coordinate transforms
  const toDualPanelX = (k, panel) => {
    const startX = panel === 'pbe' ? 65 : 485
    const width = 360
    return startX + (k / kMax) * width
  }

  const toOverlayX = (k) => {
    const startX = 85
    const width = 735
    return startX + (k / kMax) * width
  }

  const toZoomX = (k) => {
    const kStart = 1.05
    const kEnd = 1.85
    const startX = 90
    const width = 720
    return startX + ((k - kStart) / (kEnd - kStart)) * width
  }

  const toY = (e, eMin = -3.0, eMax = 3.0) => {
    const topY = 55
    const bottomY = 430
    const height = bottomY - topY
    return bottomY - ((e - eMin) / (eMax - eMin)) * height
  }

  // Pre-generate SVG path strings using exact k_distances for each functional
  const pbeDualPaths = useMemo(() => {
    return bandData.pbe.bands.map((b) => {
      const pts = b.energies.map((e, idx) => {
        const k = kDistsPbe[idx] ?? 0
        const x = toDualPanelX(k, 'pbe')
        const y = toY(e)
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return { path: pts, isFrontier: b.is_frontier }
    })
  }, [kDistsPbe])

  const hseDualPaths = useMemo(() => {
    return bandData.hse06.bands.map((b) => {
      const pts = b.energies.map((e, idx) => {
        const k = kDistsHse[idx] ?? 0
        const x = toDualPanelX(k, 'hse')
        const y = toY(e)
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return { path: pts, isFrontier: b.is_frontier }
    })
  }, [kDistsHse])

  const overlayPaths = useMemo(() => {
    const pbe = bandData.pbe.bands.map((b) => {
      const pts = b.energies.map((e, idx) => {
        const k = kDistsPbe[idx] ?? 0
        const x = toOverlayX(k)
        const y = toY(e)
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return { path: pts, isFrontier: b.is_frontier }
    })
    const hse = bandData.hse06.bands.map((b) => {
      const pts = b.energies.map((e, idx) => {
        const k = kDistsHse[idx] ?? 0
        const x = toOverlayX(k)
        const y = toY(e)
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return { path: pts, isFrontier: b.is_frontier }
    })
    return { pbe, hse }
  }, [kDistsPbe, kDistsHse])

  const zoomPaths = useMemo(() => {
    const pbe = bandData.pbe.bands.filter(b => b.is_frontier).map((b) => {
      const pts = b.energies.map((e, idx) => {
        const k = kDistsPbe[idx] ?? 0
        const x = toZoomX(k)
        const y = toY(e, -0.4, 0.4)
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return { path: pts }
    })
    const hse = bandData.hse06.bands.filter(b => b.is_frontier).map((b) => {
      const pts = b.energies.map((e, idx) => {
        const k = kDistsHse[idx] ?? 0
        const x = toZoomX(k)
        const y = toY(e, -0.4, 0.4)
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return { path: pts }
    })
    return { pbe, hse }
  }, [kDistsPbe, kDistsHse])

  // Nearest k hover detection
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgWidth = rect.width
    const normX = mouseX / svgWidth

    if (viewMode === 'dual') {
      let kVal = null
      if (normX >= 65 / 880 && normX <= 425 / 880) {
        const frac = (normX * 880 - 65) / 360
        kVal = frac * kMax
      } else if (normX >= 485 / 880 && normX <= 845 / 880) {
        const frac = (normX * 880 - 485) / 360
        kVal = frac * kMax
      }
      if (kVal !== null) {
        let bestIdx = 0
        let bestDiff = 999
        kDistsPbe.forEach((k, idx) => {
          const diff = Math.abs(k - kVal)
          if (diff < bestDiff) {
            bestDiff = diff
            bestIdx = idx
          }
        })
        setHoveredK(bestIdx)
      } else {
        setHoveredK(null)
      }
    } else if (viewMode === 'overlay') {
      const frac = (normX * 880 - 85) / 735
      if (frac >= 0 && frac <= 1) {
        const kVal = frac * kMax
        let bestIdx = 0
        let bestDiff = 999
        kDistsPbe.forEach((k, idx) => {
          const diff = Math.abs(k - kVal)
          if (diff < bestDiff) {
            bestDiff = diff
            bestIdx = idx
          }
        })
        setHoveredK(bestIdx)
      } else {
        setHoveredK(null)
      }
    } else {
      // dirac_zoom
      const frac = (normX * 880 - 90) / 720
      if (frac >= 0 && frac <= 1) {
        const kVal = 1.05 + frac * (1.85 - 1.05)
        let bestIdx = 0
        let bestDiff = 999
        kDistsPbe.forEach((k, idx) => {
          const diff = Math.abs(k - kVal)
          if (diff < bestDiff) {
            bestDiff = diff
            bestIdx = idx
          }
        })
        setHoveredK(bestIdx)
      } else {
        setHoveredK(null)
      }
    }
  }

  const activeKData = useMemo(() => {
    if (hoveredK === null) return null
    const k = kDistsPbe[hoveredK]
    const pbeVals = bandData.pbe.bands.filter(b => b.is_frontier).map(b => b.energies[hoveredK] ?? 0)
    
    // Find matching k in HSE06
    let hseIdx = 0
    let bestHseDiff = 999
    kDistsHse.forEach((kHse, idx) => {
      const diff = Math.abs(kHse - k)
      if (diff < bestHseDiff) {
        bestHseDiff = diff
        hseIdx = idx
      }
    })
    const hseVals = bandData.hse06.bands.filter(b => b.is_frontier).map(b => b.energies[hseIdx] ?? 0)

    return {
      k,
      pbeVbm: Math.min(...pbeVals),
      pbeCbm: Math.max(...pbeVals),
      hseVbm: Math.min(...hseVals),
      hseCbm: Math.max(...hseVals),
    }
  }, [hoveredK, kDistsPbe, kDistsHse])

  return (
    <div className="native-bands-container">
      {/* Top Controls Strip */}
      <div className="native-bands-toolbar">
        <div className="view-mode-tabs">
          <button
            className={`tab-btn ${viewMode === 'dual' ? 'active' : ''}`}
            onClick={() => setViewMode('dual')}
          >
            Dual-Panel (PBE vs. HSE06)
          </button>
          <button
            className={`tab-btn ${viewMode === 'overlay' ? 'active' : ''}`}
            onClick={() => setViewMode('overlay')}
          >
            Direct Superposition
          </button>
          <button
            className={`tab-btn ${viewMode === 'dirac_zoom' ? 'active' : ''}`}
            onClick={() => setViewMode('dirac_zoom')}
          >
            Dirac Node Inset Zoom (S → Y)
          </button>
        </div>

        <div className="active-k-hud">
          {activeKData ? (
            <div className="hud-pills">
              <span className="hud-pill k">
                k = {activeKData.k.toFixed(3)} Å⁻¹
              </span>
              <span className="hud-pill pbe">
                PBE Gap: {Math.max(0, activeKData.pbeCbm - activeKData.pbeVbm).toFixed(3)} eV
              </span>
              <span className="hud-pill hse">
                HSE06 Gap: {Math.max(0, activeKData.hseCbm - activeKData.hseVbm).toFixed(3)} eV
              </span>
            </div>
          ) : (
            <span className="hud-hint">Hover along k-path for real-time dispersion telemetry</span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="native-bands-svg-wrap" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredK(null)}>
        <svg viewBox="0 0 880 525" className="native-bands-svg" aria-label="Electronic Band Structure: GGA-PBE vs Screened Hybrid HSE06">
          <defs>
            <linearGradient id="pbeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="hseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.4" />
            </linearGradient>
            <clipPath id="pbeDualClip">
              <rect x="65" y="55" width="360" height="375" />
            </clipPath>
            <clipPath id="hseDualClip">
              <rect x="485" y="55" width="360" height="375" />
            </clipPath>
            <clipPath id="overlayClip">
              <rect x="85" y="55" width="735" height="375" />
            </clipPath>
            <clipPath id="zoomClip">
              <rect x="90" y="55" width="720" height="375" />
            </clipPath>
          </defs>

          {/* Clean White Background */}
          <rect x="0" y="0" width="880" height="525" fill="#ffffff" rx="8" />

          {/* ============================================================= */}
          {/* VIEW MODE 1: DUAL PANEL (SIDE BY SIDE)                        */}
          {/* ============================================================= */}
          {viewMode === 'dual' && (
            <>
              {/* --- PANEL A: GGA-PBE --- */}
              <g className="panel-pbe">
                {/* Background Box & Grid */}
                <rect x="65" y="55" width="360" height="375" fill="#fafaf8" stroke="#cbd5e1" strokeWidth="1.2" />

                {/* Energy Ticks [-3, -2, -1, 0, 1, 2, 3] */}
                {[-3, -2, -1, 0, 1, 2, 3].map((ev) => {
                  const y = toY(ev)
                  const isFermi = ev === 0
                  return (
                    <g key={`pbe-ev-${ev}`}>
                      <line
                        x1="65"
                        y1={y}
                        x2="425"
                        y2={y}
                        stroke={isFermi ? '#11362d' : '#e2e8f0'}
                        strokeWidth={isFermi ? 1.4 : 0.8}
                        strokeDasharray={isFermi ? '4 3' : 'none'}
                      />
                      <text x="56" y={y + 4} fill="#334155" fontSize="11" fontFamily="DM Mono" textAnchor="end">
                        {ev > 0 ? `+${ev}.0` : `${ev}.0`}
                      </text>
                    </g>
                  )
                })}
                <text x="20" y="242" fill="#1e293b" fontSize="13" fontFamily="Times New Roman" fontStyle="italic" transform="rotate(-90 20 242)" textAnchor="middle">
                  E − E_F (eV)
                </text>

                {/* High Symmetry Lines */}
                {kPoints.map((kp, idx) => {
                  const x = toDualPanelX(kp.dist, 'pbe')
                  return (
                    <g key={`pbe-kp-${idx}`}>
                      <line x1={x} y1="55" x2={x} y2="430" stroke="#94a3b8" strokeWidth="0.9" strokeDasharray="3 3" />
                      <text x={x} y="450" fill="#0f172a" fontSize="14" fontFamily="Times New Roman" fontWeight="bold" textAnchor="middle">
                        {kp.label}
                      </text>
                    </g>
                  )
                })}

                {/* Title & Badge */}
                <text x="65" y="38" fill="#0f172a" fontSize="14.5" fontFamily="Times New Roman" fontWeight="bold">
                  (a) GGA-PBE Ground State
                </text>
                <g transform="translate(315, 20)">
                  <rect x="0" y="0" width="110" height="24" rx="4" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
                  <text x="55" y="16" fill="#0369a1" fontSize="11" fontFamily="DM Mono" fontWeight="bold" textAnchor="middle">
                    E_g = 0.00 eV
                  </text>
                </g>

                {/* PBE Bands */}
                <g clipPath="url(#pbeDualClip)">
                  {pbeDualPaths.map((item, idx) => (
                    <path
                      key={`pbe-b-${idx}`}
                      d={item.path}
                      fill="none"
                      stroke={item.isFrontier ? '#0284c7' : '#94a3b8'}
                      strokeWidth={item.isFrontier ? 2.4 : 1.1}
                      strokeOpacity={item.isFrontier ? 1.0 : 0.65}
                    />
                  ))}
                </g>

                {/* Discrete Dirac Node Marker Point (No Colliding Text) */}
                <g className="dirac-point-marker">
                  <circle cx="256.9" cy="242.5" r="9" fill="rgba(2, 132, 199, 0.2)" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 2" />
                  <circle cx="256.9" cy="242.5" r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                </g>
              </g>

              {/* --- PANEL B: HSE06 HYBRID ARBITRATION --- */}
              <g className="panel-hse">
                {/* Background Box & Grid */}
                <rect x="485" y="55" width="360" height="375" fill="#fafaf8" stroke="#cbd5e1" strokeWidth="1.2" />

                {/* Energy Ticks */}
                {[-3, -2, -1, 0, 1, 2, 3].map((ev) => {
                  const y = toY(ev)
                  const isFermi = ev === 0
                  return (
                    <line
                      key={`hse-ev-${ev}`}
                      x1="485"
                      y1={y}
                      x2="845"
                      y2={y}
                      stroke={isFermi ? '#11362d' : '#e2e8f0'}
                      strokeWidth={isFermi ? 1.4 : 0.8}
                      strokeDasharray={isFermi ? '4 3' : 'none'}
                    />
                  )
                })}

                {/* High Symmetry Lines */}
                {kPoints.map((kp, idx) => {
                  const x = toDualPanelX(kp.dist, 'hse')
                  return (
                    <g key={`hse-kp-${idx}`}>
                      <line x1={x} y1="55" x2={x} y2="430" stroke="#94a3b8" strokeWidth="0.9" strokeDasharray="3 3" />
                      <text x={x} y="450" fill="#0f172a" fontSize="14" fontFamily="Times New Roman" fontWeight="bold" textAnchor="middle">
                        {kp.label}
                      </text>
                    </g>
                  )
                })}

                {/* Title & Badge */}
                <text x="485" y="38" fill="#0f172a" fontSize="14.5" fontFamily="Times New Roman" fontWeight="bold">
                  (b) Screened Hybrid HSE06 Arbitration
                </text>
                <g transform="translate(725, 20)">
                  <rect x="0" y="0" width="120" height="24" rx="4" fill="#fee2e2" stroke="#f87171" strokeWidth="1" />
                  <text x="60" y="16" fill="#b91c1c" fontSize="11" fontFamily="DM Mono" fontWeight="bold" textAnchor="middle">
                    E_g = 0.042 eV
                  </text>
                </g>

                {/* HSE06 Bands */}
                <g clipPath="url(#hseDualClip)">
                  {hseDualPaths.map((item, idx) => (
                    <path
                      key={`hse-b-${idx}`}
                      d={item.path}
                      fill="none"
                      stroke={item.isFrontier ? '#dc2626' : '#94a3b8'}
                      strokeWidth={item.isFrontier ? 2.4 : 1.1}
                      strokeOpacity={item.isFrontier ? 1.0 : 0.65}
                    />
                  ))}
                </g>

                {/* Discrete HSE06 Exact Exchange Opening Markers (No Colliding Text) */}
                <g className="hse-gap-markers">
                  <line x1="676.9" y1="237" x2="676.9" y2="248" stroke="#dc2626" strokeWidth="1.6" />
                  <circle cx="676.9" cy="240.5" r="4.2" fill="#dc2626" stroke="#ffffff" strokeWidth="1.8" />
                  <circle cx="676.9" cy="244.5" r="4.2" fill="#dc2626" stroke="#ffffff" strokeWidth="1.8" />
                </g>
              </g>

              {/* Scientific Legend Strip for Dual Panels (Non-Colliding) */}
              <g transform="translate(100, 484)">
                <circle cx="0" cy="0" r="4.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                <text x="10" y="3.5" fill="#0f172a" fontSize="10.5" fontFamily="DM Mono" fontWeight="600">
                  Dirac Node (E = E_F = 0.00 eV)
                </text>

                <line x1="220" y1="0" x2="236" y2="0" stroke="#dc2626" strokeWidth="1.8" />
                <circle cx="228" cy="0" r="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                <text x="246" y="3.5" fill="#0f172a" fontSize="10.5" fontFamily="DM Mono" fontWeight="600">
                  HSE06 Gap (ΔE_g = 42 meV)
                </text>

                <line x1="450" y1="0" x2="470" y2="0" stroke="#0284c7" strokeWidth="2.4" />
                <text x="478" y="3.5" fill="#475569" fontSize="10.5" fontFamily="DM Mono">
                  C(2p_z) Fat Band
                </text>

                <line x1="590" y1="0" x2="610" y2="0" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="618" y="3.5" fill="#64748b" fontSize="10.5" fontFamily="DM Mono">
                  Semicore
                </text>
              </g>

              {/* Cursor indicator line across both panels if hovered */}
              {hoveredK !== null && (
                <>
                  <line
                    x1={toDualPanelX(kDists[hoveredK], 'pbe')}
                    y1="55"
                    x2={toDualPanelX(kDists[hoveredK], 'pbe')}
                    y2="430"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={toDualPanelX(kDists[hoveredK], 'hse')}
                    y1="55"
                    x2={toDualPanelX(kDists[hoveredK], 'hse')}
                    y2="430"
                    stroke="#dc2626"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                </>
              )}
            </>
          )}

          {/* ============================================================= */}
          {/* VIEW MODE 2: DIRECT SUPERPOSITION / OVERLAY                   */}
          {/* ============================================================= */}
          {viewMode === 'overlay' && (
            <g className="panel-overlay">
              <rect x="85" y="55" width="735" height="375" fill="#fafaf8" stroke="#cbd5e1" strokeWidth="1.2" />

              {/* Energy Ticks */}
              {[-3, -2, -1, 0, 1, 2, 3].map((ev) => {
                const y = toY(ev)
                const isFermi = ev === 0
                return (
                  <g key={`ov-ev-${ev}`}>
                    <line
                      x1="85"
                      y1={y}
                      x2="820"
                      y2={y}
                      stroke={isFermi ? '#11362d' : '#e2e8f0'}
                      strokeWidth={isFermi ? 1.4 : 0.8}
                      strokeDasharray={isFermi ? '4 3' : 'none'}
                    />
                    <text x="76" y={y + 3.5} fill="#475569" fontSize="10" fontFamily="DM Mono" textAnchor="end">
                      {ev > 0 ? `+${ev}.0` : `${ev}.0`}
                    </text>
                  </g>
                )
              })}
              <text x="32" y="242" fill="#1e293b" fontSize="11" fontFamily="Times New Roman" fontStyle="italic" transform="rotate(-90 32 242)" textAnchor="middle">
                E − E_F (eV)
              </text>

              {/* High Symmetry Dividers */}
              {kPoints.map((kp, idx) => {
                const x = toOverlayX(kp.dist)
                return (
                  <g key={`ov-kp-${idx}`}>
                    <line x1={x} y1="55" x2={x} y2="430" stroke="#94a3b8" strokeWidth="0.9" strokeDasharray="3 3" />
                    <text x={x} y="448" fill="#0f172a" fontSize="12" fontFamily="Times New Roman" fontWeight="bold" textAnchor="middle">
                      {kp.label}
                    </text>
                  </g>
                )
              })}

              {/* Title & Legend */}
              <text x="85" y="38" fill="#0f172a" fontSize="13" fontFamily="Times New Roman" fontWeight="bold">
                Direct Functional Superposition: GGA-PBE (Blue) vs. HSE06 (Crimson)
              </text>

              {/* PBE & HSE06 Superposition Bands */}
              <g clipPath="url(#overlayClip)">
                {overlayPaths.pbe.map((item, idx) => (
                  <path
                    key={`ov-pbe-${idx}`}
                    d={item.path}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={item.isFrontier ? 2.2 : 1.1}
                    strokeOpacity={0.85}
                  />
                ))}

                {/* HSE06 Bands */}
                {overlayPaths.hse.map((item, idx) => (
                  <path
                    key={`ov-hse-${idx}`}
                    d={item.path}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={item.isFrontier ? 2.2 : 1.1}
                    strokeDasharray={item.isFrontier ? 'none' : '3 2'}
                    strokeOpacity={0.85}
                  />
                ))}
              </g>

              {/* Cursor indicator line */}
              {hoveredK !== null && (
                <line
                  x1={toOverlayX(kDistsPbe[hoveredK])}
                  y1="55"
                  x2={toOverlayX(kDistsPbe[hoveredK])}
                  y2="430"
                  stroke="#11362d"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}
            </g>
          )}

          {/* ============================================================= */}
          {/* VIEW MODE 3: DIRAC NODE INSET ZOOM                            */}
          {/* ============================================================= */}
          {viewMode === 'dirac_zoom' && (
            <g className="panel-zoom">
              <rect x="90" y="55" width="720" height="375" fill="#fafaf8" stroke="#cbd5e1" strokeWidth="1.2" />

              {/* Energy Ticks in [-0.4, +0.4] eV */}
              {[-0.4, -0.2, 0.0, 0.2, 0.4].map((ev) => {
                const y = toY(ev, -0.4, 0.4)
                const isFermi = Math.abs(ev) < 0.001
                return (
                  <g key={`zm-ev-${ev}`}>
                    <line
                      x1="90"
                      y1={y}
                      x2="810"
                      y2={y}
                      stroke={isFermi ? '#11362d' : '#e2e8f0'}
                      strokeWidth={isFermi ? 1.4 : 0.8}
                      strokeDasharray={isFermi ? '4 3' : 'none'}
                    />
                    <text x="80" y={y + 3.5} fill="#475569" fontSize="10" fontFamily="DM Mono" textAnchor="end">
                      {ev > 0 ? `+${ev.toFixed(1)}` : ev.toFixed(1)}
                    </text>
                  </g>
                )
              })}
              <text x="36" y="242" fill="#1e293b" fontSize="11" fontFamily="Times New Roman" fontStyle="italic" transform="rotate(-90 36 242)" textAnchor="middle">
                E − E_F (eV)
              </text>

              {/* High Symmetry Divider for S (1.229) and Y (1.669) */}
              {[
                { label: 'S (π/a, π/b)', dist: 1.228596 },
                { label: 'Y (0, π/b)', dist: 1.668559 },
              ].map((kp, idx) => {
                const x = toZoomX(kp.dist)
                return (
                  <g key={`zm-kp-${idx}`}>
                    <line x1={x} y1="55" x2={x} y2="430" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" />
                    <text x={x} y="448" fill="#0f172a" fontSize="12" fontFamily="Times New Roman" fontWeight="bold" textAnchor="middle">
                      {kp.label}
                    </text>
                  </g>
                )
              })}

              {/* Title & Zoom Info */}
              <text x="90" y="38" fill="#0f172a" fontSize="13" fontFamily="Times New Roman" fontWeight="bold">
                High-Resolution Dirac Node Inset: Semi-metallic Touching (PBE) vs. 42 meV Direct Gap (HSE06)
              </text>

              {/* Zoom Paths with Clean Box Clip */}
              <g clipPath="url(#zoomClip)">
                {/* PBE Zoom Paths */}
                {zoomPaths.pbe.map((item, idx) => (
                  <path
                    key={`zm-pbe-${idx}`}
                    d={item.path}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={2.8}
                  />
                ))}

                {/* HSE Zoom Paths */}
                {zoomPaths.hse.map((item, idx) => (
                  <path
                    key={`zm-hse-${idx}`}
                    d={item.path}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={2.8}
                  />
                ))}
              </g>

              {/* Gap Dimension Callout */}
              <g transform="translate(560, 220)">
                <rect x="-8" y="-14" width="190" height="28" rx="4" fill="#ffffff" stroke="#11362d" strokeWidth="1.2" />
                <text x="87" y="4" fill="#11362d" fontSize="10" fontFamily="DM Mono" fontWeight="bold" textAnchor="middle">
                  ΔE_g(HSE06) = 0.042 eV (42 meV)
                </text>
              </g>

              {/* Cursor indicator line */}
              {hoveredK !== null && (
                <line
                  x1={toZoomX(kDistsPbe[hoveredK])}
                  y1="55"
                  x2={toZoomX(kDistsPbe[hoveredK])}
                  y2="430"
                  stroke="#11362d"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}
            </g>
          )}

          {/* Footer High-Symmetry Path Sequence */}
          <text x="440" y="512" fill="#64748b" fontSize="11" fontFamily="DM Mono" fontWeight="600" textAnchor="middle">
            Brillouin Zone Path: Γ(0,0) → X(π/a, 0) → S(π/a, π/b) → Y(0, π/b) → Γ(0,0)
          </text>
        </svg>
      </div>
    </div>
  )
}
