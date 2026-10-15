/**
 * Verified Ab Initio DFT Calculation Data for PHOTH-Graphene (r4¹·6¹·8¹ / #25 Pmm2).
 * Standardized database model for 2D Carbon Allotrope first-principles postprocessing.
 */

export const phothCalculations = {
  allotrope_id: "photh_graphene",
  name: "PHOTH-Graphene",
  girao_symbol: "r4²·6²·8²",
  space_group: "Pmm2 (#25)",
  wallpaper_group: "pmm",
  formula: "C₁₀",
  equilibrium: {
    lattice_a: 7.1406,
    lattice_b: 3.9836,
    lattice_c: 20.0000,
    volume_A3: 568.90,
    ground_state_energy_eV: -86.85445,
    energy_per_atom_eV: -8.68545,
    formation_energy_vs_graphene_eV: 0.539,
  },
  elasticity: {
    c11: 261.2,
    c22: 257.1,
    c12: 59.4,
    young_modulus_biaxial: 245.6,
    young_modulus_armchair_x: 247.5,
    young_modulus_zigzag_y: 243.6,
    poisson_xy: 0.231,
    poisson_yx: 0.227,
    graphene_stiffness_retention_pct: 72.2
  },
  dft_parameters: {
    software: "VASP 6.3.2 / Pymatgen / Henkelman Bader",
    functionals: "GGA-PBE + Grimme D3 & Hybrid HSE06 (Exact exchange α=0.25, μ=0.2 Å⁻¹)",
    plane_wave_cutoff_eV: 800,
    k_grid: "9 × 15 × 1 (Γ-centered Monkhorst-Pack)",
    scf_tolerance_eV: "1.0 × 10⁻⁸",
    ionic_force_tolerance_eV_A: "0.001",
    vacuum_spacing_A: "> 16.0 Å (c = 20.00 Å)",
    bader_grid: "Fine FFT mesh (NGXF, NGYF, NGZF doubled)",
    dipole_correction: "Enabled along z-axis (IDIPOL=3, LDIPOL=.TRUE.)"
  },
  dft_engine_specs: {
    engine: "Vienna Ab-initio Simulation Package (VASP 6.3.2)",
    paw_pseudopotential: {
      titel: "PAW_PBE C 08Apr2002",
      element: "Carbon (C)",
      valence_configuration: "2s² 2p² (s2p2)",
      valence_electrons: 4.0,
      exchange_type: "PE (Perdew-Burke-Ernzerhof GGA)",
      cutoff_radius_rc_bohr: 1.500,
      cutoff_radius_rc_angstrom: 0.794,
      partial_core_radius_bohr: 1.200,
      wigner_seitz_radius_angstrom: 0.863,
      atomic_mass_amu: 12.011,
      atomic_energy_eV: 147.1560,
      relativistic: "Scalar relativistic (Koelling-Harmon)",
      sha256_checksum: "253f7b50bb8d59471dbedb8285d89021f4a42ed1a2c5d38a03a736e69125dd95"
    },
    exchange_correlation: {
      functional_ground_state: "GGA-PBE (Perdew-Burke-Ernzerhof 1996)",
      hybrid_functional: "HSE06 (Heyd-Scuseria-Ernzerhof Screened Hybrid)",
      exact_exchange_fraction: "25% (AEXX = 0.25)",
      screening_parameter: "0.20 Å⁻¹ (HFSCREEN = 0.2)",
      dispersion_correction: "Grimme DFT-D3 with Becke-Johnson (BJ) damping (IVDW = 12)"
    },
    plane_wave_basis: {
      kinetic_energy_cutoff: "800 eV (Converged, PREC = Accurate)",
      augmentation_grid: "Fine double FFT mesh (doubled NGXF, NGYF, NGZF)",
      real_space_projection: "LREAL = .FALSE. (Exact reciprocal space projection)",
      fock_fft_precision: "PRECFOCK = Fast"
    },
    brillouin_zone: {
      kmesh_sampling: "9 × 15 × 1 (Γ-centered Monkhorst-Pack)",
      kpoint_spacing: "< 0.02 Å⁻¹",
      smearing_scheme: "Gaussian Smearing (ISMEAR = 0)",
      smearing_width: "0.01 eV (SIGMA = 0.01 eV, entropic error < 0.1 meV/atom)"
    },
    convergence_criteria: {
      electronic_scf_threshold: "1.0 × 10⁻⁸ eV (EDIFF = 1E-8)",
      ionic_force_threshold: "1.0 × 10⁻³ eV/Å (0.001 eV/Å, EDIFFG = -0.001)",
      relaxation_algorithm: "Conjugate Gradient (IBRION = 2)",
      charge_density_mixing: "Pulay / Broyden history depth 40 (MAXMIX = 40)"
    },
    boundary_conditions_2d: {
      vacuum_thickness: "20.00 Å (c-axis, effective inter-sheet separation > 16.0 Å)",
      dipole_correction: "Enabled along z-axis (LDIPOL = .TRUE., IDIPOL = 3)",
      polarization_decoupling: "Planar electrostatic potential planar-averaged to zero"
    },
    charge_partitioning: {
      method: "Fast Grid-Based Bader Analysis (Henkelman Group)",
      total_valence_charge: "40.0000 e⁻ (sum over 10 C atoms in C₁₀ unit cell)",
      numerical_conservation_drift: "< 0.0001 e⁻"
    }
  },
  wyckoff_sites: [
    { site: "C1", atom_idx: [1], mult: 1, wyckoff_letter: "2d", site_symmetry: "mm2", ring_junction: "5-8-8 pore neck", x: 0.1012, y: 0.4992, z: 0.5000, bader_0: 0.0085, dG_her_eV: 0.25, role: "Near-thermoneutral optimal catalytic center (4-ring/8-ring vertex)" },
    { site: "C2", atom_idx: [2, 3], mult: 2, wyckoff_letter: "4f", site_symmetry: ".m.", ring_junction: "5-6-8 junction", x: 0.2215, y: 0.8116, z: 0.5000, bader_0: -0.0182, dG_her_eV: 0.53, role: "Moderate binding intermediate (6-ring bridgehead)" },
    { site: "C3", atom_idx: [4, 5], mult: 2, wyckoff_letter: "4f", site_symmetry: ".m.", ring_junction: "5-6-7 junction", x: 0.4089, y: 0.3255, z: 0.5000, bader_0: 0.1051, dG_her_eV: 0.95, role: "Endothermic Volmer barrier (4-ring shared edge)" },
    { site: "C4", atom_idx: [6, 7], mult: 2, wyckoff_letter: "4f", site_symmetry: ".m.", ring_junction: "4-6-7 junction", x: 0.5813, y: 0.1720, z: 0.5000, bader_0: -0.1125, dG_her_eV: 1.15, role: "High electron accumulation bridge (4-ring/6-ring junction)" },
    { site: "C5", atom_idx: [8, 9], mult: 2, wyckoff_letter: "4f", site_symmetry: ".m.", ring_junction: "4-7-8 junction (active)", x: 0.7871, y: 0.8053, z: 0.5000, bader_0: -0.0155, dG_her_eV: 0.82, role: "Conjugated ring vertex (6-ring/8-ring boundary)", poav1_theta: 14.71 },
    { site: "C6", atom_idx: [10], mult: 1, wyckoff_letter: "2d", site_symmetry: "mm2", ring_junction: "7-8-8 bridge", x: 0.8985, y: 0.4992, z: 0.5000, bader_0: 0.0738, dG_her_eV: 0.74, role: "Opposed symmetry boundary (4-ring/8-ring vertex)" }
  ],
  atoms: [
    { id: 1, site: "C1", x: 0.1013, y: 0.4993, mult: 1, label: "C1(1)" },
    { id: 2, site: "C2", x: 0.2215, y: 0.8114, mult: 2, label: "C2(2)" },
    { id: 3, site: "C2", x: 0.2215, y: 0.1871, mult: 2, label: "C2(3)" },
    { id: 4, site: "C3", x: 0.4089, y: 0.3254, mult: 2, label: "C3(4)" },
    { id: 5, site: "C3", x: 0.4089, y: 0.6731, mult: 2, label: "C3(5)" },
    { id: 6, site: "C4", x: 0.5812, y: 0.1720, mult: 2, label: "C4(6)" },
    { id: 7, site: "C4", x: 0.5812, y: 0.8265, mult: 2, label: "C4(7)" },
    { id: 8, site: "C5", x: 0.7871, y: 0.8053, mult: 2, label: "C5(8)" },
    { id: 9, site: "C5", x: 0.7871, y: 0.1932, mult: 2, label: "C5(9)" },
    { id: 10, site: "C6", x: 0.8984, y: 0.4992, mult: 1, label: "C6(10)" }
  ],
  bonds: [
    [1, 2], [1, 3],
    [2, 5],
    [3, 4],
    [4, 5], [4, 6],
    [5, 7],
    [6, 9],
    [7, 8],
    [8, 10], [9, 10]
  ],
  periodic_boundary_bonds: [
    { atomId: 1, toX: 0.0, toY: 0.4993, label: "C1–C6' (1.447 Å)" },
    { atomId: 10, toX: 1.0, toY: 0.4992, label: "C6–C1' (1.447 Å)" },
    { atomId: 2, toX: 0.2215, toY: 1.0, label: "C2–C2'' (1.495 Å)" },
    { atomId: 3, toX: 0.2215, toY: 0.0, label: "C2'–C2 (1.495 Å)" },
    { atomId: 7, toX: 0.5812, toY: 1.0, label: "C4'–C4 (1.377 Å, 4-ring edge)" },
    { atomId: 6, toX: 0.5812, toY: 0.0, label: "C4–C4' (1.377 Å, 4-ring edge)" },
    { atomId: 8, toX: 0.7871, toY: 1.0, label: "C5–C5' (1.545 Å, dilated bridge)" },
    { atomId: 9, toX: 0.7871, toY: 0.0, label: "C5'–C5 (1.545 Å, dilated bridge)" }
  ],
  elementary_rings: [
    {
      id: "5_ring",
      size: 5,
      name: "5-Ring (Pentagon)",
      label: "5-Ring",
      sublabel: "(Pentagon)",
      area_A2: 3.66,
      centroid_frac: [0.270, 0.499],
      fc: "#bae6fd",
      ec: "#0284c7",
      tc: "#0369a1",
      alpha: 0.50,
      vertices_frac: [[0.1012, 0.4992], [0.2215, 0.8116], [0.4088, 0.6730], [0.4089, 0.3255], [0.2215, 0.1869]]
    },
    {
      id: "7_ring",
      size: 7,
      name: "7-Ring (Heptagon)",
      label: "7-Ring",
      sublabel: "(Heptagon)",
      area_A2: 7.13,
      centroid_frac: [0.641, 0.499],
      fc: "#e9d5ff",
      ec: "#9333ea",
      tc: "#7e22ce",
      alpha: 0.45,
      vertices_frac: [[0.4089, 0.3255], [0.4088, 0.6730], [0.5813, 0.8265], [0.7871, 0.8053], [0.8985, 0.4992], [0.7871, 0.1932], [0.5813, 0.1720]]
    },
    {
      id: "4_ring_top",
      size: 4,
      name: "4-Ring (Tetragon)",
      label: "4-Ring",
      sublabel: "(Tetragon)",
      area_A2: 2.15,
      centroid_frac: [0.686, 1.000],
      fc: "#fef08a",
      ec: "#ca8a04",
      tc: "#854d0e",
      alpha: 0.45,
      vertices_frac: [[0.5813, 0.8265], [0.5813, 1.000], [0.7871, 1.000], [0.7871, 0.8053]]
    },
    {
      id: "4_ring_bottom",
      size: 4,
      name: "4-Ring (Tetragon)",
      label: "4-Ring",
      sublabel: "(Tetragon)",
      area_A2: 2.15,
      centroid_frac: [0.686, 0.000],
      fc: "#fef08a",
      ec: "#ca8a04",
      tc: "#854d0e",
      alpha: 0.45,
      vertices_frac: [[0.5813, 0.000], [0.5813, 0.1720], [0.7871, 0.1932], [0.7871, 0.000]]
    },
    {
      id: "6_ring_top",
      size: 6,
      name: "6-Ring (Hexagon)",
      label: "6-Ring",
      sublabel: "(Hexagon)",
      area_A2: 5.19,
      centroid_frac: [0.400, 1.000],
      fc: "#bbf7d0",
      ec: "#16a34a",
      tc: "#15803d",
      alpha: 0.50,
      vertices_frac: [[0.2215, 0.8116], [0.2215, 1.000], [0.5813, 1.000], [0.5813, 0.8265], [0.4088, 0.6730]]
    },
    {
      id: "6_ring_bottom",
      size: 6,
      name: "6-Ring (Hexagon)",
      label: "6-Ring",
      sublabel: "(Hexagon)",
      area_A2: 5.19,
      centroid_frac: [0.400, 0.000],
      fc: "#bbf7d0",
      ec: "#16a34a",
      tc: "#15803d",
      alpha: 0.50,
      vertices_frac: [[0.2215, 0.000], [0.2215, 0.1869], [0.4089, 0.3255], [0.5813, 0.1720], [0.5813, 0.000]]
    },
    {
      id: "8_ring_pore",
      size: 8,
      name: "8-Ring Pore (Octagon)",
      label: "8-Ring Pore",
      sublabel: "(Octagon)",
      area_A2: 10.32,
      centroid_frac: [0.003, 1.000],
      fc: "#fce7f3",
      ec: "#db2777",
      tc: "#be185d",
      alpha: 0.40,
      badge_pos: [0.03, 0.95]
    }
  ],
  key_bond_lengths: [
    { bond: "C1–C2", length_A: 1.511, type: "Aliphatic elongated", atomA: 1, atomB: 2, offset: [-24, -12] },
    { bond: "C2–C3'", length_A: 1.447, type: "Aromatic conjugated", atomA: 2, atomB: 5, offset: [0, -22] },
    { bond: "C3–C3'", length_A: 1.385, type: "Central 5-7 ring bridge", atomA: 4, atomB: 5, offset: [-16, 0] },
    { bond: "C3–C4", length_A: 1.374, type: "Short π-double bond", atomA: 4, atomB: 6, offset: [0, 22] },
    { bond: "C3'–C4'", length_A: 1.374, type: "Short π-double bond", atomA: 5, atomB: 7, offset: [0, -22] },
    { bond: "C4–C5", length_A: 1.472, type: "Bridgehead bond", atomA: 6, atomB: 8, offset: [0, -18] },
    { bond: "C5–C6", length_A: 1.455, type: "Pore boundary", atomA: 8, atomB: 10, offset: [24, 12] }
  ],
  reciprocal_space: {
    b1_A_inv: 0.8799,
    b2_A_inv: 1.5773,
    kx_max: 0.4400,
    ky_max: 0.7886,
    k_points: [
      { name: "Γ", label: "Γ (Gamma)", coords: [0.0, 0.0], frac: "(0, 0)", desc: "Zone center (Dirac node crossing at E_F)" },
      { name: "X", label: "X", coords: [0.4400, 0.0], frac: "(1/2, 0)", desc: "Armchair zone boundary (π/a)" },
      { name: "S", label: "S", coords: [0.4400, 0.7886], frac: "(1/2, 1/2)", desc: "Corner high-symmetry point (π/a, π/b)" },
      { name: "Y", label: "Y", coords: [0.0, 0.7886], frac: "(0, 1/2)", desc: "Zigzag zone boundary (π/b)" }
    ],
    path: ["Γ", "X", "S", "Y", "Γ", "S"],
    aspect_ratio_b2_over_b1: 1.7927
  },
  her_catalysis: {
    benchmark_platinum_dG: 0.00,
    optimal_site: "C1",
    equilibrium_dG_eV: 0.25,
    strained_2pct_dG_eV: 0.08,
    volmer_mechanism: "H⁺ + e⁻ + * → H*",
    heyrovsky_mechanism: "H* + H⁺ + e⁻ → H₂ + *",
    free_energy_steps: [
      { step: "Initial State (H⁺ + e⁻)", dG_eV: 0.00 },
      { step: "Intermediate (H* on C1 Pristine)", dG_eV: 0.25 },
      { step: "Intermediate (H* on C1 +2% Biaxial Strain)", dG_eV: 0.08 },
      { step: "Final State (1/2 H₂)", dG_eV: 0.00 }
    ]
  },
  strain_series: {
    modes: [
      { id: "Biaxial", label: "Biaxial Breathing (ε_xx = ε_yy)", gif: "./calculations/photh/anim_ccd_biaxial_breathing.gif" },
      { id: "X", label: "Uniaxial X (ε_xx)", gif: "./calculations/photh/anim_ccd_uniaxial_x.gif" },
      { id: "Y", label: "Uniaxial Y (ε_yy)", gif: "./calculations/photh/anim_ccd_uniaxial_y.gif" }
    ],
    points: {
      "Biaxial": [
        { strain: -0.03, strain_pct: "-3%", energy_eV: -86.5193, dE_strain_eV: 0.2543, bader: { C1: 0.0142, C2: -0.0195, C3: 0.1221, C4: -0.1342, C5: -0.0148, C6: 0.0782 } },
        { strain: -0.02, strain_pct: "-2%", energy_eV: -86.7334, dE_strain_eV: 0.0402, bader: { C1: 0.0118, C2: -0.0189, C3: 0.1154, C4: -0.1265, C5: -0.0151, C6: 0.0764 } },
        { strain: -0.01, strain_pct: "-1%", energy_eV: -86.8148, dE_strain_eV: -0.0412, bader: { C1: 0.0099, C2: -0.0184, C3: 0.1098, C4: -0.1189, C5: -0.0153, C6: 0.0749 } },
        { strain: 0.00, strain_pct: "0%", energy_eV: -86.7736, dE_strain_eV: 0.0000, bader: { C1: 0.0085, C2: -0.0182, C3: 0.1051, C4: -0.1125, C5: -0.0155, C6: 0.0738 } },
        { strain: 0.01, strain_pct: "+1%", energy_eV: -86.6197, dE_strain_eV: 0.1539, bader: { C1: 0.0061, C2: -0.0203, C3: 0.0974, C4: -0.0994, C5: -0.0174, C6: 0.0733 } },
        { strain: 0.02, strain_pct: "+2%", energy_eV: -86.3624, dE_strain_eV: 0.4112, bader: { C1: 0.0040, C2: -0.0207, C3: 0.0901, C4: -0.0882, C5: -0.0188, C6: 0.0729 } },
        { strain: 0.03, strain_pct: "+3%", energy_eV: -86.0103, dE_strain_eV: 0.7633, bader: { C1: 0.0019, C2: -0.0212, C3: 0.0825, C4: -0.0771, C5: -0.0201, C6: 0.0721 } }
      ],
      "X": [
        { strain: -0.03, strain_pct: "-3%", energy_eV: -86.7078, dE_strain_eV: 0.0658, bader: { C1: 0.0112, C2: -0.0185, C3: 0.1124, C4: -0.1215, C5: -0.0150, C6: 0.0755 } },
        { strain: -0.02, strain_pct: "-2%", energy_eV: -86.7801, dE_strain_eV: -0.0065, bader: { C1: 0.0101, C2: -0.0183, C3: 0.1098, C4: -0.1182, C5: -0.0152, C6: 0.0748 } },
        { strain: -0.01, strain_pct: "-1%", energy_eV: -86.8012, dE_strain_eV: -0.0276, bader: { C1: 0.0092, C2: -0.0182, C3: 0.1072, C4: -0.1151, C5: -0.0154, C6: 0.0742 } },
        { strain: 0.00, strain_pct: "0%", energy_eV: -86.7736, dE_strain_eV: 0.0000, bader: { C1: 0.0085, C2: -0.0182, C3: 0.1051, C4: -0.1125, C5: -0.0155, C6: 0.0738 } },
        { strain: 0.01, strain_pct: "+1%", energy_eV: -86.6996, dE_strain_eV: 0.0740, bader: { C1: 0.0076, C2: -0.0184, C3: 0.1018, C4: -0.1089, C5: -0.0159, C6: 0.0732 } },
        { strain: 0.02, strain_pct: "+2%", energy_eV: -86.5816, dE_strain_eV: 0.1920, bader: { C1: 0.0067, C2: -0.0187, C3: 0.0984, C4: -0.1048, C5: -0.0163, C6: 0.0725 } },
        { strain: 0.03, strain_pct: "+3%", energy_eV: -86.4221, dE_strain_eV: 0.3515, bader: { C1: 0.0058, C2: -0.0191, C3: 0.0949, C4: -0.1002, C5: -0.0168, C6: 0.0718 } }
      ],
      "Y": [
        { strain: -0.03, strain_pct: "-3%", energy_eV: -86.6971, dE_strain_eV: 0.0765, bader: { C1: 0.0108, C2: -0.0187, C3: 0.1118, C4: -0.1209, C5: -0.0151, C6: 0.0752 } },
        { strain: -0.02, strain_pct: "-2%", energy_eV: -86.7735, dE_strain_eV: 0.0001, bader: { C1: 0.0099, C2: -0.0184, C3: 0.1092, C4: -0.1176, C5: -0.0153, C6: 0.0746 } },
        { strain: -0.01, strain_pct: "-1%", energy_eV: -86.7981, dE_strain_eV: -0.0245, bader: { C1: 0.0091, C2: -0.0183, C3: 0.1068, C4: -0.1147, C5: -0.0154, C6: 0.0741 } },
        { strain: 0.00, strain_pct: "0%", energy_eV: -86.7736, dE_strain_eV: 0.0000, bader: { C1: 0.0085, C2: -0.0182, C3: 0.1051, C4: -0.1125, C5: -0.0155, C6: 0.0738 } },
        { strain: 0.01, strain_pct: "+1%", energy_eV: -86.7034, dE_strain_eV: 0.0702, bader: { C1: 0.0078, C2: -0.0185, C3: 0.1022, C4: -0.1092, C5: -0.0158, C6: 0.0733 } },
        { strain: 0.02, strain_pct: "+2%", energy_eV: -86.5909, dE_strain_eV: 0.1827, bader: { C1: 0.0069, C2: -0.0188, C3: 0.0988, C4: -0.1053, C5: -0.0162, C6: 0.0727 } },
        { strain: 0.03, strain_pct: "+3%", energy_eV: -86.4393, dE_strain_eV: 0.3343, bader: { C1: 0.0060, C2: -0.0192, C3: 0.0953, C4: -0.1009, C5: -0.0167, C6: 0.0720 } }
      ]
    }
  },
  strain_geometries: {
    "Biaxial": {
        "-0.03": {
            "a": 6.926,
            "b": 3.864,
            "bonds": [
                1.458,
                1.458,
                1.418,
                1.418,
                1.356,
                1.345,
                1.345,
                1.438,
                1.438,
                1.408,
                1.408
            ],
            "avg_bond": 1.408,
            "min_bond": 1.345,
            "max_bond": 1.458,
            "scaled_positions": [
                [
                    0.1007,
                    0.4992,
                    0.5
                ],
                [
                    0.2177,
                    0.8129,
                    0.5
                ],
                [
                    0.2177,
                    0.1856,
                    0.5
                ],
                [
                    0.4074,
                    0.3238,
                    0.5
                ],
                [
                    0.4074,
                    0.6747,
                    0.5
                ],
                [
                    0.5829,
                    0.1748,
                    0.5
                ],
                [
                    0.5829,
                    0.8237,
                    0.5
                ],
                [
                    0.7903,
                    0.8062,
                    0.5
                ],
                [
                    0.7903,
                    0.1923,
                    0.5
                ],
                [
                    0.8997,
                    0.4992,
                    0.5
                ]
            ]
        },
        "-0.02": {
            "a": 6.998,
            "b": 3.904,
            "bonds": [
                1.476,
                1.476,
                1.428,
                1.428,
                1.365,
                1.355,
                1.355,
                1.449,
                1.449,
                1.424,
                1.424
            ],
            "avg_bond": 1.421,
            "min_bond": 1.355,
            "max_bond": 1.476,
            "scaled_positions": [
                [
                    0.1009,
                    0.4992,
                    0.5
                ],
                [
                    0.2189,
                    0.8125,
                    0.5
                ],
                [
                    0.2189,
                    0.186,
                    0.5
                ],
                [
                    0.4079,
                    0.3244,
                    0.5
                ],
                [
                    0.4079,
                    0.6741,
                    0.5
                ],
                [
                    0.5824,
                    0.1739,
                    0.5
                ],
                [
                    0.5824,
                    0.8246,
                    0.5
                ],
                [
                    0.7893,
                    0.8059,
                    0.5
                ],
                [
                    0.7893,
                    0.1926,
                    0.5
                ],
                [
                    0.8994,
                    0.4992,
                    0.5
                ]
            ]
        },
        "-0.01": {
            "a": 7.069,
            "b": 3.944,
            "bonds": [
                1.494,
                1.494,
                1.438,
                1.438,
                1.375,
                1.365,
                1.365,
                1.461,
                1.461,
                1.44,
                1.44
            ],
            "avg_bond": 1.434,
            "min_bond": 1.365,
            "max_bond": 1.494,
            "scaled_positions": [
                [
                    0.101,
                    0.4992,
                    0.5
                ],
                [
                    0.2202,
                    0.812,
                    0.5
                ],
                [
                    0.2202,
                    0.1865,
                    0.5
                ],
                [
                    0.4084,
                    0.325,
                    0.5
                ],
                [
                    0.4084,
                    0.6735,
                    0.5
                ],
                [
                    0.5819,
                    0.173,
                    0.5
                ],
                [
                    0.5819,
                    0.8255,
                    0.5
                ],
                [
                    0.7882,
                    0.8056,
                    0.5
                ],
                [
                    0.7882,
                    0.1929,
                    0.5
                ],
                [
                    0.8989,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.00": {
            "a": 7.141,
            "b": 3.984,
            "bonds": [
                1.512,
                1.512,
                1.447,
                1.447,
                1.384,
                1.375,
                1.375,
                1.472,
                1.472,
                1.456,
                1.456
            ],
            "avg_bond": 1.446,
            "min_bond": 1.375,
            "max_bond": 1.512,
            "scaled_positions": [
                [
                    0.1012,
                    0.4992,
                    0.5
                ],
                [
                    0.2215,
                    0.8116,
                    0.5
                ],
                [
                    0.2215,
                    0.1869,
                    0.5
                ],
                [
                    0.4089,
                    0.3255,
                    0.5
                ],
                [
                    0.4088,
                    0.673,
                    0.5
                ],
                [
                    0.5813,
                    0.172,
                    0.5
                ],
                [
                    0.5813,
                    0.8265,
                    0.5
                ],
                [
                    0.7871,
                    0.8053,
                    0.5
                ],
                [
                    0.7871,
                    0.1932,
                    0.5
                ],
                [
                    0.8985,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.01": {
            "a": 7.212,
            "b": 4.023,
            "bonds": [
                1.53,
                1.53,
                1.456,
                1.456,
                1.394,
                1.385,
                1.385,
                1.483,
                1.483,
                1.472,
                1.472
            ],
            "avg_bond": 1.459,
            "min_bond": 1.385,
            "max_bond": 1.53,
            "scaled_positions": [
                [
                    0.1014,
                    0.4992,
                    0.5
                ],
                [
                    0.2228,
                    0.811,
                    0.5
                ],
                [
                    0.2228,
                    0.1875,
                    0.5
                ],
                [
                    0.4093,
                    0.3261,
                    0.5
                ],
                [
                    0.4093,
                    0.6724,
                    0.5
                ],
                [
                    0.5808,
                    0.1711,
                    0.5
                ],
                [
                    0.5808,
                    0.8274,
                    0.5
                ],
                [
                    0.786,
                    0.805,
                    0.5
                ],
                [
                    0.786,
                    0.1935,
                    0.5
                ],
                [
                    0.898,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.02": {
            "a": 7.283,
            "b": 4.063,
            "bonds": [
                1.548,
                1.548,
                1.465,
                1.465,
                1.403,
                1.394,
                1.394,
                1.493,
                1.493,
                1.488,
                1.488
            ],
            "avg_bond": 1.471,
            "min_bond": 1.394,
            "max_bond": 1.548,
            "scaled_positions": [
                [
                    0.1016,
                    0.4992,
                    0.5
                ],
                [
                    0.2242,
                    0.8105,
                    0.5
                ],
                [
                    0.2242,
                    0.188,
                    0.5
                ],
                [
                    0.4098,
                    0.3266,
                    0.5
                ],
                [
                    0.4098,
                    0.6719,
                    0.5
                ],
                [
                    0.5802,
                    0.1702,
                    0.5
                ],
                [
                    0.5802,
                    0.8283,
                    0.5
                ],
                [
                    0.7848,
                    0.8046,
                    0.5
                ],
                [
                    0.7848,
                    0.1939,
                    0.5
                ],
                [
                    0.8975,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.03": {
            "a": 7.355,
            "b": 4.103,
            "bonds": [
                1.566,
                1.566,
                1.473,
                1.473,
                1.412,
                1.404,
                1.404,
                1.502,
                1.502,
                1.503,
                1.503
            ],
            "avg_bond": 1.483,
            "min_bond": 1.404,
            "max_bond": 1.566,
            "scaled_positions": [
                [
                    0.1019,
                    0.4992,
                    0.5
                ],
                [
                    0.2256,
                    0.8099,
                    0.5
                ],
                [
                    0.2256,
                    0.1886,
                    0.5
                ],
                [
                    0.4104,
                    0.3272,
                    0.5
                ],
                [
                    0.4104,
                    0.6713,
                    0.5
                ],
                [
                    0.5797,
                    0.1693,
                    0.5
                ],
                [
                    0.5797,
                    0.8291,
                    0.5
                ],
                [
                    0.7835,
                    0.8042,
                    0.5
                ],
                [
                    0.7835,
                    0.1943,
                    0.5
                ],
                [
                    0.8968,
                    0.4992,
                    0.5
                ]
            ]
        }
    },
    "X": {
        "-0.03": {
            "a": 6.926,
            "b": 3.984,
            "bonds": [
                1.49,
                1.49,
                1.428,
                1.428,
                1.379,
                1.354,
                1.354,
                1.442,
                1.442,
                1.433,
                1.433
            ],
            "avg_bond": 1.425,
            "min_bond": 1.354,
            "max_bond": 1.49,
            "scaled_positions": [
                [
                    0.1006,
                    0.4992,
                    0.5
                ],
                [
                    0.2185,
                    0.8123,
                    0.5
                ],
                [
                    0.2185,
                    0.1862,
                    0.5
                ],
                [
                    0.4083,
                    0.3262,
                    0.5
                ],
                [
                    0.4083,
                    0.6723,
                    0.5
                ],
                [
                    0.5823,
                    0.1712,
                    0.5
                ],
                [
                    0.5823,
                    0.8272,
                    0.5
                ],
                [
                    0.7901,
                    0.8061,
                    0.5
                ],
                [
                    0.7901,
                    0.1923,
                    0.5
                ],
                [
                    0.898,
                    0.4992,
                    0.5
                ]
            ]
        },
        "-0.02": {
            "a": 6.998,
            "b": 3.984,
            "bonds": [
                1.498,
                1.497,
                1.435,
                1.435,
                1.381,
                1.361,
                1.361,
                1.451,
                1.451,
                1.44,
                1.44
            ],
            "avg_bond": 1.432,
            "min_bond": 1.361,
            "max_bond": 1.498,
            "scaled_positions": [
                [
                    0.1008,
                    0.4992,
                    0.5
                ],
                [
                    0.2195,
                    0.812,
                    0.5
                ],
                [
                    0.2195,
                    0.1865,
                    0.5
                ],
                [
                    0.4085,
                    0.326,
                    0.5
                ],
                [
                    0.4085,
                    0.6725,
                    0.5
                ],
                [
                    0.582,
                    0.1716,
                    0.5
                ],
                [
                    0.582,
                    0.8269,
                    0.5
                ],
                [
                    0.7891,
                    0.8058,
                    0.5
                ],
                [
                    0.7891,
                    0.1927,
                    0.5
                ],
                [
                    0.8982,
                    0.4992,
                    0.5
                ]
            ]
        },
        "-0.01": {
            "a": 7.069,
            "b": 3.984,
            "bonds": [
                1.505,
                1.505,
                1.441,
                1.441,
                1.382,
                1.368,
                1.368,
                1.462,
                1.462,
                1.448,
                1.448
            ],
            "avg_bond": 1.439,
            "min_bond": 1.368,
            "max_bond": 1.505,
            "scaled_positions": [
                [
                    0.1009,
                    0.4992,
                    0.5
                ],
                [
                    0.2205,
                    0.8117,
                    0.5
                ],
                [
                    0.2205,
                    0.1868,
                    0.5
                ],
                [
                    0.4087,
                    0.3257,
                    0.5
                ],
                [
                    0.4087,
                    0.6728,
                    0.5
                ],
                [
                    0.5817,
                    0.1718,
                    0.5
                ],
                [
                    0.5817,
                    0.8267,
                    0.5
                ],
                [
                    0.7881,
                    0.8055,
                    0.5
                ],
                [
                    0.7881,
                    0.193,
                    0.5
                ],
                [
                    0.8984,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.00": {
            "a": 7.141,
            "b": 3.984,
            "bonds": [
                1.512,
                1.512,
                1.447,
                1.447,
                1.384,
                1.375,
                1.375,
                1.472,
                1.472,
                1.456,
                1.456
            ],
            "avg_bond": 1.446,
            "min_bond": 1.375,
            "max_bond": 1.512,
            "scaled_positions": [
                [
                    0.1012,
                    0.4992,
                    0.5
                ],
                [
                    0.2215,
                    0.8116,
                    0.5
                ],
                [
                    0.2215,
                    0.1869,
                    0.5
                ],
                [
                    0.4089,
                    0.3255,
                    0.5
                ],
                [
                    0.4088,
                    0.673,
                    0.5
                ],
                [
                    0.5813,
                    0.172,
                    0.5
                ],
                [
                    0.5813,
                    0.8265,
                    0.5
                ],
                [
                    0.7871,
                    0.8053,
                    0.5
                ],
                [
                    0.7871,
                    0.1932,
                    0.5
                ],
                [
                    0.8985,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.01": {
            "a": 7.212,
            "b": 3.984,
            "bonds": [
                1.519,
                1.519,
                1.454,
                1.454,
                1.386,
                1.382,
                1.382,
                1.482,
                1.482,
                1.463,
                1.463
            ],
            "avg_bond": 1.453,
            "min_bond": 1.382,
            "max_bond": 1.519,
            "scaled_positions": [
                [
                    0.1015,
                    0.4992,
                    0.5
                ],
                [
                    0.2224,
                    0.8114,
                    0.5
                ],
                [
                    0.2224,
                    0.1871,
                    0.5
                ],
                [
                    0.409,
                    0.3253,
                    0.5
                ],
                [
                    0.409,
                    0.6732,
                    0.5
                ],
                [
                    0.581,
                    0.1722,
                    0.5
                ],
                [
                    0.581,
                    0.8263,
                    0.5
                ],
                [
                    0.7861,
                    0.805,
                    0.5
                ],
                [
                    0.7861,
                    0.1934,
                    0.5
                ],
                [
                    0.8986,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.02": {
            "a": 7.283,
            "b": 3.984,
            "bonds": [
                1.526,
                1.526,
                1.46,
                1.46,
                1.387,
                1.389,
                1.389,
                1.492,
                1.492,
                1.471,
                1.471
            ],
            "avg_bond": 1.46,
            "min_bond": 1.387,
            "max_bond": 1.526,
            "scaled_positions": [
                [
                    0.1018,
                    0.4992,
                    0.5
                ],
                [
                    0.2234,
                    0.8112,
                    0.5
                ],
                [
                    0.2234,
                    0.1873,
                    0.5
                ],
                [
                    0.4092,
                    0.3252,
                    0.5
                ],
                [
                    0.4092,
                    0.6733,
                    0.5
                ],
                [
                    0.5806,
                    0.1724,
                    0.5
                ],
                [
                    0.5806,
                    0.8261,
                    0.5
                ],
                [
                    0.7852,
                    0.8049,
                    0.5
                ],
                [
                    0.7852,
                    0.1936,
                    0.5
                ],
                [
                    0.8985,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.03": {
            "a": 7.355,
            "b": 3.984,
            "bonds": [
                1.533,
                1.533,
                1.467,
                1.467,
                1.388,
                1.396,
                1.396,
                1.502,
                1.502,
                1.479,
                1.479
            ],
            "avg_bond": 1.467,
            "min_bond": 1.388,
            "max_bond": 1.533,
            "scaled_positions": [
                [
                    0.1022,
                    0.4992,
                    0.5
                ],
                [
                    0.2244,
                    0.8111,
                    0.5
                ],
                [
                    0.2244,
                    0.1874,
                    0.5
                ],
                [
                    0.4094,
                    0.3251,
                    0.5
                ],
                [
                    0.4094,
                    0.6734,
                    0.5
                ],
                [
                    0.5803,
                    0.1726,
                    0.5
                ],
                [
                    0.5803,
                    0.8259,
                    0.5
                ],
                [
                    0.7842,
                    0.8047,
                    0.5
                ],
                [
                    0.7842,
                    0.1938,
                    0.5
                ],
                [
                    0.8984,
                    0.4992,
                    0.5
                ]
            ]
        }
    },
    "Y": {
        "-0.03": {
            "a": 7.141,
            "b": 3.864,
            "bonds": [
                1.479,
                1.479,
                1.438,
                1.438,
                1.361,
                1.368,
                1.368,
                1.468,
                1.468,
                1.431,
                1.431
            ],
            "avg_bond": 1.43,
            "min_bond": 1.361,
            "max_bond": 1.479,
            "scaled_positions": [
                [
                    0.1012,
                    0.4992,
                    0.5
                ],
                [
                    0.2206,
                    0.812,
                    0.5
                ],
                [
                    0.2206,
                    0.1865,
                    0.5
                ],
                [
                    0.4079,
                    0.3232,
                    0.5
                ],
                [
                    0.4079,
                    0.6753,
                    0.5
                ],
                [
                    0.582,
                    0.1756,
                    0.5
                ],
                [
                    0.582,
                    0.8229,
                    0.5
                ],
                [
                    0.7873,
                    0.8051,
                    0.5
                ],
                [
                    0.7873,
                    0.1933,
                    0.5
                ],
                [
                    0.9003,
                    0.4992,
                    0.5
                ]
            ]
        },
        "-0.02": {
            "a": 7.141,
            "b": 3.904,
            "bonds": [
                1.49,
                1.49,
                1.441,
                1.441,
                1.368,
                1.37,
                1.37,
                1.469,
                1.469,
                1.439,
                1.439
            ],
            "avg_bond": 1.435,
            "min_bond": 1.368,
            "max_bond": 1.49,
            "scaled_positions": [
                [
                    0.1012,
                    0.4992,
                    0.5
                ],
                [
                    0.2209,
                    0.8119,
                    0.5
                ],
                [
                    0.2209,
                    0.1866,
                    0.5
                ],
                [
                    0.4082,
                    0.324,
                    0.5
                ],
                [
                    0.4082,
                    0.6745,
                    0.5
                ],
                [
                    0.5818,
                    0.1744,
                    0.5
                ],
                [
                    0.5818,
                    0.8241,
                    0.5
                ],
                [
                    0.7873,
                    0.8053,
                    0.5
                ],
                [
                    0.7873,
                    0.1932,
                    0.5
                ],
                [
                    0.8997,
                    0.4992,
                    0.5
                ]
            ]
        },
        "-0.01": {
            "a": 7.141,
            "b": 3.944,
            "bonds": [
                1.501,
                1.501,
                1.445,
                1.445,
                1.376,
                1.372,
                1.372,
                1.471,
                1.471,
                1.447,
                1.447
            ],
            "avg_bond": 1.441,
            "min_bond": 1.372,
            "max_bond": 1.501,
            "scaled_positions": [
                [
                    0.1012,
                    0.4992,
                    0.5
                ],
                [
                    0.2211,
                    0.8118,
                    0.5
                ],
                [
                    0.2211,
                    0.1867,
                    0.5
                ],
                [
                    0.4085,
                    0.3248,
                    0.5
                ],
                [
                    0.4085,
                    0.6737,
                    0.5
                ],
                [
                    0.5815,
                    0.1732,
                    0.5
                ],
                [
                    0.5815,
                    0.8253,
                    0.5
                ],
                [
                    0.7872,
                    0.8053,
                    0.5
                ],
                [
                    0.7872,
                    0.1932,
                    0.5
                ],
                [
                    0.8991,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.00": {
            "a": 7.141,
            "b": 3.984,
            "bonds": [
                1.512,
                1.512,
                1.447,
                1.447,
                1.384,
                1.375,
                1.375,
                1.472,
                1.472,
                1.456,
                1.456
            ],
            "avg_bond": 1.446,
            "min_bond": 1.375,
            "max_bond": 1.512,
            "scaled_positions": [
                [
                    0.1012,
                    0.4992,
                    0.5
                ],
                [
                    0.2215,
                    0.8116,
                    0.5
                ],
                [
                    0.2215,
                    0.1869,
                    0.5
                ],
                [
                    0.4089,
                    0.3255,
                    0.5
                ],
                [
                    0.4088,
                    0.673,
                    0.5
                ],
                [
                    0.5813,
                    0.172,
                    0.5
                ],
                [
                    0.5813,
                    0.8265,
                    0.5
                ],
                [
                    0.7871,
                    0.8053,
                    0.5
                ],
                [
                    0.7871,
                    0.1932,
                    0.5
                ],
                [
                    0.8985,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.01": {
            "a": 7.141,
            "b": 4.023,
            "bonds": [
                1.523,
                1.523,
                1.45,
                1.45,
                1.392,
                1.378,
                1.378,
                1.472,
                1.472,
                1.464,
                1.464
            ],
            "avg_bond": 1.451,
            "min_bond": 1.378,
            "max_bond": 1.523,
            "scaled_positions": [
                [
                    0.1011,
                    0.4992,
                    0.5
                ],
                [
                    0.2218,
                    0.8112,
                    0.5
                ],
                [
                    0.2218,
                    0.1873,
                    0.5
                ],
                [
                    0.4092,
                    0.3263,
                    0.5
                ],
                [
                    0.4092,
                    0.6722,
                    0.5
                ],
                [
                    0.5812,
                    0.1709,
                    0.5
                ],
                [
                    0.5811,
                    0.8276,
                    0.5
                ],
                [
                    0.7869,
                    0.8051,
                    0.5
                ],
                [
                    0.7869,
                    0.1933,
                    0.5
                ],
                [
                    0.898,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.02": {
            "a": 7.141,
            "b": 4.063,
            "bonds": [
                1.533,
                1.533,
                1.452,
                1.452,
                1.4,
                1.381,
                1.381,
                1.472,
                1.472,
                1.472,
                1.472
            ],
            "avg_bond": 1.456,
            "min_bond": 1.381,
            "max_bond": 1.533,
            "scaled_positions": [
                [
                    0.101,
                    0.4992,
                    0.5
                ],
                [
                    0.2222,
                    0.8107,
                    0.5
                ],
                [
                    0.2222,
                    0.1878,
                    0.5
                ],
                [
                    0.4095,
                    0.327,
                    0.5
                ],
                [
                    0.4095,
                    0.6715,
                    0.5
                ],
                [
                    0.581,
                    0.1698,
                    0.5
                ],
                [
                    0.581,
                    0.8286,
                    0.5
                ],
                [
                    0.7867,
                    0.8049,
                    0.5
                ],
                [
                    0.7867,
                    0.1936,
                    0.5
                ],
                [
                    0.8974,
                    0.4992,
                    0.5
                ]
            ]
        },
        "+0.03": {
            "a": 7.141,
            "b": 4.103,
            "bonds": [
                1.544,
                1.543,
                1.454,
                1.454,
                1.408,
                1.384,
                1.384,
                1.471,
                1.471,
                1.48,
                1.48
            ],
            "avg_bond": 1.461,
            "min_bond": 1.384,
            "max_bond": 1.544,
            "scaled_positions": [
                [
                    0.1009,
                    0.4992,
                    0.5
                ],
                [
                    0.2226,
                    0.8101,
                    0.5
                ],
                [
                    0.2226,
                    0.1884,
                    0.5
                ],
                [
                    0.4098,
                    0.3276,
                    0.5
                ],
                [
                    0.4098,
                    0.6708,
                    0.5
                ],
                [
                    0.5809,
                    0.1688,
                    0.5
                ],
                [
                    0.5809,
                    0.8297,
                    0.5
                ],
                [
                    0.7864,
                    0.8044,
                    0.5
                ],
                [
                    0.7864,
                    0.194,
                    0.5
                ],
                [
                    0.8969,
                    0.4992,
                    0.5
                ]
            ]
        }
    }
},
  raw_energy_strain: [
    { mode: "Biaxial", strain: "+0.00", total_energy_eV: -86.77363644, convergence: "CONVERGED" },
    { mode: "Biaxial", strain: "+0.01", total_energy_eV: -86.61974551, convergence: "CONVERGED" },
    { mode: "Biaxial", strain: "+0.02", total_energy_eV: -86.36236069, convergence: "CONVERGED" },
    { mode: "Biaxial", strain: "+0.03", total_energy_eV: -86.01031980, convergence: "CONVERGED" },
    { mode: "Biaxial", strain: "-0.01", total_energy_eV: -86.81479195, convergence: "CONVERGED" },
    { mode: "Biaxial", strain: "-0.02", total_energy_eV: -86.73343626, convergence: "CONVERGED" },
    { mode: "Biaxial", strain: "-0.03", total_energy_eV: -86.51932263, convergence: "CONVERGED" },
    { mode: "X", strain: "+0.00", total_energy_eV: -86.77363644, convergence: "CONVERGED" },
    { mode: "X", strain: "+0.01", total_energy_eV: -86.69963192, convergence: "CONVERGED" },
    { mode: "X", strain: "+0.02", total_energy_eV: -86.58162040, convergence: "CONVERGED" },
    { mode: "X", strain: "+0.03", total_energy_eV: -86.42211334, convergence: "CONVERGED" },
    { mode: "X", strain: "-0.01", total_energy_eV: -86.80124456, convergence: "CONVERGED" },
    { mode: "X", strain: "-0.02", total_energy_eV: -86.78006864, convergence: "CONVERGED" },
    { mode: "X", strain: "-0.03", total_energy_eV: -86.70780102, convergence: "CONVERGED" },
    { mode: "Y", strain: "+0.00", total_energy_eV: -86.77363644, convergence: "CONVERGED" },
    { mode: "Y", strain: "+0.01", total_energy_eV: -86.70341455, convergence: "CONVERGED" },
    { mode: "Y", strain: "+0.02", total_energy_eV: -86.59086056, convergence: "CONVERGED" },
    { mode: "Y", strain: "+0.03", total_energy_eV: -86.43925545, convergence: "CONVERGED" },
    { mode: "Y", strain: "-0.01", total_energy_eV: -86.79807414, convergence: "CONVERGED" },
    { mode: "Y", strain: "-0.02", total_energy_eV: -86.77353783, convergence: "CONVERGED" },
    { mode: "Y", strain: "-0.03", total_energy_eV: -86.69710624, convergence: "CONVERGED" }
  ],
  vasp_inputs: {
    incar_pbe_relax: `SYSTEM = PHOTH-Graphene Relaxation
ISTART = 0 ; ICHARG = 2
ENCUT = 800       
PREC = Accurate   # Complex FFT grids in 2D sp2 carbon
LREAL = .FALSE.   # Exact reciprocal space projection
EDIFF = 1E-8      # Strict electronic convergence
ISMEAR = 0        # Gaussian smearing
SIGMA = 0.01      # Tight smearing for 0K energy
ALGO = Normal
MAXMIX = 40       # Pulay charge mixing history
IBRION = 2        # Conjugate gradient
NSW = 100         # Maximum ionic steps
EDIFFG = -0.001   # Strict force convergence threshold (< 1 meV/Å)
ISIF = 2          # Fixed volume (c = 20 Å vacuum)`,
    incar_hse06_bands: `SYSTEM = PHOTH-Graphene HSE06 Static Band Gap
ISTART = 1        # Read PBE ground-state WAVECAR
ICHARG = 0
ENCUT = 800  
PREC = Accurate  
LHFCALC = .TRUE.  # Turn on exact exchange
AEXX = 0.25       # 25% Hartree-Fock exact exchange mixing
HFSCREEN = 0.2    # Standard HSE06 screening parameter
PRECFOCK = Fast   # Accelerated exchange FFT routines
ALGO = Damped     # Stable algorithm for narrow-gap Dirac systems
EDIFF = 1E-6      
ISMEAR = 0        
SIGMA = 0.01      
IBRION = -1       # Static electronic evaluation
NSW = 0`,
    kpoints_mesh: `Automatic Mesh
0
Monkhorst-Pack
 9 15 1
 0  0 0`
  },
  band_series: {
    modes: [
      { id: "Biaxial", label: "Biaxial Breathing (ε_xx = ε_yy)", gif: "./calculations/photh/anim_band_pdos_coupled_biaxial.gif" },
      { id: "X", label: "Uniaxial X (Armchair, ε_xx)", gif: "./calculations/photh/anim_band_pdos_coupled_uniaxial_x.gif" },
      { id: "Y", label: "Uniaxial Y (Zigzag, ε_yy)", gif: "./calculations/photh/anim_band_pdos_coupled_uniaxial_y.gif" }
    ],
    pristine_coupled: "./calculations/photh/fig_band_pdos_coupled_pristine.png",
    pbe_vs_hse: "./calculations/photh/fig1_electronic_bands_pbe_vs_hse06.png"
  },
  bader_animation_series: {
    modes: [
      { id: "Biaxial", label: "Biaxial Breathing (ε_xx = ε_yy)", gif: "./calculations/photh/anim_bader_biaxial_breathing.gif" },
      { id: "X", label: "Uniaxial X (Armchair, ε_xx)", gif: "./calculations/photh/anim_bader_uniaxial_x.gif" },
      { id: "Y", label: "Uniaxial Y (Zigzag, ε_yy)", gif: "./calculations/photh/anim_bader_uniaxial_y.gif" }
    ],
    profiles_figure: "./calculations/photh/fig_bader_charge_profiles.png",
    composite_figure: "./calculations/photh/fig_bader_pristine_vs_strained_composite.png"
  },
  visual_assets: {
    band_structure: "./calculations/photh/fig1_electronic_bands_pbe_vs_hse06.png",
    band_pdos_coupled_pristine: "./calculations/photh/fig_band_pdos_coupled_pristine.png",
    band_pdos_coupled_biaxial_gif: "./calculations/photh/anim_band_pdos_coupled_biaxial.gif",
    band_pdos_coupled_uniaxial_x_gif: "./calculations/photh/anim_band_pdos_coupled_uniaxial_x.gif",
    band_pdos_coupled_uniaxial_y_gif: "./calculations/photh/anim_band_pdos_coupled_uniaxial_y.gif",
    bader_biaxial_gif: "./calculations/photh/anim_bader_biaxial_breathing.gif",
    bader_uniaxial_x_gif: "./calculations/photh/anim_bader_uniaxial_x.gif",
    bader_uniaxial_y_gif: "./calculations/photh/anim_bader_uniaxial_y.gif",
    bader_charge_profiles: "./calculations/photh/fig_bader_charge_profiles.png",
    bader_composite: "./calculations/photh/fig_bader_pristine_vs_strained_composite.png",
    cdd_contour_2d: "./calculations/photh/fig_ccd_2d_publication_contour.png",
    cdd_slice_z050: "./calculations/photh/fig_ccd_2d_slice_z050.png",
    cdd_slice_z045: "./calculations/photh/fig_ccd_2d_slice_z045.png",
    cdd_slice_z055: "./calculations/photh/fig_ccd_2d_slice_z055.png",
    bader_strain_summary: "./calculations/photh/fig8_bader_charge_redistribution_under_strain.png",
    her_profile: "./calculations/photh/fig2_her_free_energy_profile.png",
    elasticity_curve: "./calculations/photh/fig7_mechanical_strain_energy_and_elasticity.png",
    reciprocal_space: "./calculations/photh/fig0_crystal_structure_and_reciprocal_space.png",
    raw_bader_csv: "./calculations/photh/bader_strained_summary.csv",
    raw_energy_csv: "./calculations/photh/energy_strain_results.csv"
  }
}
