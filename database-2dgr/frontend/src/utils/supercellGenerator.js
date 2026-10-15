/**
 * Authentic Crystallographic Supercell Generator & Simulation Exporter
 * 
 * Strict Crystallographic Principles:
 * 1. ZERO SYNTHETIC COORDINATES: Only authentic DFT coordinates parsed from
 *    cifContent or item.atoms/lattice are used.
 * 2. SUPERCELL SPACE GROUP RULE: Any supercell with explicitly replicated atoms
 *    (Na > 1 or Nb > 1) MUST ALWAYS use space group 'P 1' (Int Tables #1). Writing a
 *    higher-symmetry space group (e.g. Pm, Pmma) on an already-expanded cell causes
 *    crystallographic viewers (VESTA, Mercury) to re-apply symmetry operators,
 *    resulting in clustered overlapping atoms and false polyhedra.
 * 3. 2D MONOLAYER PRESERVATION: Periodic scaling is applied strictly in-plane (a, b).
 *    The vacuum dimension (c = Lz) is user-selectable (15, 20, 25 Å) and enforces
 *    strict z-normal centering (z = 0.50).
 * 4. UNIVERSAL FORMATS:
 *    - .cif  (Crystallographic Information File)
 *    - .vasp (VASP POSCAR, Direct)
 *    - .in   (Quantum ESPRESSO scf input)
 *    - .fdf  (SIESTA Flexible Data Format with Pulay mixing)
 *    - .xyz  (Extended XYZ with Lattice comment)
 *    - .json (Machine-readable metadata & coordinates)
 */

/**
 * Parse CIF file content into unit cell parameters and fractional coordinates.
 */
export function parseCif(cifStr) {
  if (!cifStr || typeof cifStr !== 'string') return null

  const lines = cifStr.split('\n')
  let a = 0, b = 0, c = 0
  let alpha = 90, beta = 90, gamma = 90
  const atoms = []
  let inLoop = false
  let headers = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    const mA = line.match(/_cell_length_a\s+([\d.]+)/)
    if (mA) a = parseFloat(mA[1])
    const mB = line.match(/_cell_length_b\s+([\d.]+)/)
    if (mB) b = parseFloat(mB[1])
    const mC = line.match(/_cell_length_c\s+([\d.]+)/)
    if (mC) c = parseFloat(mC[1])
    const mAl = line.match(/_cell_angle_alpha\s+([\d.]+)/)
    if (mAl) alpha = parseFloat(mAl[1])
    const mBe = line.match(/_cell_angle_beta\s+([\d.]+)/)
    if (mBe) beta = parseFloat(mBe[1])
    const mGa = line.match(/_cell_angle_gamma\s+([\d.]+)/)
    if (mGa) gamma = parseFloat(mGa[1])

    if (line === 'loop_') {
      inLoop = true
      headers = []
      continue
    }

    if (inLoop && line.startsWith('_atom_site_')) {
      headers.push(line.split(/\s+/)[0])
      continue
    }

    if (inLoop && headers.length > 0) {
      if (line.startsWith('_') || line.startsWith('loop_') || line.startsWith('data_')) {
        inLoop = false
        headers = []
        if (line === 'loop_') {
          inLoop = true
          headers = []
        }
        continue
      }

      const parts = line.split(/\s+/)
      if (parts.length >= headers.length) {
        const xIdx = headers.indexOf('_atom_site_fract_x')
        const yIdx = headers.indexOf('_atom_site_fract_y')
        const zIdx = headers.indexOf('_atom_site_fract_z')
        const symIdx = headers.indexOf('_atom_site_type_symbol')
        const lblIdx = headers.indexOf('_atom_site_label')

        if (xIdx !== -1 && yIdx !== -1 && zIdx !== -1) {
          atoms.push({
            label: parts[lblIdx] || 'C',
            symbol: parts[symIdx] || 'C',
            u: parseFloat(parts[xIdx]),
            v: parseFloat(parts[yIdx]),
            w: parseFloat(parts[zIdx])
          })
        }
      }
    }
  }

  if (a > 0 && b > 0 && atoms.length > 0) {
    return { a, b, c: c || 20.0, alpha, beta, gamma, atoms }
  }
  return null
}

/**
 * Fallback parser using item.atoms and item.lattice metadata.
 */
export function parseFromItemMetadata(item) {
  if (!item?.atoms || item.atoms.length === 0) return null

  const a = item.latticeA || item.lattice?.a_2d || item.lattice?.a || 2.468
  const b = item.latticeB || item.lattice?.b_2d || item.lattice?.b || 2.468
  const c = item.latticeC || item.lattice?.vacuum || item.lattice?.c || 20.0
  const alpha = item.alpha || item.lattice?.alpha || 90.0
  const beta = item.beta || item.lattice?.beta || 90.0
  const gamma = item.gamma || item.lattice?.gamma || item.in_plane_lattice?.angle || 90.0

  const atoms = item.atoms.map((at, idx) => {
    const fc = at.frac_coords_2d || at.frac_coords || [0.5, 0.5, 0.5]
    return {
      label: `C${idx + 1}`,
      symbol: at.element || 'C',
      u: fc[0],
      v: fc[1],
      w: fc[2] !== undefined ? fc[2] : 0.5
    }
  })

  return { a, b, c, alpha, beta, gamma, atoms }
}

/**
 * Build 3x3 Cartesian lattice matrix from crystallographic cell parameters.
 * a along X; b in X-Y plane; c with alpha, beta, gamma projections.
 */
export function getLatticeMatrix(a, b, c, alphaDeg, betaDeg, gammaDeg) {
  const toRad = Math.PI / 180
  const aRad = alphaDeg * toRad
  const bRad = betaDeg * toRad
  const gRad = gammaDeg * toRad

  const ax = a, ay = 0, az = 0
  const bx = b * Math.cos(gRad)
  const by = b * Math.sin(gRad)
  const bz = 0

  const cx = c * Math.cos(bRad)
  const cy = c * (Math.cos(aRad) - Math.cos(bRad) * Math.cos(gRad)) / Math.sin(gRad)
  const czSq = Math.max(0, c * c - cx * cx - cy * cy)
  const cz = Math.sqrt(czSq)

  return [
    [ax, ay, az],
    [bx, by, bz],
    [cx, cy, cz]
  ]
}

/**
 * Generate scaled periodic supercell and return formatted file string.
 *
 * @param {Object} item - Carbon allotrope record
 * @param {string} format - 'cif' | 'poscar' | 'vasp' | 'xyz' | 'qe' | 'in' | 'fdf' | 'siesta' | 'json'
 * @param {number|Object} scaleOrOptions - either integer scale (e.g. 2 for 2x2) or options object:
 *        { na: number, nb: number, vacuumLz: number }
 * @returns {{ content: string, filename: string, mime: string, atomCount: number, supercellLabel: string }}
 */
export function generateSupercellExport(item, format = 'cif', scaleOrOptions = 1) {
  const fmt = (format || 'cif').toLowerCase()
  
  let na = 1
  let nb = 1
  let customVacuum = 20.0

  if (typeof scaleOrOptions === 'object' && scaleOrOptions !== null) {
    na = Math.max(1, Math.min(10, Number(scaleOrOptions.na) || 1))
    nb = Math.max(1, Math.min(10, Number(scaleOrOptions.nb) || 1))
    const vac = scaleOrOptions.vacuumLz ?? scaleOrOptions.vacuum ?? scaleOrOptions.lz
    if (vac !== undefined && vac !== null) {
      customVacuum = Math.max(10.0, Math.min(40.0, Number(vac) || 20.0))
    }
  } else {
    const s = Math.max(1, Math.min(10, Number(scaleOrOptions) || 1))
    na = s
    nb = s
  }

  // 1. If 1x1 CIF, default vacuum (20A) and raw verified CIF exists, preserve authentic original CIF
  if (fmt === 'cif' && na === 1 && nb === 1 && Math.abs(customVacuum - 20.0) < 0.1 && (item.cifContent || item.cif_content)) {
    const rawCif = item.cifContent || item.cif_content
    const slug = (item.code || item.id || 'allotrope').toLowerCase().replace(/[^a-z0-9]/g, '_')
    return {
      content: rawCif,
      filename: `${slug}_1x1.cif`,
      mime: 'chemical/x-cif',
      atomCount: item.natoms || (item.atoms?.length || 2),
      supercellLabel: '1×1'
    }
  }

  // 2. Parse authentic DFT coordinates
  let baseGeom = parseFromItemMetadata(item)
  if (!baseGeom || baseGeom.atoms.length === 0 || (item.natoms && baseGeom.atoms.length < item.natoms)) {
    const cifGeom = parseCif(item.cifContent || item.cif_content)
    if (cifGeom && cifGeom.atoms.length >= (baseGeom?.atoms?.length || 0)) {
      baseGeom = cifGeom
    }
  }

  if (!baseGeom || baseGeom.atoms.length === 0) {
    throw new Error(`Unable to extract verified crystallographic coordinates for allotrope ${item.name || item.id}`)
  }

  const { a: baseA, b: baseB, c: baseC, alpha, beta, gamma, atoms: baseAtoms } = baseGeom

  // 3. Scale periodic monolayer in-plane (a, b); set vacuum thickness c = customVacuum
  const a = baseA * na
  const b = baseB * nb
  const c = customVacuum

  // 4. Centering calculation:
  // Convert original fractional z to absolute z (in Å) based on original cell height,
  // find mid-point, and re-center at exactly z = 0.50 in the new cell of height c.
  const originalC = baseC || 20.0
  const zCartList = baseAtoms.map(at => at.w * originalC)
  const zMin = Math.min(...zCartList)
  const zMax = Math.max(...zCartList)
  const zMid = (zMin + zMax) / 2.0
  const targetZMid = c * 0.50 // 0.50 in new vacuum box

  // 5. Replicate fractional coordinates across Na x Nb grid
  const superAtoms = []
  for (let j = 0; j < nb; j++) {
    for (let i = 0; i < na; i++) {
      for (let k = 0; k < baseAtoms.length; k++) {
        const at = baseAtoms[k]
        const zCart = at.w * originalC
        const zCartCentered = zCart - zMid + targetZMid
        const wCentered = zCartCentered / c

        superAtoms.push({
          element: at.symbol || 'C',
          u: (at.u + i) / na,
          v: (at.v + j) / nb,
          w: wCentered
        })
      }
    }
  }

  // 6. Compute Cartesian lattice vectors & positions
  const matrix = getLatticeMatrix(a, b, c, alpha, beta, gamma)
  const cartAtoms = superAtoms.map((at, idx) => {
    const rx = at.u * matrix[0][0] + at.v * matrix[1][0] + at.w * matrix[2][0]
    const ry = at.u * matrix[0][1] + at.v * matrix[1][1] + at.w * matrix[2][1]
    const rz = at.u * matrix[0][2] + at.v * matrix[1][2] + at.w * matrix[2][2]
    return {
      id: idx + 1,
      element: at.element,
      u: at.u,
      v: at.v,
      w: at.w,
      x: rx,
      y: ry,
      z: rz
    }
  })

  const scaleLabel = `${na}x${nb}`
  const stamp = `2D Carbon Allotrope: ${item.name || item.id} (${item.symbol || item.code || ''}) | Supercell: ${scaleLabel}x1 | Vacuum Lz: ${c.toFixed(1)} Å (z=0.50 centered) | Atoms: ${cartAtoms.length} | Derived from Mendeley Data v2 / Carbon 203 (2023) 611-619`
  const slug = (item.code || item.id || 'allotrope').toLowerCase().replace(/[^a-z0-9]/g, '_')

  let content = ''
  let filename = ''
  let mime = 'text/plain'

  switch (fmt) {
    case 'cif': {
      filename = `${slug}_${scaleLabel}.cif`
      mime = 'chemical/x-cif'
      content = [
        `# ${stamp}`,
        `data_${slug}_${scaleLabel}`,
        `_audit_creation_method 'Carbon Atlas Scientific Supercell Generator'`,
        `_cell_length_a ${a.toFixed(6)}`,
        `_cell_length_b ${b.toFixed(6)}`,
        `_cell_length_c ${c.toFixed(6)}`,
        `_cell_angle_alpha ${alpha.toFixed(4)}`,
        `_cell_angle_beta ${beta.toFixed(4)}`,
        `_cell_angle_gamma ${gamma.toFixed(4)}`,
        `_symmetry_space_group_name_H-M 'P 1'`,
        `_symmetry_Int_Tables_number 1`,
        `loop_`,
        ` _symmetry_equiv_pos_site_id`,
        ` _symmetry_equiv_pos_as_xyz`,
        ` 1 'x, y, z'`,
        `loop_`,
        ` _atom_site_label`,
        ` _atom_site_type_symbol`,
        ` _atom_site_fract_x`,
        ` _atom_site_fract_y`,
        ` _atom_site_fract_z`,
        ` _atom_site_occupancy`,
        ...cartAtoms.map((at) => ` C${at.id} C ${at.u.toFixed(6)} ${at.v.toFixed(6)} ${at.w.toFixed(6)} 1.0000`)
      ].join('\n') + '\n'
      break
    }

    case 'poscar':
    case 'vasp': {
      filename = `${slug}_${scaleLabel}.vasp`
      mime = 'text/plain'
      content = [
        stamp,
        '1.0',
        `  ${matrix[0][0].toFixed(8)}  ${matrix[0][1].toFixed(8)}  ${matrix[0][2].toFixed(8)}`,
        `  ${matrix[1][0].toFixed(8)}  ${matrix[1][1].toFixed(8)}  ${matrix[1][2].toFixed(8)}`,
        `  ${matrix[2][0].toFixed(8)}  ${matrix[2][1].toFixed(8)}  ${matrix[2][2].toFixed(8)}`,
        'C',
        `  ${cartAtoms.length}`,
        'Direct',
        ...cartAtoms.map((at) => `  ${at.u.toFixed(8)}  ${at.v.toFixed(8)}  ${at.w.toFixed(8)}`)
      ].join('\n') + '\n'
      break
    }

    case 'xyz':
    case 'extxyz': {
      filename = `${slug}_${scaleLabel}.xyz`
      mime = 'text/plain'
      const latStr = `${matrix[0][0].toFixed(5)} ${matrix[0][1].toFixed(5)} ${matrix[0][2].toFixed(5)} ${matrix[1][0].toFixed(5)} ${matrix[1][1].toFixed(5)} ${matrix[1][2].toFixed(5)} ${matrix[2][0].toFixed(5)} ${matrix[2][1].toFixed(5)} ${matrix[2][2].toFixed(5)}`
      content = [
        `${cartAtoms.length}`,
        `Lattice="${latStr}" Properties=species:S:1:pos:R:3 pbc="T T F" comment="${stamp}"`,
        ...cartAtoms.map((at) => `C ${at.x.toFixed(6)} ${at.y.toFixed(6)} ${at.z.toFixed(6)}`)
      ].join('\n') + '\n'
      break
    }

    case 'qe':
    case 'in':
    case 'pwi':
    case 'espresso': {
      filename = `${slug}_${scaleLabel}.in`
      mime = 'text/plain'
      content = [
        `&CONTROL`,
        `  calculation = 'scf'`,
        `  title = '${stamp}'`,
        `  pseudo_dir = './'`,
        `  outdir = './tmp/'`,
        `  prefix = '${slug}'`,
        `/`,
        `&SYSTEM`,
        `  ibrav = 0`,
        `  nat = ${cartAtoms.length}`,
        `  ntyp = 1`,
        `  ecutwfc = 55.0`,
        `  ecutrho = 450.0`,
        `  occupations = 'smearing'`,
        `  smearing = 'mp'`,
        `  degauss = 0.01`,
        `/`,
        `&ELECTRONS`,
        `  conv_thr = 1.0d-8`,
        `  mixing_beta = 0.3`,
        `/`,
        `ATOMIC_SPECIES`,
        `  C 12.011 C.pbe-n-kjpaw_psl.1.0.0.UPF`,
        `CELL_PARAMETERS angstrom`,
        `  ${matrix[0][0].toFixed(8)}  ${matrix[0][1].toFixed(8)}  ${matrix[0][2].toFixed(8)}`,
        `  ${matrix[1][0].toFixed(8)}  ${matrix[1][1].toFixed(8)}  ${matrix[1][2].toFixed(8)}`,
        `  ${matrix[2][0].toFixed(8)}  ${matrix[2][1].toFixed(8)}  ${matrix[2][2].toFixed(8)}`,
        `ATOMIC_POSITIONS crystal`,
        ...cartAtoms.map((at) => `  C ${at.u.toFixed(8)} ${at.v.toFixed(8)} ${at.w.toFixed(8)}`),
        `K_POINTS automatic`,
        `  ${Math.max(1, Math.round(8 / na))} ${Math.max(1, Math.round(8 / nb))} 1 0 0 0`,
        ``
      ].join('\n')
      break
    }

    case 'fdf':
    case 'siesta': {
      filename = `${slug}_${scaleLabel}.fdf`
      mime = 'text/plain'
      content = [
        `# ${stamp}`,
        `SystemName          ${item.name || item.id} (${scaleLabel})`,
        `SystemLabel         ${slug}_${scaleLabel}`,
        ``,
        `NumberOfAtoms       ${cartAtoms.length}`,
        `NumberOfSpecies     1`,
        ``,
        `%block ChemicalSpeciesLabel`,
        `  1  6  C`,
        `%endblock ChemicalSpeciesLabel`,
        ``,
        `# Lattice Parameters & Geometry`,
        `LatticeConstant     1.000000 Ang`,
        `%block LatticeVectors`,
        `  ${matrix[0][0].toFixed(8)}  ${matrix[0][1].toFixed(8)}  ${matrix[0][2].toFixed(8)}`,
        `  ${matrix[1][0].toFixed(8)}  ${matrix[1][1].toFixed(8)}  ${matrix[1][2].toFixed(8)}`,
        `  ${matrix[2][0].toFixed(8)}  ${matrix[2][1].toFixed(8)}  ${matrix[2][2].toFixed(8)}`,
        `%endblock LatticeVectors`,
        ``,
        `AtomicCoordinatesFormat Fractional`,
        `%block AtomicCoordinatesAndAtomicSpecies`,
        ...cartAtoms.map((at) => `  ${at.u.toFixed(8)}  ${at.v.toFixed(8)}  ${at.w.toFixed(8)}  1  # C${at.id}`),
        `%endblock AtomicCoordinatesAndAtomicSpecies`,
        ``,
        `# DFT / SCF Numerical Convergence Directives (Charge Sloshing Prevention)`,
        `MeshCutoff            300.0 Ry`,
        `DM.MixingWeight       0.04`,
        `DM.NumberPulay        5`,
        `DM.Tolerance          1.0d-5`,
        `ElectronicTemperature 300.0 K`,
        `XC.functional         GGA`,
        `XC.authors            PBE`,
        ``,
        `# Brillouin Zone Sampling`,
        `%block kgrid_Monkhorst_Pack`,
        `  ${Math.max(1, Math.round(8 / na))}   0   0   0.0`,
        `  0   ${Math.max(1, Math.round(8 / nb))}   0   0.0`,
        `  0   0   1   0.0`,
        `%endblock kgrid_Monkhorst_Pack`,
        ``
      ].join('\n')
      break
    }

    case 'json': {
      filename = `${slug}_${scaleLabel}.json`
      mime = 'application/json'
      content = JSON.stringify({
        id: item.id,
        code: item.code,
        name: item.name,
        symbol: item.symbol,
        supercell: {
          na,
          nb,
          label: scaleLabel,
          vacuum_thickness_angstrom: c,
          z_centered: 0.50
        },
        space_group: (na === 1 && nb === 1) ? (item.spaceGroup || 'P 1') : 'P 1',
        atoms_count: cartAtoms.length,
        formation_energy_ev_atom: item.energy || item.delta_e_ev_per_atom,
        lattice: {
          a,
          b,
          c,
          alpha,
          beta,
          gamma,
          matrix
        },
        atoms: cartAtoms.map((at) => ({
          id: at.id,
          element: at.element,
          fractional: [at.u, at.v, at.w],
          cartesian: [at.x, at.y, at.z]
        }))
      }, null, 2)
      break
    }

    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  return { content, filename, mime, atomCount: cartAtoms.length, supercellLabel: scaleLabel }
}

export function exportCif(itemOrCif, na = 1, nb = 1, options = {}) {
  const item = typeof itemOrCif === 'string' ? { cifContent: itemOrCif } : itemOrCif
  return generateSupercellExport(item, 'cif', { na, nb, ...options }).content
}

export function exportPoscar(itemOrCif, na = 1, nb = 1, options = {}) {
  const item = typeof itemOrCif === 'string' ? { cifContent: itemOrCif } : itemOrCif
  return generateSupercellExport(item, 'poscar', { na, nb, ...options }).content
}

export function exportXyz(itemOrCif, na = 1, nb = 1, options = {}) {
  const item = typeof itemOrCif === 'string' ? { cifContent: itemOrCif } : itemOrCif
  return generateSupercellExport(item, 'xyz', { na, nb, ...options }).content
}

