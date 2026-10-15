/**
 * Carbon Atlas — Scientific & Crystallographic Integrity Test Suite
 * Validates:
 * 1. Normalized master catalog (53 canonical + 8 aliases = 61 entries)
 * 2. Canonical PHOTH-Graphene audit (ΔE = 0.539 eV/atom, r4²·6²·8², rings 4, 6, 8)
 * 3. 4-Family 2D/3D symmetry consistency (hexagonal, square, rectangular, oblique)
 * 4. Supercell generator: independent Na x Nb, vacuum thickness (15, 20, 25 Å) with z=0.50 centering
 * 5. SIESTA .fdf export with Pulay mixing rules and QE .in export
 * 6. ML two-regime benchmark consistency (Regime 1 topology vs Regime 2 relaxed)
 * 7. Topological invariant physical bounds (μ₂ ≥ 0, S_ring ≥ 0, A_atom > 0)
 */

import assert from 'assert'
import { masterCatalog, classifySymmetryFamily, SYMMETRY_FAMILIES, getAllotropeById } from '../frontend/src/store/allotropesStore.ts'
import { generateSupercellExport } from '../frontend/src/utils/supercellGenerator.js'
import { ML_BENCHMARKS } from '../frontend/src/data/mlData.js'

console.log('='.repeat(80))
console.log('  CARBON ATLAS — SCIENTIFIC INTEGRITY & CRYSTALLOGRAPHIC AUDIT')
console.log('='.repeat(80))

let passedCount = 0

// Test 1: Master Catalog Size and Deduplication
assert.strictEqual(masterCatalog.length, 61, 'Master catalog must contain 61 total allotrope entries')
const canonicalList = masterCatalog.filter(a => a.isCanonical !== false)
assert.strictEqual(canonicalList.length, 53, 'Master catalog must contain exactly 53 unique canonical allotropes')
const aliasList = masterCatalog.filter(a => a.isCanonical === false)
assert.strictEqual(aliasList.length, 8, 'Master catalog must contain exactly 8 duplicate alias records')
console.log('✓ PASS: Catalog contains 53 canonical allotropes and 8 duplicate aliases (61 total, 13.1% savings)')
passedCount++

// Test 2: Canonical PHOTH-Graphene Audit
const photh = getAllotropeById('photh_graphene')
assert(photh, 'PHOTH-Graphene must be present in master catalog')
assert.strictEqual(photh.energy, 0.539, 'PHOTH-Graphene energy must strictly be canonical 0.539 eV/atom')
assert.strictEqual(photh.delta_e_ev_per_atom, 0.539, 'PHOTH-Graphene delta_e_ev_per_atom must strictly be 0.539 eV/atom')
assert.strictEqual(photh.giraoSymbol, 'r4²·6²·8²', 'PHOTH-Graphene Girão notation must strictly be r4²·6²·8²')
assert.deepStrictEqual(photh.polygonTypes, [4, 6, 8], 'PHOTH-Graphene polygon types must strictly be [4, 6, 8]')
assert.strictEqual(photh.rings[4], 2, 'PHOTH-Graphene must have 4-membered rings')
assert.strictEqual(photh.rings[6], 2, 'PHOTH-Graphene must have 6-membered rings')
assert.strictEqual(photh.rings[8], 2, 'PHOTH-Graphene must have 8-membered rings')
assert.strictEqual(photh.rings[5], undefined, 'PHOTH-Graphene must NOT have 5-membered rings')
assert.strictEqual(photh.rings[7], undefined, 'PHOTH-Graphene must NOT have 7-membered rings')
console.log('✓ PASS: PHOTH-Graphene canonical audit passed (ΔE = 0.539 eV/atom, r4²·6²·8², rings 4, 6, 8)')
passedCount++

// Test 3: 4 Canonical Symmetry Families Classification
const validFamilies = new Set(['hexagonal', 'square', 'rectangular', 'oblique'])
const familyCounts = { hexagonal: 0, square: 0, rectangular: 0, oblique: 0 }

for (const allotrope of masterCatalog) {
  const fam = classifySymmetryFamily(allotrope)
  assert(validFamilies.has(fam), `Allotrope ${allotrope.id} mapped to invalid symmetry family: ${fam}`)
  familyCounts[fam]++
}

assert(familyCounts.hexagonal > 0, 'Hexagonal family must have allotropes')
assert(familyCounts.square > 0, 'Square family must have allotropes')
assert(familyCounts.rectangular > 0, 'Rectangular family must have allotropes')
assert(familyCounts.oblique > 0, 'Oblique family must have allotropes')
console.log(`✓ PASS: 4 Canonical Symmetry Families validated: Hexagonal (${familyCounts.hexagonal}), Square (${familyCounts.square}), Rectangular (${familyCounts.rectangular}), Oblique (${familyCounts.oblique})`)
passedCount++

// Test 4: Independent Na x Nb Supercell Multiplication & Formats
const testAllotrope = photh
for (const [na, nb] of [[1, 1], [2, 3], [3, 2], [4, 4]]) {
  for (const fmt of ['cif', 'poscar', 'xyz', 'qe', 'fdf', 'json']) {
    const res = generateSupercellExport(testAllotrope, fmt, { na, nb, vacuum: 20 })
    assert(res.content && res.content.length > 50, `Failed generating ${fmt} at ${na}x${nb}`)
    assert(res.filename.includes(`${na}x${nb}`), `Filename ${res.filename} does not contain ${na}x${nb}`)
  }
}
console.log('✓ PASS: Independent Na x Nb in-plane supercell generation verified across all 6 formats')
passedCount++

// Test 5: Strict Vacuum Centering (z = 0.50)
for (const vac of [15, 20, 25]) {
  const res = generateSupercellExport(testAllotrope, 'poscar', { na: 2, nb: 2, vacuum: vac })
  const lines = res.content.split('\n')
  const cVectorZ = parseFloat(lines[4].trim().split(/\s+/)[2])
  assert(Math.abs(cVectorZ - vac) < 0.01, `POSCAR vacuum height ${cVectorZ} does not match requested ${vac} Å`)

  // Check fractional z coordinates of atoms are centered around 0.50
  const coordLines = lines.slice(8).filter(l => l.trim().length > 0)
  const zCoords = coordLines.map(l => parseFloat(l.trim().split(/\s+/)[2]))
  const zMean = zCoords.reduce((a, b) => a + b, 0) / zCoords.length
  assert(Math.abs(zMean - 0.50) < 0.05, `Monolayer atoms not centered at z = 0.50 (z_mean = ${zMean}) with vacuum = ${vac} Å`)
}
console.log('✓ PASS: Strict vacuum thickness (15, 20, 25 Å) and z = 0.50 centering verified')
passedCount++

// Test 6: SIESTA .fdf Format with Pulay Mixing and Fractional Coordinates
const fdfRes = generateSupercellExport(testAllotrope, 'fdf', { na: 1, nb: 1, vacuum: 20 })
assert(/DM\.MixingWeight\s+0\.04/.test(fdfRes.content), 'SIESTA .fdf must contain DM.MixingWeight 0.04')
assert(/DM\.NumberPulay\s+5/.test(fdfRes.content), 'SIESTA .fdf must contain DM.NumberPulay 5')
assert(fdfRes.content.includes('AtomicCoordinatesFormat Fractional'), 'SIESTA .fdf must contain AtomicCoordinatesFormat Fractional')
assert(fdfRes.content.includes('%block LatticeVectors'), 'SIESTA .fdf must contain LatticeVectors block')
assert(fdfRes.content.includes('%block AtomicCoordinatesAndAtomicSpecies'), 'SIESTA .fdf must contain AtomicCoordinates block')
console.log('✓ PASS: SIESTA .fdf format complies strictly with Pulay mixing and fractional coordinate rules')
passedCount++

// Test 7: ML Two-Regime Benchmarks
assert(ML_BENCHMARKS.regimes.regime_1_topological, 'Regime 1 must exist')
assert(ML_BENCHMARKS.regimes.regime_2_relaxed, 'Regime 2 must exist')
const r1Best = ML_BENCHMARKS.regimes.regime_1_topological.models.RandomForest
const r2Best = ML_BENCHMARKS.regimes.regime_2_relaxed.models.GradientBoosting
assert(r1Best.overall_r2 < 0.10, `Regime 1 R² must reflect topological isomer degeneracy (R² = ${r1Best.overall_r2})`)
assert(r2Best.overall_r2 > 0.85, `Regime 2 R² must exceed 0.85 with orthogonal physical features (R² = ${r2Best.overall_r2})`)
assert(r2Best.overall_mae_ev < 0.035, `Regime 2 MAE must be below 0.035 eV/atom (MAE = ${r2Best.overall_mae_ev})`)
console.log(`✓ PASS: ML two-regime benchmark verified: Regime 1 (R² = ${r1Best.overall_r2}) vs Regime 2 (R² = ${r2Best.overall_r2}, MAE = ${r2Best.overall_mae_ev} eV/atom)`)
passedCount++

// Test 8: Topological Invariants Invariance and Physical Bounds
for (const item of masterCatalog) {
  const inv = item.topologicalInvariants
  assert(inv, `Missing topological invariants for ${item.id}`)
  assert(inv.mu2 >= 0, `Lenosky ring variance μ₂ must be ≥ 0 (got ${inv.mu2} for ${item.id})`)
  assert(inv.ringEntropy >= 0, `Shannon ring entropy must be ≥ 0 (got ${inv.ringEntropy} for ${item.id})`)
  assert(inv.areaPerAtom > 1.5 && inv.areaPerAtom < 5.0, `Areal atomic density out of bounds: ${inv.areaPerAtom} for ${item.id}`)
}
console.log('✓ PASS: Physical descriptors (μ₂, S_ring, A_atom) verified strictly non-negative and well-bounded')
passedCount++

console.log('='.repeat(80))
console.log(`  ALL ${passedCount} SCIENTIFIC INTEGRITY AUDIT PHASES PASSED WITH 100% SUCCESS`)
console.log('='.repeat(80))
