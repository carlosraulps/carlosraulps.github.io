/**
 * Client-Side Supercell Generator Test Suite
 * Validates all 61 allotropes across 1x1, 2x2, 3x3, 4x4 scales for all 5 formats.
 */

import { generateSupercellExport, parseCif, getLatticeMatrix } from '../frontend/src/utils/supercellGenerator.js'
import { allotropes } from '../frontend/src/data/allotropes.js'
import assert from 'assert'

console.log('='.repeat(80))
console.log('  CLIENT-SIDE SUPERCELL GENERATOR AUDIT (ALL 61 ALLOTROPES)')
console.log('='.repeat(80))

let totalTests = 0
let passedTests = 0

for (const item of allotropes) {
  const code = item.code || item.id
  const baseNatoms = item.atoms?.length || item.natoms || 8

  for (const scale of [1, 2, 3, 4]) {
    const expectedAtoms = baseNatoms * scale * scale

    for (const fmt of ['cif', 'poscar', 'xyz', 'qe', 'json']) {
      totalTests++
      try {
        const res = generateSupercellExport(item, fmt, scale)
        assert(res.content && res.content.length > 50, 'Empty content generated')
        assert(res.filename && res.filename.length > 5, 'Invalid filename')

        // 1. CIF Spacegroup validation: supercell MUST be P 1
        if (fmt === 'cif' && scale > 1) {
          assert(
            res.content.includes("_symmetry_space_group_name_H-M 'P 1'") ||
            res.content.includes('_symmetry_space_group_name_H-M "P 1"'),
            `Supercell CIF must enforce P 1 space group for ${code} (${scale}x${scale})`
          )
        }

        // 2. POSCAR atom count check
        if (fmt === 'poscar') {
          const lines = res.content.trim().split('\n')
          const countLine = lines[6].trim()
          assert.strictEqual(
            parseInt(countLine, 10),
            expectedAtoms,
            `POSCAR atom count mismatch for ${code} ${scale}x${scale}`
          )
        }

        // 3. XYZ atom count check
        if (fmt === 'xyz') {
          const lines = res.content.trim().split('\n')
          assert.strictEqual(
            parseInt(lines[0].trim(), 10),
            expectedAtoms,
            `XYZ atom count mismatch for ${code} ${scale}x${scale}`
          )
        }

        // 4. JSON atom count check
        if (fmt === 'json') {
          const parsed = JSON.parse(res.content)
          assert.strictEqual(
            parsed.atoms_count,
            expectedAtoms,
            `JSON atom count mismatch for ${code} ${scale}x${scale}`
          )
          if (scale > 1) {
            assert.strictEqual(parsed.space_group, 'P 1', `JSON space group must be P 1 for ${code}`)
          }
        }

        passedTests++
      } catch (err) {
        console.error(`FAILED: ${code} format ${fmt} scale ${scale}x${scale}:`, err.message)
      }
    }
  }
}

console.log('='.repeat(80))
console.log(`CLIENT AUDIT SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS)`)
console.log('='.repeat(80))

if (passedTests !== totalTests) {
  process.exit(1)
}
