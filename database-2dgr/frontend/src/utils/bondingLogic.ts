/**
 * bondingLogic.ts
 * ================
 * CarbonAtlas 2D Carbon Allotropes Covalent Bonding Classification & Filtering Engine
 *
 * Implements continuous, physically calibrated covalent bond order analysis,
 * Pauling empirical bond orders, topological bond length alternation (BLA),
 * independent structural uniformity toggles, and deterministic UI badge labeling.
 *
 * Synchronized with the single source of truth in constants/bondingThresholds.ts.
 *
 * Author: Carlos R. Primo S. (GEEDAI - UFABC / GMCAN - UNMSM)
 * Date: 2026
 */

import {
  DOUBLE_MAX,
  SINGLE_MIN,
  TRIPLE_MAX,
  UNIFORM_DELTA_D_MAX,
  BONDING_THRESHOLDS,
  BOND_LENGTH_LABELS,
} from '../constants/bondingThresholds.ts';

export {
  DOUBLE_MAX,
  SINGLE_MIN,
  TRIPLE_MAX,
  UNIFORM_DELTA_D_MAX,
  BONDING_THRESHOLDS,
  BOND_LENGTH_LABELS,
};

export interface BondingThresholds {
  /** Maximum length for localized double-like (olefinic) bonds in Angstroms (default: 1.375) */
  doubleMax: number;
  /** Maximum length for resonant aromatic / delocalized bonds in Angstroms (default: 1.455) */
  aromaticMax: number;
  /** Maximum length for acetylenic triple bonds in Angstroms (default: 1.250) */
  tripleMax: number;
  /** Maximum bond length spread (Delta d) to qualify as uniform resonant (default: 0.025) */
  uniformSpreadMax: number;
}

export const DEFAULT_THRESHOLDS: BondingThresholds = {
  doubleMax: DOUBLE_MAX,
  aromaticMax: SINGLE_MIN,
  tripleMax: TRIPLE_MAX,
  uniformSpreadMax: UNIFORM_DELTA_D_MAX,
};

export type StructureBondingRegime =
  | 'Pure Resonant'        // Uniform bond lengths (Δd < 0.025 Å) and 100% delocalized (e.g., Pristine Graphene)
  | 'Delocalized sp²'      // >= 70% delocalized bonds with mild topological strain (e.g., Phagraphene, 5-6-7 haeckelites)
  | 'Mixed / Strained sp²' // Coexisting Double, Delocalized, and Single-like bonds (20% <= fArom < 70%, e.g., Biphenylene, PHOTH-Graphene)
  | 'Localized C=C / C–C'; // Strong bond-length alternation (fArom < 20%, dominated by localized Double + Single bridges, e.g., Octagraphene, Graphenylene)

export interface BondCharacterCounts {
  doubleLike: number;
  delocalized: number;
  singleLike: number;
  tripleLike: number;
}

export interface BondCharacterFractions {
  doubleLike: number;
  delocalized: number;
  singleLike: number;
  tripleLike: number;
}

export interface BondingBadge {
  label: string;
  shortLabel: StructureBondingRegime | string;
  variant: 'pure' | 'aromatic' | 'strained' | 'mixed' | 'double' | 'triple' | 'default';
  tooltip: string;
  breakdown: {
    doublePct: number;
    delocPct: number;
    singlePct: number;
    triplePct: number;
    isUniform: boolean;
  };
}

export interface BondingFilterChoice {
  id: 'double' | 'delocalized' | 'single' | 'triple';
  label: string;
  shortLabel: string;
  criterion: string;
  description: string;
  literatureBasis: string;
  color: string;
}

/**
 * Continuous Pauling empirical bond order formula:
 * n_i = 10^((1.54 - d_i) / 0.71)
 */
export function computePaulingBondOrder(distance: number): number {
  if (distance <= 0) return 0;
  return Math.pow(10, (1.54 - distance) / 0.71);
}

/**
 * Filter definition choices displayed in the sidebar filter.
 * Strictly continuous, exhaustive, and disjoint intervals matching canonical constants.
 */
export const BONDING_FILTER_CHOICES: BondingFilterChoice[] = [
  {
    id: 'double',
    label: 'Double-like (C=C)',
    shortLabel: 'C=C',
    criterion: BOND_LENGTH_LABELS.doubleCriterion,
    description: 'Localized olefinic double bonds (e.g., Graphenylene cyclohexatrienes, Cmmm-graphene)',
    literatureBasis: 'Song et al., J. Mater. Chem. C (2013); Yi et al., (2018)',
    color: '#c2593f',
  },
  {
    id: 'delocalized',
    label: 'Delocalized / Aromatic',
    shortLabel: 'C⋯C',
    criterion: BOND_LENGTH_LABELS.delocalizedCriterion,
    description: 'Resonant aromatic π-electron bonds (Graphene honeycomb baseline)',
    literatureBasis: 'Novoselov et al., Science (2004); Girão et al., Carbon (2023)',
    color: '#2e7d5a',
  },
  {
    id: 'single',
    label: 'Conjugated Single-like (C–C)',
    shortLabel: 'C–C',
    criterion: BOND_LENGTH_LABELS.singleCriterion,
    description: 'Covalent single σ-bonds (e.g., Biphenylene 4-ring bridges, Phagraphene 5-7 junctions)',
    literatureBasis: 'Fan et al., Science (2021); Wang et al., Nano Lett. (2015)',
    color: '#3b6998',
  },
  {
    id: 'triple',
    label: 'Triple (C≡C)',
    shortLabel: 'C≡C',
    criterion: BOND_LENGTH_LABELS.tripleCriterion,
    description: 'Acetylenic sp linkages (Synthesized Graphynes & Graphdiynes in literature)',
    literatureBasis: 'Desyatkin et al., JACS (2022); Li et al., Chem. Commun. (2010)',
    color: '#8b5cf6',
  },
];

/**
 * Deterministic 4-Class Structure Bonding Classifier
 * Physically grounded hierarchy based on bond fractions and deltaD.
 */
export function getStructureBondingClass(stats: {
  doubleCount: number;
  aromaticCount: number;
  singleCount: number;
  totalBonds: number;
  deltaD?: number | null;
  hasNonHex?: boolean;
}): {
  catalogBadge: StructureBondingRegime;
  inspectorBadge: string;
  isUniformResonant: boolean;
} {
  const total = Math.max(stats.totalBonds, 1);
  const fDouble = stats.doubleCount / total;
  const fArom = stats.aromaticCount / total;
  const fSingle = stats.singleCount / total;

  // Safe lower bound if deltaD is missing:
  const inferredMinDeltaD =
    stats.doubleCount > 0 && stats.singleCount > 0
      ? 0.085
      : (stats.doubleCount > 0 && stats.aromaticCount > 0) ||
        (stats.aromaticCount > 0 && stats.singleCount > 0)
      ? 0.035
      : 0.01;

  const effectiveDeltaD =
    typeof stats.deltaD === 'number' && !Number.isNaN(stats.deltaD) && stats.deltaD > 0
      ? stats.deltaD
      : stats.aromaticCount === total && stats.deltaD === 0
      ? 0.0
      : inferredMinDeltaD;

  // Pristine "Pure Resonant" strictly requires zero topological ring defects (no 5, 7, 8, etc. rings)
  const isUniformResonant = fArom === 1 && effectiveDeltaD < UNIFORM_DELTA_D_MAX && !stats.hasNonHex;

  if (isUniformResonant) {
    return {
      catalogBadge: 'Pure Resonant',
      inspectorBadge: 'Uniform Resonant sp²',
      isUniformResonant: true,
    };
  }

  if (fArom >= 0.70) {
    return {
      catalogBadge: 'Delocalized sp²',
      inspectorBadge: (stats.hasNonHex || effectiveDeltaD > 0.05) ? 'Delocalized sp² (Topological Strain)' : 'Delocalized sp²',
      isUniformResonant: false,
    };
  }

  if (fArom >= 0.20) {
    return {
      catalogBadge: 'Mixed / Strained sp²',
      inspectorBadge: 'Anisotropic / Mixed sp²',
      isUniformResonant: false,
    };
  }

  return {
    catalogBadge: 'Localized C=C / C–C',
    inspectorBadge: 'Bond-Alternating sp² (High BLA)',
    isUniformResonant: false,
  };
}

/**
 * Extracts and sanitizes bond metrics directly from structure or descriptor records.
 * NEVER defaults missing deltaD to 0.
 */
export function extractStructureBondStats(structure: any): {
  doubleCount: number;
  aromaticCount: number;
  singleCount: number;
  tripleCount: number;
  totalBonds: number;
  deltaD: number | null;
  effectiveDeltaD: number;
  fDouble: number;
  fArom: number;
  fSingle: number;
  fTriple: number;
  hasNonHex: boolean;
} {
  const desc = structure?.descriptors || structure?.bonding_descriptors || {};
  const singleCount = Number(
    desc.single_bonds_count ??
    structure?.singleBondsCount ??
    structure?.bondingCounts?.single ??
    0
  );
  const doubleCount = Number(
    desc.double_bonds_count ??
    structure?.doubleBondsCount ??
    structure?.bondingCounts?.double ??
    0
  );
  const aromaticCount = Number(
    desc.aromatic_bonds_count ??
    structure?.aromaticBondsCount ??
    structure?.bondingCounts?.aromatic ??
    0
  );
  const tripleCount = Number(
    desc.triple_bonds_count ??
    structure?.tripleBondsCount ??
    structure?.bondingCounts?.triple ??
    0
  );

  const totalBonds = singleCount + doubleCount + aromaticCount + tripleCount ||
    (Array.isArray(structure?.bonds) && structure.bonds.length > 0 ? structure.bonds.length : 1);

  // Raw deltaD from structure: Never default to 0 if missing!
  let deltaD: number | null = null;
  if (typeof desc.bond_length_span === 'number' && !Number.isNaN(desc.bond_length_span)) {
    deltaD = desc.bond_length_span;
  } else if (
    typeof desc.bond_length_max === 'number' &&
    typeof desc.bond_length_min === 'number' &&
    !Number.isNaN(desc.bond_length_max) &&
    !Number.isNaN(desc.bond_length_min)
  ) {
    deltaD = desc.bond_length_max - desc.bond_length_min;
  } else if (Array.isArray(structure?.bondLengths) && structure.bondLengths.length > 0) {
    deltaD = Math.max(...structure.bondLengths) - Math.min(...structure.bondLengths);
  } else if (typeof structure?.deltaD === 'number' && !Number.isNaN(structure.deltaD)) {
    deltaD = structure.deltaD;
  }

  // Safe lower bound if deltaD is missing
  const inferredMinDeltaD =
    doubleCount > 0 && singleCount > 0
      ? 0.085
      : (doubleCount > 0 && aromaticCount > 0) ||
        (aromaticCount > 0 && singleCount > 0)
      ? 0.035
      : 0.01;

  const effectiveDeltaD =
    typeof deltaD === 'number' && !Number.isNaN(deltaD) && deltaD > 0
      ? deltaD
      : aromaticCount === totalBonds && deltaD === 0
      ? 0.0
      : inferredMinDeltaD;

  const rings = structure?.ringFractions || structure?.descriptor?.ring_fractions || structure?.rings;
  const nonHexFrac = Number(
    structure?.nonHexagonalFraction ??
    structure?.descriptor?.non_hexagonal_fraction ??
    (structure?.topologicalInvariants?.nonHexagonalFraction ?? 0)
  );
  const hasNonHex = Boolean(
    nonHexFrac > 0.001 ||
    (rings && Object.keys(rings).some(k => String(k) !== '6' && Number(rings[k]) > 0))
  );

  return {
    doubleCount,
    aromaticCount,
    singleCount,
    tripleCount,
    totalBonds,
    deltaD,
    effectiveDeltaD,
    fDouble: doubleCount / totalBonds,
    fArom: aromaticCount / totalBonds,
    fSingle: singleCount / totalBonds,
    fTriple: tripleCount / totalBonds,
    hasNonHex,
  };
}

/**
 * Deterministic badge generator adhering to the 4-regime classification.
 */
export function getStructureBondingBadge(structure: any): BondingBadge {
  const stats = extractStructureBondStats(structure);
  const classification = getStructureBondingClass(stats);

  const doublePct = Math.round(stats.fDouble * 100);
  const delocPct = Math.round(stats.fArom * 100);
  const singlePct = Math.round(stats.fSingle * 100);
  const triplePct = Math.round(stats.fTriple * 100);

  const variantMap: Record<StructureBondingRegime, 'pure' | 'aromatic' | 'mixed' | 'double'> = {
    'Pure Resonant': 'pure',
    'Delocalized sp²': 'aromatic',
    'Mixed / Strained sp²': 'mixed',
    'Localized C=C / C–C': 'double',
  };

  const displayDeltaD = stats.deltaD ?? stats.effectiveDeltaD;

  return {
    label: classification.inspectorBadge,
    shortLabel: classification.catalogBadge,
    variant: variantMap[classification.catalogBadge] || 'default',
    tooltip: `${classification.inspectorBadge}: ${delocPct}% C⋯C, ${doublePct}% C=C, ${singlePct}% C–C (Δd = ${displayDeltaD.toFixed(3)} Å)`,
    breakdown: {
      doublePct,
      delocPct,
      singlePct,
      triplePct,
      isUniform: classification.isUniformResonant,
    },
  };
}

/**
 * Backwards-compatible profile extractor for stores and calculators.
 */
export function extractBondCharacterProfile(
  structure: any,
  _thresholds: BondingThresholds = DEFAULT_THRESHOLDS
): {
  counts: BondCharacterCounts;
  fractions: BondCharacterFractions;
  totalBonds: number;
  spread: number;
  isUniform: boolean;
} {
  const stats = extractStructureBondStats(structure);
  const classification = getStructureBondingClass(stats);

  return {
    counts: {
      doubleLike: stats.doubleCount,
      delocalized: stats.aromaticCount,
      singleLike: stats.singleCount,
      tripleLike: stats.tripleCount,
    },
    fractions: {
      doubleLike: stats.fDouble,
      delocalized: stats.fArom,
      singleLike: stats.fSingle,
      tripleLike: stats.fTriple,
    },
    totalBonds: stats.totalBonds,
    spread: stats.deltaD ?? stats.effectiveDeltaD,
    isUniform: classification.isUniformResonant,
  };
}

/**
 * Evaluates whether a structure matches the selected covalent bond character filters.
 */
export function matchBondCharacterFilter(
  structure: any,
  activeBonds: string[],
  minFraction: number = 0.0
): boolean {
  if (!activeBonds || activeBonds.length === 0) return true;

  const stats = extractStructureBondStats(structure);

  return activeBonds.every((bId) => {
    switch (bId) {
      case 'double':
        return stats.fDouble > minFraction || stats.doubleCount > 0;
      case 'delocalized':
      case 'aromatic':
        return stats.fArom > minFraction || stats.aromaticCount > 0;
      case 'single':
        return stats.fSingle > minFraction || stats.singleCount > 0;
      case 'triple':
        return stats.fTriple > minFraction || stats.tripleCount > 0;
      default:
        return true;
    }
  });
}

/**
 * Independent structural uniformity filter.
 * Strictly checks the isUniformResonant flag from getStructureBondingClass.
 */
export function matchUniformityFilter(
  structure: any,
  requireUniform: boolean = false
): boolean {
  if (!requireUniform) return true;
  const stats = extractStructureBondStats(structure);
  const classification = getStructureBondingClass(stats);
  return classification.isUniformResonant;
}
