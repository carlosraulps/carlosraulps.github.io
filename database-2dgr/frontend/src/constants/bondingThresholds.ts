/**
 * bondingThresholds.ts
 * ====================
 * Single Source of Truth for Covalent Bond Length Cutoffs and Uniformity Thresholds.
 *
 * Synchronizes the Left Sidebar, Catalog Row Badges, and Right-Hand Descriptor Panel
 * so criteria, labels, and mathematical filters never diverge.
 *
 * Literature Grounding:
 * - Double bonds (C=C olefinic): d <= 1.375 A (Song et al., J. Mater. Chem. C 2013)
 * - Resonant delocalized aromatic: 1.375 < d < 1.455 A (Graphene honeycomb baseline, Novoselov 2004)
 * - Single bonds (C-C sigma): d >= 1.455 A (Biphenylene 4-ring bridges, Fan et al., Science 2021)
 * - Acetylenic triple bonds (C#C): d <= 1.250 A (Desyatkin et al., JACS 2022)
 * - Uniform resonance spread: Delta d < 0.025 A (Zero BLA ideal honeycomb)
 */

export const DOUBLE_MAX = 1.375;
export const SINGLE_MIN = 1.455;
export const TRIPLE_MAX = 1.250;
export const UNIFORM_DELTA_D_MAX = 0.025;

export const BONDING_THRESHOLDS = {
  DOUBLE_MAX,
  SINGLE_MIN,
  TRIPLE_MAX,
  UNIFORM_DELTA_D_MAX,
} as const;

export const BOND_LENGTH_LABELS = {
  doubleCriterion: `d ≤ ${DOUBLE_MAX.toFixed(3)} Å`,
  delocalizedCriterion: `${DOUBLE_MAX.toFixed(3)} < d < ${SINGLE_MIN.toFixed(3)} Å`,
  singleCriterion: `d ≥ ${SINGLE_MIN.toFixed(3)} Å`,
  tripleCriterion: `d ≤ ${TRIPLE_MAX.toFixed(3)} Å`,
  uniformDeltaDCriterion: `Δd < ${UNIFORM_DELTA_D_MAX.toFixed(3)} Å`,

  // Legend strings
  doubleLegend: `Double (d ≤ ${DOUBLE_MAX.toFixed(3)} Å)`,
  delocalizedLegend: `Aromatic (${DOUBLE_MAX.toFixed(3)}–${SINGLE_MIN.toFixed(3)} Å)`,
  singleLegend: `Single (d ≥ ${SINGLE_MIN.toFixed(3)} Å)`,
  tripleLegend: `Triple (d ≤ ${TRIPLE_MAX.toFixed(3)} Å)`,
} as const;
