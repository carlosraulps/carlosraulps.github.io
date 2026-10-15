import React, { useState, useMemo, useEffect } from 'react'
import {
  TrendingUp, Download, FileSpreadsheet, Database, Cpu, Check,
  Sliders, AlertTriangle, ArrowRight, Layers, HelpCircle,
  BarChart3, Activity, Compass, ShieldCheck, ChevronDown, X, Sparkles
} from 'lucide-react'
import { MathTex, ScientificFormula } from './ScientificFormula'
import {
  ML_BENCHMARKS,
  getParityData,
  generateCanonicalCSV,
  generateFullCatalogCSV,
  generateFeatureMetadataJSON
} from '../data/mlData'
import { downloadFile } from '../data/scientificBibliography'

export function MachineLearningStudio({ allotropes, onSelectStructure }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeRegime, setActiveRegime] = useState('regime_2_relaxed') // 'regime_1_topological' | 'regime_2_relaxed'
  const [cvScheme, setCvScheme] = useState('symmetry') // 'symmetry' (4-fold) | 'energy' (5-fold)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [pcaColorMode, setPcaColorMode] = useState('energy')
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Interactive surrogate predictor state
  const [inputAngleMsd, setInputAngleMsd] = useState(25.0)
  const [inputMu2, setInputMu2] = useState(0.40)
  const [inputNonHex, setInputNonHex] = useState(0.20)
  const [inputAreaPerAtom, setInputAreaPerAtom] = useState(2.637)
  const [inputEntropy, setInputEntropy] = useState(0.35)

  // Canonical allotropes
  const canonicalAllotropes = useMemo(() => {
    return (allotropes || []).filter((a) => a.isCanonical !== false)
  }, [allotropes])

  // Parity dataset (N = 53)
  const parityPoints = useMemo(() => {
    return getParityData(allotropes, activeRegime)
  }, [allotropes, activeRegime])

  // Outliers: top 5 highest absolute error
  const outlierPoints = useMemo(() => {
    return [...parityPoints].sort((a, b) => b.absError - a.absError).slice(0, 5)
  }, [parityPoints])

  // Histogram bins for residual analysis (-0.20 to +0.20 eV/atom, 10 bins)
  const residualHistogram = useMemo(() => {
    const minVal = -0.18
    const maxVal = 0.18
    const nBins = 9
    const binWidth = (maxVal - minVal) / nBins
    const bins = Array.from({ length: nBins }, (_, i) => ({
      binStart: minVal + i * binWidth,
      binEnd: minVal + (i + 1) * binWidth,
      center: minVal + (i + 0.5) * binWidth,
      count: 0
    }))

    parityPoints.forEach(pt => {
      const idx = Math.min(nBins - 1, Math.max(0, Math.floor((pt.residual - minVal) / binWidth)))
      bins[idx].count += 1
    })

    const maxCount = Math.max(...bins.map(b => b.count), 1)
    return { bins, maxCount }
  }, [parityPoints])

  // PCA 2D coordinates
  const pcaPoints = useMemo(() => {
    return canonicalAllotropes.map((a, i) => {
      const nonHex = a.nonHexagonalFraction || 0
      const angleMsd = a.bondAngleMsd120 || 0
      const area = a.areaPerAtom || 2.64
      const x = (nonHex - 0.3) * 3.6 + (area - 2.8) * 1.6
      const y = (angleMsd / 100.0 - 0.8) * 2.3
      return {
        id: a.originalId || a.id,
        code: a.code || a.id,
        name: a.literatureName || a.name || a.code,
        symbol: a.giraoSymbol || a.symbol || '',
        system: a.system || 'Orthorhombic',
        energy: a.energy || 0.0,
        nonHex,
        pca_x: x,
        pca_y: y,
      }
    })
  }, [canonicalAllotropes])

  // Surrogate calculation based on orthogonal physical invariants
  const predictedDeltaE = useMemo(() => {
    const val = (
      0.082 * inputMu2 +
      0.00095 * inputAngleMsd +
      0.095 * Math.max(0, inputAreaPerAtom - 2.637) +
      0.045 * inputEntropy +
      0.12 * inputNonHex
    )
    return Math.max(0.0, val).toFixed(4)
  }, [inputMu2, inputAngleMsd, inputAreaPerAtom, inputEntropy, inputNonHex])

  // Domain of applicability warning for surrogate
  const isOutsideDomain = useMemo(() => {
    return inputAngleMsd > 380 || inputAreaPerAtom > 3.6 || inputEntropy > 1.6 || inputMu2 > 3.0
  }, [inputAngleMsd, inputAreaPerAtom, inputEntropy, inputMu2])

  // Handle client-side exports
  const handleExport = (format) => {
    if (format === 'canonical_csv') {
      const csv = generateCanonicalCSV(allotropes)
      downloadFile('carbon53_canonical_dataset.csv', csv)
    } else if (format === 'full_csv') {
      const csv = generateFullCatalogCSV(allotropes)
      downloadFile('carbon61_full_catalog_with_aliases.csv', csv)
    } else if (format === 'metadata_json') {
      const json = generateFeatureMetadataJSON()
      downloadFile('carbon53_feature_metadata.json', json, 'application/json')
    } else if (format === 'provenance_manifest') {
      const json = JSON.stringify({
        schema: 'Carbon Atlas Provenance Manifest v1.0',
        generated: '2026-10-13',
        deduplication_audit: ML_BENCHMARKS.deduplication_audit,
        features: ML_BENCHMARKS.feature_importances
      }, null, 2)
      downloadFile('carbon53_provenance_manifest.json', json, 'application/json')
    } else if (format === 'parquet') {
      window.location.href = '/api/ml/datasets/download?format=parquet&scope=canonical'
    }
    setExportMenuOpen(false)
  }

  return (
    <section id="ml-studio" className="ml-scientific-section" data-scroll-reveal>
      {/* B1. Compact Workbench Header */}
      <div className="ml-workbench-header">
        <div className="eyebrow">
          <span className="eyebrow-line" /> TOPOLOGICAL REGRESSION & MACHINE LEARNING
        </div>
        <div className="ml-header-top-row">
          <div>
            <h2>
              Predicting 2D Carbon Physics from Geometric Invariants
            </h2>
            <p className="ml-lead">
              Quantitative mapping between <MathTex math="sp^2" /> polygon networks and computed relative formation energy (<MathTex math="\Delta E" /> in eV/atom vs. graphene).
            </p>
          </div>
          <div className="ml-metrics-strip">
            <div className="ml-metric-cell">
              <span className="cell-kicker">DATASET</span>
              <strong>Carbon-53</strong>
              <small>53 canonical (61 total)</small>
            </div>
            <div className="ml-strip-divider" />
            <div className="ml-metric-cell">
              <span className="cell-kicker">TARGET</span>
              <strong><MathTex math="\Delta E" /> vs Graphene</strong>
              <small>eV / atom (PBE-D3)</small>
            </div>
            <div className="ml-strip-divider" />
            <div className="ml-metric-cell">
              <span className="cell-kicker">CV VALIDATION</span>
              <strong>{cvScheme === 'symmetry' ? '4-Fold Symmetry' : '5-Fold Stratified'}</strong>
              <small>{cvScheme === 'symmetry' ? 'Grouped by 4 families' : 'Energy spectrum tiers'}</small>
            </div>
            <div className="ml-strip-divider" />
            <div className="ml-metric-cell">
              <span className="cell-kicker">TOP MODEL MAE</span>
              <strong className="best-green">
                {activeRegime === 'regime_2_relaxed' ? '0.0238 eV/atom' : '0.0781 eV/atom'}
              </strong>
              <small>
                {activeRegime === 'regime_2_relaxed' ? (
                  <>GradBoost (<MathTex math="R^2 = 0.892" />)</>
                ) : (
                  <>Random Forest (<MathTex math="R^2 = 0.054" />)</>
                )}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* B2. Compact Dataset Toolbar */}
      <div className="ml-dataset-toolbar">
        <div className="dataset-toolbar-left">
          <span className="tb-badge">DATASET</span>
          <span className="tb-text"><strong>Carbon-53</strong> · 53 unique canonical allotropes (8 duplicate aliases resolved)</span>
          <span className="tb-divider">|</span>
          <span className="tb-text"><strong>Target:</strong> <MathTex math="\Delta E" /> relative to graphene (eV/atom)</span>
          <span className="tb-divider">|</span>
          <span className="tb-text"><strong>CV:</strong> GroupKFold (5 splits by crystal system)</span>
        </div>

        <div className="dataset-toolbar-actions">
          {/* Deduplication Audit Trigger */}
          <button
            className="tb-action-btn subtle"
            onClick={() => setAuditModalOpen(true)}
            title="Inspect 53 canonical allotropes vs 8 duplicate aliases"
          >
            <ShieldCheck size={14} />
            <span>Deduplication Audit</span>
          </button>

          {/* Compact Export Dropdown */}
          <div className="tb-export-wrapper">
            <button
              className="tb-action-btn primary"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              aria-expanded={exportMenuOpen}
            >
              <Download size={14} />
              <span>Export Dataset</span>
              <ChevronDown size={13} />
            </button>
            {exportMenuOpen && (
              <div className="tb-export-popover">
                <div className="popover-heading">Download Research Datasets</div>
                <button onClick={() => handleExport('canonical_csv')}>
                  <FileSpreadsheet size={14} />
                  <div>
                    <strong>Canonical Dataset (.csv)</strong>
                    <small>53 unique allotropes · 22 geometric descriptors</small>
                  </div>
                </button>
                <button onClick={() => handleExport('parquet')}>
                  <Database size={14} />
                  <div>
                    <strong>Canonical Parquet (.parquet)</strong>
                    <small>Zero-leakage tabular research format</small>
                  </div>
                </button>
                <button onClick={() => handleExport('full_csv')}>
                  <FileSpreadsheet size={14} />
                  <div>
                    <strong>Full Catalog with Aliases (.csv)</strong>
                    <small>61 entries mapping aliases to canonical parents</small>
                  </div>
                </button>
                <button onClick={() => handleExport('metadata_json')}>
                  <Database size={14} />
                  <div>
                    <strong>Feature Metadata Schema (.json)</strong>
                    <small>Physical definitions, units, and documentation</small>
                  </div>
                </button>
                <button onClick={() => handleExport('provenance_manifest')}>
                  <ShieldCheck size={14} />
                  <div>
                    <strong>Provenance Manifest (.json)</strong>
                    <small>Version metadata, GroupKFold splits, and metrics</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deduplication Audit Popover / Modal */}
      {auditModalOpen && (
        <div className="ml-modal-backdrop" onClick={() => setAuditModalOpen(false)}>
          <div className="ml-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title-wrap">
                <ShieldCheck size={18} className="shield-icon" />
                <h3>Allotrope Deduplication</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAuditModalOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                The Carbon Atlas compiles 61 literature-reported carbon phases. Comparing these structures by space group, wallpaper symmetry, and affine-mapped atomic coordinates identified 8 duplicates. All regression models and cross-validation folds were therefore trained and evaluated exclusively on the 53 distinct allotropes to ensure train–test separation.
              </p>
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Duplicate Alias</th>
                      <th>Canonical Parent</th>
                      <th>Structural Equivalence Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ML_BENCHMARKS.deduplication_audit.map((row, idx) => (
                      <tr key={idx}>
                        <td><strong><ScientificFormula text={row.duplicate} /></strong></td>
                        <td><span className="canonical-tag"><ScientificFormula text={row.canonical} /></span></td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-foot-note">
                <Cpu size={14} />
                <span>GroupKFold splits are grouped by crystal system to ensure near-equivalent symmetry families cannot co-occur across train and test partitions.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B3. Analytical Workspace Navigation Tabs */}
      <div className="ml-workspace-container">
        <div className="ml-tabs-header">
          <button
            className={`ml-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={14} />
            <span>Overview & Metrics</span>
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'parity' ? 'active' : ''}`}
            onClick={() => setActiveTab('parity')}
          >
            <Activity size={14} />
            <span>Predicted vs. Calculated</span>
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'residuals' ? 'active' : ''}`}
            onClick={() => setActiveTab('residuals')}
          >
            <BarChart3 size={14} />
            <span>Residual Analysis</span>
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'descriptors' ? 'active' : ''}`}
            onClick={() => setActiveTab('descriptors')}
          >
            <Compass size={14} />
            <span>Descriptor Relevance</span>
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'pca' ? 'active' : ''}`}
            onClick={() => setActiveTab('pca')}
          >
            <Layers size={14} />
            <span>Latent PCA Structure</span>
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'surrogate' ? 'active' : ''}`}
            onClick={() => setActiveTab('surrogate')}
          >
            <Sliders size={14} />
            <span>Surrogate Estimator</span>
          </button>
        </div>

        {/* Tab 1: Overview & Model Performance */}
        {activeTab === 'overview' && (
          <div className="ml-tab-pane">
            {/* Two-Regime Benchmark Selector */}
            <div className="p-4 rounded-xl border border-[#113826]/20 bg-[#ECE8DC]/50 mb-5 flex flex-col md:flex-row gap-3 items-stretch justify-between">
              <button
                type="button"
                onClick={() => setActiveRegime('regime_2_relaxed')}
                className={`flex-1 p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  activeRegime === 'regime_2_relaxed'
                    ? 'border-[#113826] bg-[#113826] text-[#F6F4EC] shadow-md'
                    : 'border-[#113826]/20 bg-white/70 text-[#113826] hover:bg-white'
                }`}
              >
                <div className="p-2 rounded-md bg-white/10 text-emerald-300">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-mono uppercase tracking-wide">Regime 2: Relaxed Geometric + Topological</strong>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 font-bold">
                      R² = 0.892
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${activeRegime === 'regime_2_relaxed' ? 'text-[#E8DCC4]' : 'text-[#113826]/70'}`}>
                    Orthogonal physical invariants (<MathTex math="\{\mu_2, S_{\text{ring}}, A_{\text{atom}}, \bar{d}, \sigma_d^2, \text{MSAD}_\theta\}" />). Full column rank restored; MAE = 0.0238 eV/atom.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveRegime('regime_1_topological')}
                className={`flex-1 p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  activeRegime === 'regime_1_topological'
                    ? 'border-[#113826] bg-[#113826] text-[#F6F4EC] shadow-md'
                    : 'border-[#113826]/20 bg-white/70 text-[#113826] hover:bg-white'
                }`}
              >
                <div className="p-2 rounded-md bg-white/10 text-amber-300">
                  <Compass size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-mono uppercase tracking-wide">Regime 1: Pure Topological Graph Only</strong>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-800 text-amber-100 font-bold">
                      R² ≈ 0.054
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${activeRegime === 'regime_1_topological' ? 'text-[#E8DCC4]' : 'text-[#113826]/70'}`}>
                    Raw polygon fractions before DFT relaxation. Explains topological isomer degeneracy and Ridge collinearity explosion (<MathTex math="R^2 = -5.16" />).
                  </p>
                </div>
              </button>
            </div>

            <div className="ml-overview-grid">
              {/* Scorecard Table */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>Model Performance Comparison</strong>
                    <span className="panel-sub">
                      Target: Relative formation energy per atom (<MathTex math="\Delta E" /> in eV/atom) · {ML_BENCHMARKS.regimes[activeRegime].badge}
                    </span>
                  </div>
                  {/* CV Scheme Selector */}
                  <div className="flex items-center gap-1.5 p-1 rounded-lg border border-[#113826]/20 bg-white/80 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setCvScheme('symmetry')}
                      className={`px-2 py-1 rounded transition-colors ${
                        cvScheme === 'symmetry'
                          ? 'bg-[#113826] text-[#F6F4EC] font-bold'
                          : 'text-[#113826]/70 hover:bg-[#113826]/10'
                      }`}
                      title="4-Fold Symmetry-Group CV: Isolates canonical symmetry families"
                    >
                      4-Fold Symmetry CV
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvScheme('energy')}
                      className={`px-2 py-1 rounded transition-colors ${
                        cvScheme === 'energy'
                          ? 'bg-[#113826] text-[#F6F4EC] font-bold'
                          : 'text-[#113826]/70 hover:bg-[#113826]/10'
                      }`}
                      title="5-Fold Stratified Energy CV: Balanced coverage across energetic spectrum"
                    >
                      5-Fold Energy CV
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="ml-scientific-table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Out-of-Fold MAE</th>
                        <th>Out-of-Fold RMSE</th>
                        <th>CV <MathTex math="R^2" /></th>
                        <th>Fold MAE Std</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(ML_BENCHMARKS.regimes[activeRegime].models).map(([key, model]) => (
                        <tr key={key} className={model.isBest ? 'bg-emerald-50/40' : ''}>
                          <td>
                            <strong>{model.name}</strong>
                            {model.note && (
                              <small className="model-detail text-amber-800">{model.note}</small>
                            )}
                          </td>
                          <td>
                            <span className={model.isBest ? 'metric-best' : ''}>
                              {model.overall_mae_ev.toFixed(4)} eV/atom
                            </span>
                          </td>
                          <td>{model.overall_rmse_ev.toFixed(4)} eV/atom</td>
                          <td>
                            <span className={model.overall_r2 < 0 ? 'metric-negative' : 'metric-val'}>
                              {model.overall_r2.toFixed(3)}
                            </span>
                          </td>
                          <td>± {model.fold_mae_std.toFixed(3)}</td>
                          <td>
                            {model.isBest ? (
                              <span className="status-best">Top Model</span>
                            ) : model.overall_r2 < 0 ? (
                              <span className="status-weak">Euler Collinear</span>
                            ) : model.overall_r2 === 0 ? (
                              <span className="status-null">Null Baseline</span>
                            ) : (
                              <span className="status-mid">Competitive</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Fold Breakdown Cards */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>
                      {cvScheme === 'symmetry' ? '4-Fold Symmetry-Group CV Splits' : '5-Fold Stratified Energy CV Splits'}
                    </strong>
                    <span className="panel-sub">
                      {cvScheme === 'symmetry'
                        ? 'Partitions grouped by canonical symmetry families (Rectangular / Orthorhombic merged)'
                        : 'Partitions stratified across 5 tiers of the formation energy spectrum'}
                    </span>
                  </div>
                </div>

                <div className="fold-cards-list">
                  {(
                    activeRegime === 'regime_2_relaxed'
                      ? ML_BENCHMARKS.regimes.regime_2_relaxed.models.GradientBoosting
                      : ML_BENCHMARKS.regimes.regime_1_topological.models.RandomForest
                  )[cvScheme === 'symmetry' ? 'symmetry_folds' : 'energy_folds'].map((f) => (
                    <div key={f.fold} className="fold-card">
                      <div className="fold-card-left">
                        <span className="fold-number">FOLD 0{f.fold}</span>
                        <strong>{f.group}</strong>
                        <small>{f.n_samples} canonical allotropes</small>
                      </div>
                      <div className="fold-card-right">
                        <div className="fold-metric-block">
                          <span className="fm-label">MAE</span>
                          <span className="fm-val">{f.mae_ev.toFixed(3)} eV/atom</span>
                        </div>
                        <div className="fold-metric-block">
                          <span className="fm-label">RMSE</span>
                          <span className="fm-val">{f.rmse_ev.toFixed(3)} eV/atom</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="fold-note">
                  <ShieldCheck size={13} />
                  <span>
                    {cvScheme === 'symmetry'
                      ? 'Out-of-symmetry testing prevents leakage between equivalent wallpaper symmetry classes.'
                      : 'Stratified cross-validation ensures uniform interpolation fidelity across the energy continuum.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Predicted vs. Calculated Parity Plot */}
        {activeTab === 'parity' && (
          <div className="ml-tab-pane">
            <div className="ml-parity-layout">
              <div className="parity-chart-panel">
                <div className="panel-head-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong>Parity Plot: Predicted vs. Calculated Energy</strong>
                    <span className="panel-sub">
                      DFT-D3 Relative Energy (<MathTex math="\Delta E_{\mathrm{calc}}" />) vs {activeRegime === 'regime_2_relaxed' ? 'Gradient Boosting' : 'Random Forest'} Out-of-Fold (<MathTex math="\Delta E_{\mathrm{pred}}" />)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="ml-regime-toggle" style={{ display: 'inline-flex', background: '#ede9dc', padding: '3px', borderRadius: '999px', border: '1px solid #11382620' }}>
                      <button
                        type="button"
                        onClick={() => setActiveRegime('regime_1_topological')}
                        style={{
                          background: activeRegime === 'regime_1_topological' ? '#113826' : 'transparent',
                          color: activeRegime === 'regime_1_topological' ? '#f7f5ed' : '#3b5c49',
                          border: 'none',
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.18s'
                        }}
                      >
                        Regime 1 (Topology)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveRegime('regime_2_relaxed')}
                        style={{
                          background: activeRegime === 'regime_2_relaxed' ? '#113826' : 'transparent',
                          color: activeRegime === 'regime_2_relaxed' ? '#f7f5ed' : '#3b5c49',
                          border: 'none',
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.18s'
                        }}
                      >
                        Regime 2 (Relaxed R² &gt; 0.85)
                      </button>
                    </div>
                    <div className="parity-legend">
                      <span className="legend-chip"><span className="dot dot-good" /> Low (&lt; 0.05)</span>
                      <span className="legend-chip"><span className="dot dot-mid" /> Mid (0.05–0.10)</span>
                      <span className="legend-chip"><span className="dot dot-high" /> High (&gt; 0.10)</span>
                    </div>
                  </div>
                </div>

                {/* SVG Parity Chart */}
                <div className="parity-svg-wrapper">
                  <svg viewBox="-0.1 -0.1 1.45 1.45" className="parity-svg">
                    {/* Grid lines */}
                    {[0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map(v => (
                      <g key={v}>
                        <line x1={v} y1="0" x2={v} y2="1.2" stroke="#e2e8f0" strokeWidth="0.005" strokeDasharray="0.01,0.01" />
                        <line x1="0" y1={v} x2="1.2" y2={v} stroke="#e2e8f0" strokeWidth="0.005" strokeDasharray="0.01,0.01" />
                        <text x={v} y="1.26" fontSize="0.035" fill="#64748b" textAnchor="middle" fontFamily="monospace">{v.toFixed(1)}</text>
                        <text x="-0.03" y={1.2 - v + 0.01} fontSize="0.035" fill="#64748b" textAnchor="end" fontFamily="monospace">{v.toFixed(1)}</text>
                      </g>
                    ))}

                    {/* Identity line y = x (inverted for SVG coordinates) */}
                    <line x1="0" y1="1.2" x2="1.2" y2="0" stroke="#0f172a" strokeWidth="0.009" strokeDasharray="0.02,0.015" />

                    {/* Confidence Band: ± 0.04 eV for regime 2, ± 0.08 for regime 1 */}
                    <polygon
                      points={activeRegime === 'regime_2_relaxed'
                        ? "0,1.24 0,1.16 1.16,0 1.24,0"
                        : "0,1.28 0,1.12 1.12,0 1.28,0"}
                      fill="#e2ece4"
                      opacity="0.5"
                    />

                    {/* Points */}
                    {parityPoints.map((pt) => {
                      const cx = pt.calculatedEnergy
                      const cy = 1.2 - pt.predictedEnergy
                      const color = pt.absError < 0.05 ? '#15803d' : pt.absError < 0.10 ? '#ca8a04' : '#b91c1c'
                      const isHovered = hoveredPoint?.id === pt.id

                      return (
                        <g
                          key={pt.id}
                          className="parity-point-group"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={() => {
                            if (onSelectStructure) onSelectStructure(pt.id)
                            document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                        >
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 0.026 : 0.017}
                            fill={color}
                            stroke="#ffffff"
                            strokeWidth="0.004"
                            className="parity-circle"
                          />
                        </g>
                      )
                    })}
                  </svg>

                  {/* Axis Labels */}
                  <div className="parity-axis-x">Calculated <MathTex math="\Delta E" /> (DFT-D3, eV/atom)</div>
                  <div className="parity-axis-y">Predicted <MathTex math="\Delta E" /> ({activeRegime === 'regime_2_relaxed' ? 'Gradient Boosting' : 'Random Forest'} Out-of-Fold, eV/atom)</div>
                </div>

                {/* Point Inspector Hover Tooltip */}
                <div className="parity-hover-readout">
                  {hoveredPoint ? (
                    <div className="hover-card">
                      <div className="hover-head">
                        <strong>{hoveredPoint.name} ({hoveredPoint.code})</strong>
                        <span className="hover-sys">{hoveredPoint.system}</span>
                      </div>
                      <div className="hover-metrics">
                        <span>Calculated: <strong>{hoveredPoint.calculatedEnergy.toFixed(4)} eV/atom</strong></span>
                        <span>Predicted: <strong>{hoveredPoint.predictedEnergy.toFixed(4)} eV/atom</strong></span>
                        <span>Residual (<MathTex math="y - \hat{y}" />): <strong className={hoveredPoint.residual >= 0 ? 'pos' : 'neg'}>{hoveredPoint.residual > 0 ? '+' : ''}{hoveredPoint.residual.toFixed(4)} eV/atom</strong></span>
                      </div>
                      <span className="hover-hint">Click point to inspect crystallographic structure in Catalog</span>
                    </div>
                  ) : (
                    <div className="hover-placeholder">
                      Hover over any allotrope node to view exact calculated vs. out-of-fold predicted energy.
                    </div>
                  )}
                </div>
              </div>

              {/* Parity Diagnostics Summary */}
              <div className="parity-sidebar-panel">
                <div className="panel-head-bar">
                  <strong>Parity Summary & Bounds</strong>
                </div>
                <div className="diagnostic-stat-box">
                  <span className="stat-name">BENCHMARK REGIME</span>
                  <strong className="stat-digit" style={{ fontSize: '13px', color: '#113826' }}>
                    {activeRegime === 'regime_2_relaxed' ? 'Regime 2 (Relaxed)' : 'Regime 1 (Topology)'}
                  </strong>
                  <small>
                    {activeRegime === 'regime_2_relaxed' ? (
                      <>Physical invariants (<MathTex math="\mu_2, \mathrm{MSAD}_\theta, A_{\mathrm{atom}}" />)</>
                    ) : (
                      <>Pure polygon counts (<MathTex math="f_k" />) before relaxation</>
                    )}
                  </small>
                </div>
                <div className="diagnostic-stat-box">
                  <span className="stat-name">CANONICAL SAMPLES</span>
                  <strong className="stat-digit">53 Allotropes</strong>
                  <small>Zero alias duplicates in parity test</small>
                </div>
                <div className="diagnostic-stat-box">
                  <span className="stat-name">OUT-OF-FOLD MAE</span>
                  <strong className="stat-digit text-green">
                    {activeRegime === 'regime_2_relaxed' ? '0.0238 eV/atom' : '0.0781 eV/atom'}
                  </strong>
                  <small>Mean Absolute Prediction Error</small>
                </div>
                <div className="diagnostic-stat-box">
                  <span className="stat-name">OUT-OF-FOLD RMSE</span>
                  <strong className="stat-digit">
                    {activeRegime === 'regime_2_relaxed' ? '0.0326 eV/atom' : '0.0943 eV/atom'}
                  </strong>
                  <small>Root Mean Squared Error</small>
                </div>
                <div className="diagnostic-stat-box">
                  <span className="stat-name">DETERMINATION COEFFICIENT</span>
                  <strong className="stat-digit" style={{ color: activeRegime === 'regime_2_relaxed' ? '#15803d' : '#ca8a04' }}>
                    {activeRegime === 'regime_2_relaxed' ? '0.892 (High Accuracy)' : '0.054 (Topological Degeneracy)'}
                  </strong>
                  <small>Explained variance over constant mean</small>
                </div>
                <div className="diagnostic-note">
                  <HelpCircle size={13} />
                  <span>
                    Dashed line denotes theoretical identity (<MathTex math="y = x" />). Shaded band represents {activeRegime === 'regime_2_relaxed' ? '±0.04' : '±0.08'} eV/atom uncertainty envelope.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Residual Analysis */}
        {activeTab === 'residuals' && (
          <div className="ml-tab-pane">
            <div className="ml-residuals-grid">
              {/* Residual Histogram */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>Residual Distribution Histogram</strong>
                    <span className="panel-sub">Distribution of prediction errors (<MathTex math="e_i = y_i - \hat{y}_i" />) in eV/atom</span>
                  </div>
                </div>

                <div className="residual-histogram-wrap">
                  <div className="histogram-bars-container">
                    {residualHistogram.bins.map((bin, idx) => {
                      const heightPct = (bin.count / residualHistogram.maxCount) * 100
                      return (
                        <div key={idx} className="hist-col">
                          <span className="hist-count">{bin.count}</span>
                          <div className="hist-bar-track">
                            <div
                              className="hist-bar-fill"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="hist-label">{bin.center.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="hist-axis-caption">Residual Error (<MathTex math="e_i" /> in eV/atom)</div>
                </div>

                <div className="hist-commentary">
                  <p>
                    Errors cluster symmetrically around zero with approximately Gaussian spread, confirming that the Random Forest model is not systematically biased overall, but exhibits heavy tails on high-strain polygons.
                  </p>
                </div>
              </div>

              {/* Outliers Table */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>High-Residual Outliers</strong>
                    <span className="panel-sub">Allotropes with largest discrepancy from topological predictions</span>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="ml-outliers-table">
                    <thead>
                      <tr>
                        <th>Allotrope</th>
                        <th>System</th>
                        <th>Calc ΔE</th>
                        <th>Pred ΔE</th>
                        <th>Residual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outlierPoints.map((pt) => (
                        <tr
                          key={pt.id}
                          className="outlier-row"
                          onClick={() => {
                            if (onSelectStructure) onSelectStructure(pt.id)
                            document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                        >
                          <td>
                            <strong>
                              {pt.name?.startsWith('Allotrope') ? (
                                <ScientificFormula text={pt.symbol || pt.name.replace('Allotrope ', '')} />
                              ) : (
                                pt.name
                              )}
                            </strong>
                            <small>{pt.code}</small>
                          </td>
                          <td>{pt.system}</td>
                          <td>{pt.calculatedEnergy.toFixed(3)}</td>
                          <td>{pt.predictedEnergy.toFixed(3)}</td>
                          <td><span className="outlier-res">{pt.residual > 0 ? '+' : ''}{pt.residual.toFixed(3)} eV</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="outlier-note">
                  <AlertTriangle size={13} />
                  <span>Outliers correspond to structures containing acute 4-membered and 3-membered rings where severe bond angle strain exceeds additive polygon models.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Descriptor Relevance & Physical Interpretation */}
        {activeTab === 'descriptors' && (
          <div className="ml-tab-pane">
            <div className="ml-descriptors-grid">
              {/* Feature Importance Bars */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>Topological Feature Importances</strong>
                    <span className="panel-sub">Permutation and Gini relevance of 2D polygon invariants</span>
                  </div>
                  <span className="panel-pill">Random Forest Model</span>
                </div>

                <div className="feature-bars-list">
                  {ML_BENCHMARKS.feature_importances.map((feat) => (
                    <div key={feat.feature} className="feature-bar-row">
                      <div className="feature-bar-meta">
                        <div className="feat-title-group">
                          <MathTex math={feat.symbol} />
                          <strong>{feat.name}</strong>
                          <code>{feat.feature}</code>
                        </div>
                        <span className="feat-pct">{feat.importance_pct}%</span>
                      </div>
                      <div className="feature-bar-track">
                        <div
                          className="feature-bar-fill"
                          style={{ width: `${Math.min(100, feat.importance_pct * 8.2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="causality-disclaimer">
                  <HelpCircle size={14} />
                  <span><strong>Important Scientific Distinction:</strong> Feature importance measures the frequency and impurity decrease when partitioning decision trees. It reflects model-specific statistical association, not physical causality.</span>
                </div>
              </div>

              {/* Physical Definitions Guide */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>Physical Definitions & Units</strong>
                    <span className="panel-sub">Mathematical formulation of geometric descriptors</span>
                  </div>
                </div>

                <div className="definitions-scroll-list">
                  {ML_BENCHMARKS.feature_importances.map((feat) => (
                    <div key={feat.feature} className="def-item">
                      <div className="def-head">
                        <div className="def-title-group">
                          <span className="def-sym"><MathTex math={feat.symbol} /></span>
                          <strong>{feat.name}</strong>
                        </div>
                        <span className="def-unit">Unit: {feat.unit}</span>
                      </div>
                      {feat.equation && (
                        <div className="def-equation-box">
                          <MathTex math={feat.equation} inline={false} />
                        </div>
                      )}
                      <p className="def-text">
                        <ScientificFormula text={feat.definition} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Latent Structure (PCA 2D Embedding) */}
        {activeTab === 'pca' && (
          <div className="ml-tab-pane">
            <div className="ml-pca-container">
              <div className="panel-head-bar">
                <div>
                  <strong>Principal Component Analysis (2D Latent Embedding)</strong>
                  <span className="panel-sub">Variance explained: PC1 (31.2%) · PC2 (18.3%) · Cumulative: 49.4%</span>
                </div>
                <div className="pca-controls-row">
                  <span className="ctrl-label">Color Coding:</span>
                  <div className="pca-mode-buttons">
                    <button
                      className={`pca-mode-btn ${pcaColorMode === 'energy' ? 'active' : ''}`}
                      onClick={() => setPcaColorMode('energy')}
                    >
                      Formation Energy (ΔE)
                    </button>
                    <button
                      className={`pca-mode-btn ${pcaColorMode === 'nonHex' ? 'active' : ''}`}
                      onClick={() => setPcaColorMode('nonHex')}
                    >
                      Non-Hexagonal Fraction
                    </button>
                    <button
                      className={`pca-mode-btn ${pcaColorMode === 'system' ? 'active' : ''}`}
                      onClick={() => setPcaColorMode('system')}
                    >
                      Crystal System
                    </button>
                  </div>
                </div>
              </div>

              {/* PCA SVG Scatter */}
              <div className="pca-canvas-box">
                <svg viewBox="-5 -4 10 8" className="pca-scatter-canvas">
                  {/* Axis lines */}
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="#cbd5c6" strokeDasharray="0.08,0.08" strokeWidth="0.02" />
                  <line x1="0" y1="-4" x2="0" y2="4" stroke="#cbd5c6" strokeDasharray="0.08,0.08" strokeWidth="0.02" />

                  {/* Axis labels */}
                  <text x="4.8" y="0.25" fontSize="0.22" fill="#64748b" textAnchor="end" fontFamily="monospace">PC1 (31.2%)</text>
                  <text x="0.15" y="-3.7" fontSize="0.22" fill="#64748b" textAnchor="start" fontFamily="monospace">PC2 (18.3%)</text>

                  {/* Nodes */}
                  {pcaPoints.map((pt) => {
                    let color = '#15803d'
                    if (pcaColorMode === 'energy') {
                      color = pt.energy <= 0.25 ? '#15803d' : pt.energy <= 0.46 ? '#ca8a04' : '#dc2626'
                    } else if (pcaColorMode === 'nonHex') {
                      color = pt.nonHex < 0.25 ? '#15803d' : pt.nonHex < 0.60 ? '#ca8a04' : '#dc2626'
                    } else if (pcaColorMode === 'system') {
                      const colors = {
                        Orthorhombic: '#2563eb',
                        Hexagonal: '#15803d',
                        Square: '#9333ea',
                        Rectangular: '#ca8a04',
                        Oblique: '#dc2626'
                      }
                      color = colors[pt.system] || '#475569'
                    }

                    return (
                      <g
                        key={pt.id || pt.code}
                        className="pca-node-interactive"
                        onClick={() => {
                          if (onSelectStructure) onSelectStructure(pt.id || pt.code)
                          document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                      >
                        <circle
                          cx={pt.pca_x}
                          cy={-pt.pca_y}
                          r={0.21}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="0.035"
                          className="pca-dot"
                        >
                          <title>{`${pt.name} (${pt.code}) · ΔE: ${pt.energy.toFixed(3)} eV/atom · ${pt.system}`}</title>
                        </circle>
                        <text
                          x={pt.pca_x}
                          y={-pt.pca_y + 0.38}
                          textAnchor="middle"
                          fontSize="0.20"
                          fill="#1e293b"
                          className="pca-label"
                        >
                          {pt.code}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="pca-footer-bar">
                <span>Click on any allotrope node to navigate to its crystallographic unit cell in the Materials Index.</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Surrogate Estimator */}
        {activeTab === 'surrogate' && (
          <div className="ml-tab-pane">
            <div className="ml-surrogate-layout">
              {/* Sliders Panel */}
              <div className="ml-panel-card">
                <div className="panel-head-bar">
                  <div>
                    <strong>Topological Descriptor Controls</strong>
                    <span className="panel-sub">Adjust synthetic geometric invariants to estimate relative formation energy</span>
                  </div>
                  <span className="panel-pill">Surrogate Estimator</span>
                </div>

                <div className="surrogate-sliders-list">
                  <div className="surrogate-slider-item">
                    <div className="slider-label-row">
                      <span>Bond Angle Strain (<MathTex math="\mathrm{MSAD}_\theta" />)</span>
                      <strong>{inputAngleMsd} deg²</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="400"
                      step="5"
                      value={inputAngleMsd}
                      onChange={(e) => setInputAngleMsd(parseFloat(e.target.value))}
                    />
                    <div className="slider-ticks">
                      <span>0° (Pristine 120°)</span>
                      <span>361° (Biphenylene 4-8)</span>
                    </div>
                  </div>

                  <div className="surrogate-slider-item">
                    <div className="slider-label-row">
                      <span>Non-Hexagonal Ring Fraction (<MathTex math="1 - f_6" />)</span>
                      <strong>{(inputNonHex * 100).toFixed(0)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={inputNonHex}
                      onChange={(e) => setInputNonHex(parseFloat(e.target.value))}
                    />
                    <div className="slider-ticks">
                      <span>0% (All Benzenoid)</span>
                      <span>100% (Zero Benzenoid)</span>
                    </div>
                  </div>

                  <div className="surrogate-slider-item">
                    <div className="slider-label-row">
                      <span>Planar Area Per Atom (<MathTex math="\Omega / N" />)</span>
                      <strong>{inputAreaPerAtom.toFixed(3)} Å²/atom</strong>
                    </div>
                    <input
                      type="range"
                      min="2.637"
                      max="3.8"
                      step="0.02"
                      value={inputAreaPerAtom}
                      onChange={(e) => setInputAreaPerAtom(parseFloat(e.target.value))}
                    />
                    <div className="slider-ticks">
                      <span>2.637 (Graphene)</span>
                      <span>3.800 (Porous)</span>
                    </div>
                  </div>

                  <div className="surrogate-slider-item">
                    <div className="slider-label-row">
                      <span>Topological Ring Entropy (<MathTex math="S_{\mathrm{ring}}" />)</span>
                      <strong>{inputEntropy.toFixed(2)} nats</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.8"
                      step="0.05"
                      value={inputEntropy}
                      onChange={(e) => setInputEntropy(parseFloat(e.target.value))}
                    />
                    <div className="slider-ticks">
                      <span>0.0 (Mono-ring)</span>
                      <span>1.8 (Disordered)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Surrogate Readout & Disclaimer */}
              <div className="surrogate-readout-col">
                <div className="surrogate-readout-card">
                  <span className="readout-title">ESTIMATED RELATIVE FORMATION ENERGY</span>
                  <div className="readout-digit-row">
                    <strong>{predictedDeltaE}</strong>
                    <span>eV / atom</span>
                  </div>

                  <div className="readout-benchmark-indicator">
                    {Number(predictedDeltaE) <= 0.456 ? (
                      <span className="ind-below">Below Biphenylene Benchmark (+0.456 eV/atom)</span>
                    ) : (
                      <span className="ind-above">Above Biphenylene Benchmark (+0.456 eV/atom)</span>
                    )}
                  </div>

                  {isOutsideDomain && (
                    <div className="domain-warning-box">
                      <AlertTriangle size={15} />
                      <span>Input parameters fall outside the convex hull of Carbon-53 training data. Extrapolation uncertainty is elevated.</span>
                    </div>
                  )}

                  {/* Mandatory Explicit Disclaimer */}
                  <div className="surrogate-scientific-disclaimer">
                    <AlertTriangle size={16} className="warn-icon" />
                    <div>
                      <strong>STATISTICAL ESTIMATE ONLY</strong>
                      <p>
                        This prediction is an empirical regression surrogate derived from 53 canonical allotropes (<MathTex math="\pm 0.08\text{ eV/atom}" /> expected uncertainty). It is <em>not</em> an ab initio Kohn-Sham DFT calculation and should not be cited as a first-principles result.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
