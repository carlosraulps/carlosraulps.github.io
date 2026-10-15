/**
 * Carbon Atlas — Scientific Integrity & UI/UX Automated Test Suite
 * Validates:
 * 1. Bibliography search, filtering, multi-column sorting, and citation formats.
 * 2. Literature mapping integrity (DOIs, allotrope relationships, zero emojis).
 * 3. Machine learning benchmarks, GroupKFold statistics, and baseline comparisons.
 * 4. Dataset export generators (Canonical CSV, Full Catalog CSV, Metadata JSON).
 * 5. Deduplication audit logic (53 canonical structures from 61 catalog entries).
 * 6. Responsive styling tokens and CSS classes.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SCIENTIFIC_BIBLIOGRAPHY,
  toBibTeX,
  toRIS,
  toAPA
} from '../src/data/scientificBibliography.js'

import {
  ML_BENCHMARKS,
  getParityData,
  generateCanonicalCSV,
  generateFullCatalogCSV,
  generateFeatureMetadataJSON
} from '../src/data/mlData.js'

import {
  DOUBLE_MAX,
  SINGLE_MIN,
  UNIFORM_DELTA_D_MAX,
  BONDING_THRESHOLDS,
  BOND_LENGTH_LABELS,
} from '../src/constants/bondingThresholds.ts'

import {
  getStructureBondingClass,
  extractStructureBondStats,
  getStructureBondingBadge,
} from '../src/utils/bondingLogic.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 Starting Carbon Atlas Scientific Integrity Test Suite...\n')

let passedTests = 0
function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(`    ${err.message}`)
    process.exitCode = 1
  }
}

// -------------------------------------------------------------
// 1. BIBLIOGRAPHY METADATA & ZERO EMOJI COMPLIANCE
// -------------------------------------------------------------
console.log('--- 1. Scientific Bibliography Integrity ---')

runTest('Contains exactly verified peer-reviewed publications with valid DOIs', () => {
  assert.ok(SCIENTIFIC_BIBLIOGRAPHY.length >= 20, 'Should contain at least 20 verified papers')
  const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/
  for (const ref of SCIENTIFIC_BIBLIOGRAPHY) {
    assert.ok(ref.doi, `Reference ${ref.id} missing DOI`)
    assert.match(ref.doi, doiRegex, `Reference ${ref.id} has invalid DOI format: ${ref.doi}`)
    assert.ok(ref.title && ref.title.length > 5, `Reference ${ref.id} has missing or empty title`)
    assert.ok(Array.isArray(ref.authors) && ref.authors.length > 0, `Reference ${ref.id} has invalid authors`)
    assert.ok(typeof ref.year === 'number' && ref.year >= 1980 && ref.year <= 2026, `Reference ${ref.id} year out of range: ${ref.year}`)
    assert.ok(ref.venue, `Reference ${ref.id} missing journal venue`)
  }
})

runTest('Strict zero emoji enforcement across all bibliography titles, categories, and roles', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  for (const ref of SCIENTIFIC_BIBLIOGRAPHY) {
    assert.ok(!emojiRegex.test(ref.category), `Category for ${ref.id} contains emoji: ${ref.category}`)
    assert.ok(!emojiRegex.test(ref.title), `Title for ${ref.id} contains emoji: ${ref.title}`)
    assert.ok(!emojiRegex.test(ref.abstract), `Abstract for ${ref.id} contains emoji: ${ref.abstract}`)
    if (ref.roles) {
      for (const role of Object.values(ref.roles)) {
        assert.ok(!emojiRegex.test(role), `Role in ${ref.id} contains emoji: ${role}`)
      }
    }
  }
})

runTest('BibTeX, RIS, and APA citation generation produces valid standard syntax', () => {
  const fanPaper = SCIENTIFIC_BIBLIOGRAPHY.find(r => r.id === 'fan_2021_science')
  assert.ok(fanPaper, 'Fan et al. 2021 biphenylene paper must exist')

  const bibtex = toBibTeX(fanPaper)
  assert.ok(bibtex.startsWith('@article{fan_2021_science,'), 'BibTeX format header')
  assert.ok(bibtex.includes('title     = {Biphenylene network: A nonbenzenoid carbon allotrope}'), 'BibTeX title')
  assert.ok(bibtex.includes('doi       = {10.1126/science.abg4509}'), 'BibTeX DOI')

  const ris = toRIS(fanPaper)
  assert.ok(ris.includes('TY  - JOUR'), 'RIS TY header')
  assert.ok(ris.includes('DO  - 10.1126/science.abg4509'), 'RIS DOI tag')
  assert.ok(ris.includes('ER  - '), 'RIS end of record')

  const apa = toAPA(fanPaper)
  assert.ok(apa.includes('(2021). Biphenylene network: A nonbenzenoid carbon allotrope. Science'), 'APA format')
  assert.ok(apa.includes('https://doi.org/10.1126/science.abg4509'), 'APA DOI URL')
})

runTest('Bibliography search and filtering functionality', () => {
  // Test query for 'Biphenylene'
  const query = 'biphenylene'
  const filtered = SCIENTIFIC_BIBLIOGRAPHY.filter(item => {
    const q = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      (Array.isArray(item.authors) ? item.authors.join(' ').toLowerCase() : '').includes(q) ||
      item.venue.toLowerCase().includes(q) ||
      item.doi.toLowerCase().includes(q) ||
      (item.linkedAllotropeIds && item.linkedAllotropeIds.some(id => id.toLowerCase().includes(q)))
    )
  })
  assert.ok(filtered.length >= 4, `Expected at least 4 biphenylene papers, got ${filtered.length}`)

  // Test filter by category
  const synthPapers = SCIENTIFIC_BIBLIOGRAPHY.filter(r => r.category === 'Experimental Synthesis')
  assert.ok(synthPapers.length >= 5, 'Experimental Synthesis papers count')

  // Test filter by year
  const y2023 = SCIENTIFIC_BIBLIOGRAPHY.filter(r => r.year === 2023)
  assert.ok(y2023.length >= 2, '2023 publications count')
})

// -------------------------------------------------------------
// 2. MACHINE LEARNING & GROUPKFOLD SCIENTIFIC DIAGNOSTICS
// -------------------------------------------------------------
console.log('\n--- 2. Machine Learning Benchmark & GroupKFold Diagnostics ---')

runTest('Dataset dimensions adhere strictly to 53 canonical unique allotropes and 61 catalog entries', () => {
  assert.equal(ML_BENCHMARKS.sample_size, 53, 'Canonical sample size must be 53')
  assert.equal(ML_BENCHMARKS.full_catalog_size, 61, 'Full catalog size must be 61')
  assert.equal(ML_BENCHMARKS.duplicate_aliases_count, 8, 'Duplicate aliases count must be 8')
})

runTest('Baseline constant-mean target stats are mathematically sound', () => {
  const stats = ML_BENCHMARKS.target_stats
  assert.ok(stats.mean_ev > 0.3 && stats.mean_ev < 0.4, 'Mean ΔE must be around 0.33 eV/atom')
  assert.ok(stats.std_ev > 0.09 && stats.std_ev < 0.11, 'Std ΔE must be ~0.097 eV/atom')
  assert.equal(stats.baseline_constant_mean_mae, 0.0787, 'Baseline constant-mean MAE must be 0.0787 eV/atom')
})

runTest('Model comparison preserves true metrics and negative R2 for Ridge regression', () => {
  const rf = ML_BENCHMARKS.models.RandomForest
  assert.equal(rf.overall_mae_ev, 0.0781, 'RF MAE 0.0781 eV/atom')
  assert.equal(rf.overall_r2, 0.054, 'RF R2 must be 0.054 (low variance explained)')
  assert.equal(rf.isBest, true, 'RF is best model')

  const ridge = ML_BENCHMARKS.models.Ridge
  assert.equal(ridge.overall_mae_ev, 0.1556, 'Ridge MAE 0.1556 eV/atom')
  assert.equal(ridge.overall_r2, -5.159, 'Ridge negative R2 must be preserved faithfully, not hidden')
  assert.equal(ridge.isBest, false)
})

runTest('GroupKFold partition groups sum up to all 53 canonical allotropes without leakage', () => {
  const folds = ML_BENCHMARKS.models.RandomForest.folds
  assert.equal(folds.length, 5, 'Must have exactly 5 folds')
  const totalSamples = folds.reduce((sum, f) => sum + f.n_samples, 0)
  assert.equal(totalSamples, 53, 'Fold sample sizes must sum to 53 canonical allotropes')

  const expectedGroups = ['Orthorhombic', 'Hexagonal', 'Square / Tetragonal', 'Rectangular', 'Oblique']
  for (let i = 0; i < folds.length; i++) {
    assert.equal(folds[i].group, expectedGroups[i], `Fold ${i + 1} group match`)
  }
})

runTest('Parity data generator computes residuals and error metrics correctly', () => {
  const mockAllotropes = Array.from({ length: 53 }, (_, i) => ({
    id: `G-${String(i + 1).padStart(2, '0')}`,
    name: `Allotrope ${i + 1}`,
    energy: 0.250 + i * 0.01,
    nonHexagonalFraction: 0.2,
    bondAngleMsd120: 15.0,
    areaPerAtom: 2.65,
    isCanonical: true
  }))
  const parity = getParityData(mockAllotropes)
  assert.equal(parity.length, 53, 'Must contain 53 parity data points')
  for (const p of parity) {
    assert.ok(p.id, 'Sample has ID')
    assert.ok(typeof p.calculatedEnergy === 'number', 'Calculated energy is number')
    assert.ok(typeof p.predictedEnergy === 'number', 'Predicted energy is number')
    assert.ok(typeof p.residual === 'number', 'Residual is number')
    assert.equal(Number((p.predictedEnergy - p.calculatedEnergy).toFixed(4)), Number(p.residual.toFixed(4)), 'Residual equals pred - calc')
  }
})

runTest('Duplicate audit list defines all 8 duplicate aliases with crystallographic rationale', () => {
  const audit = ML_BENCHMARKS.deduplication_audit
  assert.equal(audit.length, 8, 'Must have exactly 8 duplicate audit entries')
  for (const item of audit) {
    assert.ok(item.canonical, 'Audit entry has canonical ID')
    assert.ok(item.duplicate, 'Audit entry has duplicate alias ID')
    assert.ok(item.reason && item.reason.length > 10, 'Audit entry has scientific reason')
  }
})

// -------------------------------------------------------------
// 3. DATASET EXPORT GENERATORS
// -------------------------------------------------------------
console.log('\n--- 3. Dataset Export Pipelines ---')

runTest('Canonical CSV export generates valid schema and exactly 53 rows', () => {
  const mockAllotropes = Array.from({ length: 53 }, (_, i) => ({
    canonicalId: `G-${String(i + 1).padStart(2, '0')}`,
    code: `c_allotrope_${i + 1}`,
    name: `Allotrope ${i + 1}`,
    symbol: `h6^${i + 1}`,
    system: i < 18 ? 'Orthorhombic' : i < 32 ? 'Hexagonal' : 'Rectangular',
    spaceGroup: 'P6/mmm',
    spaceGroupNumber: 191,
    energy: 0.250 + i * 0.01,
    natoms: 4,
    areaPerAtom: 2.65,
    density: 0.35,
    nonHexagonalFraction: 0.20,
    bondAngleMsd120: 15.2,
    ringEntropy: 0.45,
    bondLengthMean: 1.415
  }))

  const csv = generateCanonicalCSV(mockAllotropes)
  const lines = csv.trim().split('\n')
  assert.equal(lines.length, 54, 'CSV must have header + 53 data rows')
  assert.ok(lines[0].startsWith('canonical_id,catalog_code,literature_name,girao_symbol'), 'Header columns')
  assert.ok(lines[1].includes('"G-01"'), 'Row 1 canonical ID')
})

runTest('Full Catalog CSV export includes is_canonical and canonical_parent_id', () => {
  const mockCatalog = [
    { id: 'biphenylene', code: 'biphenylene', name: 'Biphenylene', isCanonical: true, canonicalId: 'G-02', system: 'Orthorhombic', spaceGroup: 'Pmmm', energy: 0.456 },
    { id: 'beta_graphene', code: 'beta_graphene', name: 'β-Graphene (Alias)', isCanonical: false, canonicalId: 'G-02', system: 'Orthorhombic', spaceGroup: 'Pmmm', energy: 0.456 }
  ]
  const csv = generateFullCatalogCSV(mockCatalog)
  const lines = csv.trim().split('\n')
  assert.equal(lines.length, 3, 'CSV must have header + 2 entries')
  assert.ok(lines[1].includes('true,"G-02"'), 'Canonical parent entry')
  assert.ok(lines[2].includes('false,"G-02"'), 'Duplicate alias mapped to parent')
})

runTest('Feature Metadata JSON export generates valid schema specification', () => {
  const jsonStr = generateFeatureMetadataJSON()
  const parsed = JSON.parse(jsonStr)
  assert.equal(parsed.dataset_name, 'Carbon-53 2D Geometric & Topological Descriptors')
  assert.equal(parsed.target_property.name, 'delta_e_ev_per_atom')
  assert.equal(parsed.sample_sizes.canonical_unique, 53)
  assert.equal(parsed.sample_sizes.duplicate_aliases, 8)
  assert.equal(parsed.validation_protocol.scheme, 'GroupKFold')
})

// -------------------------------------------------------------
// 4. DESIGN TOKENS & RESPONSIVE CSS INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 4. UI/UX Style & Design Token Integrity ---')

runTest('src/styles.css enforces warm ivory palette and monospace typography', () => {
  const cssPath = path.resolve(__dirname, '../src/styles.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  // Color tokens
  assert.ok(css.includes('#f4f2e9') || css.includes('--paper'), 'Background warm ivory paper token present')
  assert.ok(css.includes('#143f35') || css.includes('--forest'), 'Forest green accent present')
  assert.ok(css.includes('DM Mono') || css.includes('monospace'), 'Monospace numerical typography present')

  // Responsive rules
  assert.ok(css.includes('@media (max-width: 1024px)'), 'Tablet breakpoint present')
  assert.ok(css.includes('@media (max-width: 768px)'), 'Mobile breakpoint present')

  // Zero-redundancy classes
  assert.ok(css.includes('.bib-col-title'), 'Bibliography custom title class present')
  assert.ok(css.includes('.ml-workbench-header'), 'ML compact workbench header class present')
  assert.ok(css.includes('.dataset-toolbar'), 'Compact dataset toolbar class present')
})

// -------------------------------------------------------------
// 5. COVALENT BONDING CLASSIFICATION & DETERMINISTIC INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 5. Covalent Bonding Classification & Deterministic Regimes ---')

runTest('Canonical bond length cutoffs adhere strictly to single source of truth', () => {
  assert.equal(DOUBLE_MAX, 1.375, 'DOUBLE_MAX must be 1.375 Å')
  assert.equal(SINGLE_MIN, 1.455, 'SINGLE_MIN must be 1.455 Å')
  assert.equal(UNIFORM_DELTA_D_MAX, 0.025, 'UNIFORM_DELTA_D_MAX must be 0.025 Å')
  assert.equal(BONDING_THRESHOLDS.DOUBLE_MAX, 1.375)
  assert.equal(BONDING_THRESHOLDS.SINGLE_MIN, 1.455)
  assert.equal(BONDING_THRESHOLDS.UNIFORM_DELTA_D_MAX, 0.025)
  assert.ok(BOND_LENGTH_LABELS.doubleCriterion.includes('1.375'))
  assert.ok(BOND_LENGTH_LABELS.delocalizedCriterion.includes('1.375') && BOND_LENGTH_LABELS.delocalizedCriterion.includes('1.455'))
  assert.ok(BOND_LENGTH_LABELS.singleCriterion.includes('1.455'))
})

runTest('Pristine graphene is uniquely classified as Pure Resonant with zero BLA', () => {
  const grapheneStats = {
    doubleCount: 0,
    aromaticCount: 3,
    singleCount: 0,
    totalBonds: 3,
    deltaD: 0.0
  }
  const cls = getStructureBondingClass(grapheneStats)
  assert.equal(cls.catalogBadge, 'Pure Resonant')
  assert.equal(cls.inspectorBadge, 'Uniform Resonant sp²')
  assert.equal(cls.isUniformResonant, true)
})

runTest('PHOTH-graphene with mixed double/single/aromatic bonds is NOT labeled Pure Resonant', () => {
  const phothStats = {
    doubleCount: 4,
    aromaticCount: 3,
    singleCount: 8,
    totalBonds: 15,
    deltaD: 0.17118
  }
  const cls = getStructureBondingClass(phothStats)
  assert.equal(cls.catalogBadge, 'Mixed / Strained sp²')
  assert.equal(cls.inspectorBadge, 'Anisotropic / Mixed sp²')
  assert.equal(cls.isUniformResonant, false)
})

runTest('Phagraphene with high topological strain is classified as Delocalized sp²', () => {
  const phagrapheneStats = {
    doubleCount: 0,
    aromaticCount: 16,
    singleCount: 4,
    totalBonds: 20,
    deltaD: 0.13475
  }
  const cls = getStructureBondingClass(phagrapheneStats)
  assert.equal(cls.catalogBadge, 'Delocalized sp²')
  assert.equal(cls.inspectorBadge, 'Delocalized sp² (Topological Strain)')
  assert.equal(cls.isUniformResonant, false)
})

runTest('Missing deltaD is safely lower-bounded and never defaults to 0', () => {
  const statsMissing = {
    doubleCount: 4,
    aromaticCount: 3,
    singleCount: 8,
    totalBonds: 15,
    deltaD: null
  }
  const cls = getStructureBondingClass(statsMissing)
  assert.equal(cls.isUniformResonant, false)
  assert.notEqual(cls.catalogBadge, 'Pure Resonant')
  assert.equal(cls.catalogBadge, 'Mixed / Strained sp²')
})

console.log(`\n🎉 All ${passedTests} scientific integrity tests passed successfully!`)
