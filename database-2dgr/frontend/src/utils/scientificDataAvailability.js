/**
 * Scientific Data Availability & Provenance Model
 * Carbon Atlas - 2D Scientific Materials Database
 * 
 * Dynamically distinguishes:
 * - Imported / Literature Ground State Geometry
 * - Literature-Reported Properties
 * - Geometrically Derived Descriptors
 * - Verified First-Principles DFT Calculations
 * - Machine Learning / Model Predictions
 * - Unperformed / Pending Calculations
 */

export const DATA_ORIGIN = {
  LITERATURE_REPORTED: 'literature_reported',
  DERIVED_GEOMETRY: 'derived_geometry',
  COMPUTED_DFT: 'computed_dft',
  PREDICTED_ML: 'predicted_ml',
  NOT_CALCULATED: 'not_calculated'
}

export function computeArealDensityMgM2(natoms, planarAreaA2) {
  if (!natoms || !planarAreaA2 || planarAreaA2 <= 0) return null
  // 1 C atom = 12.011 amu = 1.9944e-26 kg
  // Area = A * 1e-20 m^2
  // sigma = (N * 1.9944e-6) / A kg/m^2 = (N / A) * 1.9944 mg/m^2
  return (natoms / planarAreaA2) * 1.99441
}

export function computeDidacticSupercells(a, b, gammaDeg = 90) {
  const rad = (gammaDeg * Math.PI) / 180
  const projA = Number(a) || 5.0
  const projB = (Number(b) || 5.0) * Math.sin(rad)
  const ratio = projA / Math.max(projB, 0.1)

  let didactic = [2, 2]
  let reason = 'Balanced 2×2 isotropic repeat'

  if (ratio >= 2.4) {
    didactic = [1, 3]
    reason = `Aspect ratio a/b≈${ratio.toFixed(1)}: 1×3 repeat creates a proportional square sheet`
  } else if (ratio >= 1.6) {
    didactic = [1, 2]
    reason = `Aspect ratio a/b≈${ratio.toFixed(1)}: 1×2 repeat creates a proportional sheet`
  } else if (ratio <= 0.42) {
    didactic = [3, 1]
    reason = `Aspect ratio b/a≈${(1 / ratio).toFixed(1)}: 3×1 repeat creates a proportional square sheet`
  } else if (ratio <= 0.62) {
    didactic = [2, 1]
    reason = `Aspect ratio b/a≈${(1 / ratio).toFixed(1)}: 2×1 repeat creates a proportional sheet`
  }

  const standardOptions = [
    { label: '1×1', dim: [1, 1], tag: 'Unit Cell' },
    { label: `${didactic[0]}×${didactic[1]}`, dim: didactic, tag: '★ Proportional', reason },
    { label: '2×2', dim: [2, 2], tag: 'Standard' },
    { label: '1×2', dim: [1, 2], tag: 'b-repeat' },
    { label: '2×1', dim: [2, 1], tag: 'a-repeat' },
    { label: '1×3', dim: [1, 3], tag: '3b' },
    { label: '3×1', dim: [3, 1], tag: '3a' },
    { label: '3×3', dim: [3, 3], tag: 'Large' }
  ]

  // Deduplicate options if didactic happens to match 2x2 or 1x1
  const seen = new Set()
  const uniqueOptions = []
  for (const opt of standardOptions) {
    const key = `${opt.dim[0]}x${opt.dim[1]}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueOptions.push(opt)
    }
  }

  return {
    ratio,
    didactic,
    reason,
    options: uniqueOptions
  }
}

export function getScientificDataCoverage(allotrope) {
  const isPhoth = !allotrope || allotrope.id === 'photh_graphene' || allotrope.id === 'photh'

  const natoms = allotrope?.natoms || (Array.isArray(allotrope?.atoms) ? allotrope.atoms.length : (isPhoth ? 10 : 2))
  const energy = allotrope?.energy != null ? allotrope.energy : allotrope?.delta_e_ev_per_atom

  return {
    isPhoth,
    domains: {
      structure: {
        title: 'Structure & Crystallography',
        description: 'Lattice vectors, Wyckoff site coordinates, plane groups, and cycle topology.',
        items: [
          {
            id: 'relaxed_geometry',
            name: 'Unit Cell Geometry & Atomic Coordinates',
            status: 'available',
            origin: DATA_ORIGIN.LITERATURE_REPORTED,
            originLabel: 'Literature Ground State CIF',
            provenance: 'Girão et al., Carbon 203 (2023) 611-619; Mendeley Data V2, DOI: 10.17632/fs42cypny7.2',
            value: allotrope?.lattice ? `a=${Number(allotrope.lattice.a).toFixed(3)} Å, b=${Number(allotrope.lattice.b).toFixed(3)} Å` : 'Resolved'
          },
          {
            id: 'wyckoff_partition',
            name: 'Wyckoff Symmetry Partitioning',
            status: 'derived',
            origin: DATA_ORIGIN.DERIVED_GEOMETRY,
            originLabel: 'Symmetry Analysis',
            provenance: `Space Group ${allotrope?.space_group_symbol || 'Pmm2'}, 2D Wallpaper ${allotrope?.wallpaper_group || 'pmm'}`,
            value: `${allotrope?.atoms?.length || natoms} atoms partitioned`
          },
          {
            id: 'cycle_topology',
            name: 'Elementary Ring Topology',
            status: 'derived',
            origin: DATA_ORIGIN.DERIVED_GEOMETRY,
            originLabel: 'Cycle Basis Embedding',
            provenance: 'Macmillan–Girão Embedding Tensor / Graph Topology',
            value: allotrope?.rings ? Object.entries(allotrope.rings).map(([k, v]) => `${k}-Ring (×${v})`).join(', ') : 'Hexagonal sp²'
          },
          {
            id: 'areal_mass_density',
            name: '2D Areal Mass Density',
            status: 'derived',
            origin: DATA_ORIGIN.DERIVED_GEOMETRY,
            originLabel: 'Physical Formulation (mg/m²)',
            provenance: 'σ = (N_atoms · m_C) / A_cell',
            value: allotrope?.planar_area_angstrom2 ? `${computeArealDensityMgM2(natoms, Number(allotrope.planar_area_angstrom2)).toFixed(3)} mg/m²` : '~0.76 mg/m²'
          }
        ]
      },
      electronic: {
        title: 'Electronic Structure & Charges',
        description: 'First-principles eigenvalues, band dispersion, Bader charge transfer, and CDD.',
        items: [
          {
            id: 'pbe_bands',
            name: 'PBE Electronic Band Dispersion',
            status: isPhoth ? 'available' : 'not_calculated',
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : DATA_ORIGIN.NOT_CALCULATED,
            originLabel: isPhoth ? 'VASP GGA-PBE (100 k-points)' : 'Not Calculated',
            provenance: isPhoth ? 'VASP 5.4.4, PAW-PBE ground state' : 'Requires converged non-SCF electronic run'
          },
          {
            id: 'hse06_bands',
            name: 'HSE06 Screened Hybrid Corrections',
            status: isPhoth ? 'available' : 'not_calculated',
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : DATA_ORIGIN.NOT_CALCULATED,
            originLabel: isPhoth ? 'HSE06 (ω=0.2 Å⁻¹, HF=25%)' : 'Not Calculated',
            provenance: isPhoth ? 'Hybrid density functional eigenvalue grid' : 'Requires hybrid functional run'
          },
          {
            id: 'bader_charges',
            name: 'Henkelman Grid Bader Charge Transfer',
            status: isPhoth ? 'available' : 'not_calculated',
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : DATA_ORIGIN.NOT_CALCULATED,
            originLabel: isPhoth ? 'Grid Bader Partitioning' : 'Not Calculated',
            provenance: isPhoth ? 'Henkelman Group Bader code on CHGCAR' : 'Requires total electron charge density (CHGCAR)'
          },
          {
            id: 'cdd_slices',
            name: '3D Charge Density Difference (CDD)',
            status: isPhoth ? 'available' : 'not_calculated',
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : DATA_ORIGIN.NOT_CALCULATED,
            originLabel: isPhoth ? 'Δρ = ρ_strained - ρ_unstrained' : 'Not Calculated',
            provenance: isPhoth ? 'Volumetric FFT grid difference' : 'Requires strained CHGCAR series'
          }
        ]
      },
      mechanical: {
        title: 'Mechanical & Elastic Response',
        description: '2D stress-strain responses, in-plane elastic moduli, and formation energetics.',
        items: [
          {
            id: 'formation_energy',
            name: 'Formation Energy ΔE (eV/atom)',
            status: energy != null ? 'available' : 'not_calculated',
            origin: DATA_ORIGIN.LITERATURE_REPORTED,
            originLabel: 'Reported in Literature',
            provenance: 'PBE-D3 ground state relaxation relative to pristine graphene',
            value: energy != null ? `+${Number(energy).toFixed(3)} eV/atom` : 'Not Reported'
          },
          {
            id: 'strain_series',
            name: '21-Point Dynamic Strain Basins',
            status: isPhoth ? 'available' : 'not_calculated',
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : DATA_ORIGIN.NOT_CALCULATED,
            originLabel: isPhoth ? 'Biaxial & Uniaxial ε ∈ [-3%, +3%]' : 'Not Calculated',
            provenance: isPhoth ? 'DFT ionic relaxation under fixed strain tensor' : 'Requires strained DFT energy series'
          },
          {
            id: 'elastic_modulus',
            name: 'In-Plane Stiffness / Young’s Modulus',
            status: isPhoth ? 'available' : (allotrope?.c11 ? 'available' : 'predicted_ml'),
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : (allotrope?.c11 ? DATA_ORIGIN.LITERATURE_REPORTED : DATA_ORIGIN.PREDICTED_ML),
            originLabel: isPhoth ? 'DFT Stress-Strain Tensor' : (allotrope?.c11 ? 'Literature Value' : 'GNN Benchmark Model'),
            provenance: isPhoth ? 'Second derivative of strain energy basin' : 'Machine learning predicted from topological graph'
          }
        ]
      },
      catalysis: {
        title: 'Catalysis & Chemisorption',
        description: 'Hydrogen evolution reaction free energies (ΔG_H*) and preferential active sites.',
        items: [
          {
            id: 'her_free_energy',
            name: 'HER Chemisorption Free Energy ΔG_H*',
            status: isPhoth ? 'available' : 'not_calculated',
            origin: isPhoth ? DATA_ORIGIN.COMPUTED_DFT : DATA_ORIGIN.NOT_CALCULATED,
            originLabel: isPhoth ? 'ΔG_H* with ZPE & Entropy' : 'Not Calculated',
            provenance: isPhoth ? 'E(slab+H) - E(slab) - 1/2 E(H2) + ΔZPE - TΔS' : 'Requires H-adsorbed slab relaxation'
          },
          {
            id: 'adsorption_sites',
            name: 'Geometric Preferential Chemisorption Sites',
            status: 'derived',
            origin: DATA_ORIGIN.DERIVED_GEOMETRY,
            originLabel: 'Topological Coordination & POAV1',
            provenance: 'Haddon pyramidalization angle & ring vertex classification',
            value: `${allotrope?.atoms?.length || natoms} candidate sites`
          }
        ]
      }
    }
  }
}
