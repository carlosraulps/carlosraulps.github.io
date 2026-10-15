#!/usr/bin/env python3
"""
process_allotropes.py
=====================
Computational Materials Science Preprocessing & Calibration Pipeline
for 2D Carbon Allotropes (CarbonAtlas Scientific Web Database).

Features:
1. Symmetry Expansion & Periodic Neighbor Graph (ASE).
   - Coordination number (Z), bond angles (theta_ijk), hybridization assignment (sp2 planar, sp2 buckled, sp).
   - Validation & symmetry warning for unexpected coordination (Z != 2, 3).
2. Dataset-Wide Bond Length Histogram & GMM Threshold Calibration.
   - Collects unique C-C bonds across the entire dataset.
   - Fits 3-component Gaussian Mixture Model (GMM) + Kernel Density Estimate (KDE).
   - Calibrates disjoint and exhaustive decision boundaries separating double-like, delocalized, and single-like.
   - Generates publication-quality figure: reports/c_c_bond_distribution_calibration.png.
3. Continuous Empirical Descriptors (Per-Bond & Per-Structure).
   - Pauling empirical bond orders: n_i = 10^((1.54 - d_i)/0.71).
   - Structure-level stats: mean d, std d, spread Delta d, and topological Bond Length Alternation (BLA).
   - Decoupled structural uniformity flag (is_uniform_resonant: Delta d < 0.03 A).
4. 2D Planar Face Ring Perception (Periodic Polygon Counting).
   - 2D supercell expansion projected onto xy-plane.
   - Half-edge dual cyclic angular sorting traversal to find all elementary faces without periodic artifacts.
   - Computes exact polygon counts (f3..f18), Shannon ring entropy, non-hexagonal fraction, Stone-Wales fraction.
5. JSON Export.
   - Outputs clean, structured allotropes_catalog.json with full calibration metadata.

Author: Carlos R. Primo S. (GEEDAI - UFABC / GMCAN - UNMSM)
Date: 2026
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import ase.io
from ase.neighborlist import neighbor_list
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.signal import find_peaks
from scipy.spatial import KDTree
from scipy.stats import gaussian_kde
from sklearn.mixture import GaussianMixture


# ==============================================================================
# DATA STRUCTURES & CONFIGURATION
# ==============================================================================

@dataclass
class CalibratedThresholds:
    """Calibrated bond distance threshold boundaries (in Angstroms)."""
    double_max: float = 1.375       # d <= double_max: double-like (localized pi)
    aromatic_max: float = 1.455     # double_max < d < aromatic_max: delocalized / aromatic
    triple_max: float = 1.250       # d <= triple_max: sp-sp acetylenic triple bond
    sp_sp_single_min: float = 1.300 # sp-sp single bond lower bound
    sp_sp_single_max: float = 1.380 # sp-sp single bond upper bound
    sp_sp2_single_min: float = 1.380# sp-sp2 single bond lower bound
    sp_sp2_single_max: float = 1.450# sp-sp2 single bond upper bound
    gmm_means: List[float] = field(default_factory=list)
    gmm_stds: List[float] = field(default_factory=list)
    gmm_weights: List[float] = field(default_factory=list)


@dataclass
class BondRecord:
    """Represents a unique undirected covalent bond within the unit cell."""
    atom_i: int
    atom_j: int
    offset: Tuple[int, int, int]
    length: float
    pauling_order: float
    hybridization_pair: Tuple[str, str]
    character: str  # 'double_like', 'delocalized', 'single_like', 'triple_like', 'sp_sp_single', 'sp_sp2_single'


@dataclass
class AtomEnvironment:
    """Coordination and geometric angle environment of a carbon atom."""
    index: int
    coordination: int
    angles: List[float]
    angle_sum: float
    hybridization: str  # 'sp2_planar', 'sp2_buckled', 'sp', 'abnormal'
    is_planar: bool
    pyramidalization_angle_deg: float


# ==============================================================================
# MODULE 1: ASE CIF PARSER & PERIODIC NEIGHBOR GRAPH
# ==============================================================================

class ASECIFParser:
    """
    Robust periodic neighbor graph builder and hybridization classifier
    using ASE neighbor lists.
    """

    def __init__(self, cutoff: float = 1.85):
        self.cutoff = cutoff

    def parse_structure(self, cif_path: Path) -> Tuple[ase.Atoms, List[AtomEnvironment], List[Tuple[int, int, Tuple[int, int, int], float]]]:
        """
        Parses a CIF file into an ASE Atoms object, computes atomic environments
        and extracts all unique undirected bonds in the unit cell.
        """
        atoms = ase.io.read(cif_path)
        num_atoms = len(atoms)

        # Extract periodic neighbors using ASE
        # 'i': central atom, 'j': neighbor atom, 'd': distance, 'D': displacement vector, 'S': cell offset
        i_indices, j_indices, distances, disp_vecs, offsets = neighbor_list(
            'ijdDS', atoms, cutoff=self.cutoff
        )

        # 1. Group neighbors per atom to compute coordination & angles
        atom_neighbors: Dict[int, List[Tuple[int, float, np.ndarray, Tuple[int, int, int]]]] = {
            a: [] for a in range(num_atoms)
        }
        for i_idx, j_idx, dist, d_vec, off in zip(i_indices, j_indices, distances, disp_vecs, offsets):
            atom_neighbors[i_idx].append((j_idx, dist, d_vec, tuple(off)))

        # 2. Compute coordination, angles, and assign hybridization
        atom_environments: List[AtomEnvironment] = []
        warnings: List[str] = []

        for a in range(num_atoms):
            nbrs = atom_neighbors[a]
            coordination = len(nbrs)
            angles: List[float] = []

            # Compute pairwise angles between displacement vectors
            if coordination >= 2:
                vecs = [v / np.linalg.norm(v) for _, _, v, _ in nbrs]
                k_nbrs = len(vecs)
                for m in range(k_nbrs):
                    for n in range(m + 1, k_nbrs):
                        dot = np.clip(np.dot(vecs[m], vecs[n]), -1.0, 1.0)
                        deg = float(np.degrees(np.arccos(dot)))
                        angles.append(deg)

            # Evaluate planar angle sum for 3-coordinated atoms
            # For 3 neighbors, exactly 3 pairwise angles around the site
            angle_sum = sum(angles[:3]) if coordination == 3 and len(angles) >= 3 else sum(angles)

            # Pyramidalization metric: deviation of angle sum from 360 degrees
            pyr_deg = max(0.0, 360.0 - angle_sum) if coordination == 3 else 0.0

            # Assign hybridization state
            if coordination == 3:
                if angle_sum >= 355.0:
                    hybridization = "sp2_planar"
                    is_planar = True
                else:
                    hybridization = "sp2_buckled"
                    is_planar = False
            elif coordination == 2:
                # Check for linear geometry (sp carbon)
                if angles and 160.0 <= angles[0] <= 180.0:
                    hybridization = "sp"
                    is_planar = True
                else:
                    hybridization = "sp_bent"
                    is_planar = False
            else:
                hybridization = "abnormal"
                is_planar = False
                warnings.append(
                    f"Atom {a} in {cif_path.name} has unexpected coordination Z={coordination} (expected 2 or 3)."
                )

            atom_environments.append(
                AtomEnvironment(
                    index=a,
                    coordination=coordination,
                    angles=angles,
                    angle_sum=round(angle_sum, 2),
                    hybridization=hybridization,
                    is_planar=is_planar,
                    pyramidalization_angle_deg=round(pyr_deg, 2),
                )
            )

        if warnings:
            print(f"  [CIF Warning] {cif_path.name}: {'; '.join(warnings)}", file=sys.stderr)

        # 3. Extract unique undirected bonds in the unit cell
        # Canonical representation: if i < j, (i, j, offset); if i == j, offset > 0
        unique_bonds_set: Set[Tuple[int, int, Tuple[int, int, int]]] = set()
        raw_bonds: List[Tuple[int, int, Tuple[int, int, int], float]] = []

        for a, b, dist, _, off in zip(i_indices, j_indices, distances, disp_vecs, offsets):
            off_tuple = tuple(off)
            if a < b:
                canon_key = (a, b, off_tuple)
            elif a > b:
                canon_key = (b, a, tuple(-x for x in off_tuple))
            else:
                if off_tuple > (0, 0, 0):
                    canon_key = (a, a, off_tuple)
                else:
                    continue

            if canon_key not in unique_bonds_set:
                unique_bonds_set.add(canon_key)
                raw_bonds.append((canon_key[0], canon_key[1], canon_key[2], float(dist)))

        return atoms, atom_environments, raw_bonds


# ==============================================================================
# MODULE 2: GMM THRESHOLD CALIBRATION & HISTOGRAM PLOTTING
# ==============================================================================

class BondDistributionCalibrator:
    """
    Calibrates data-driven bond length thresholds using a 3-component
    Gaussian Mixture Model (GMM) and Kernel Density Estimation (KDE).
    """

    @staticmethod
    def calibrate(
        all_bond_lengths: List[float],
        default_t1: float = 1.375,
        default_t2: float = 1.455,
    ) -> CalibratedThresholds:
        """
        Fits GMM to sp2-sp2 bond lengths to determine the natural decision boundaries.
        Returns CalibratedThresholds.
        """
        if len(all_bond_lengths) < 20:
            return CalibratedThresholds(double_max=default_t1, aromatic_max=default_t2)

        data = np.array(all_bond_lengths).reshape(-1, 1)

        # Fit 3-component GMM with chemically informed initial centers:
        # comp 0: double-like ~ 1.35 A
        # comp 1: delocalized / aromatic ~ 1.42 A
        # comp 2: single-like ~ 1.48 A
        gmm = GaussianMixture(
            n_components=3,
            means_init=[[1.35], [1.42], [1.48]],
            random_state=42,
            max_iter=500,
        )
        gmm.fit(data)

        means = gmm.means_.flatten()
        order = np.argsort(means)
        means = means[order]
        covars = gmm.covariances_.flatten()[order]
        weights = gmm.weights_.flatten()[order]
        stds = np.sqrt(covars)

        # Determine decision boundaries by finding probability density intersections
        x_grid = np.linspace(1.28, 1.72, 4000)
        pdf_comp = np.zeros((3, len(x_grid)))
        for k in range(3):
            pdf_comp[k] = (
                weights[k]
                * (1.0 / (stds[k] * np.sqrt(2 * np.pi)))
                * np.exp(-0.5 * ((x_grid - means[k]) / stds[k]) ** 2)
            )

        # Boundary 1: intersection between double-like and delocalized
        mask_01 = (x_grid >= means[0]) & (x_grid <= means[1])
        if np.any(mask_01):
            idx_01 = np.argmin(np.abs(pdf_comp[0, mask_01] - pdf_comp[1, mask_01]))
            t1 = float(x_grid[mask_01][idx_01])
        else:
            t1 = default_t1

        # Boundary 2: intersection between delocalized and single-like
        mask_12 = (x_grid >= means[1]) & (x_grid <= means[2])
        if np.any(mask_12):
            idx_12 = np.argmin(np.abs(pdf_comp[1, mask_12] - pdf_comp[2, mask_12]))
            t2 = float(x_grid[mask_12][idx_12])
        else:
            t2 = default_t2

        # Sanity bounds: t1 in [1.36, 1.39], t2 in [1.44, 1.47]
        t1_final = round(float(np.clip(t1, 1.360, 1.390)), 3)
        t2_final = round(float(np.clip(t2, 1.440, 1.470)), 3)

        return CalibratedThresholds(
            double_max=t1_final,
            aromatic_max=t2_final,
            gmm_means=[round(float(m), 4) for m in means],
            gmm_stds=[round(float(s), 4) for s in stds],
            gmm_weights=[round(float(w), 4) for w in weights],
        )

    @staticmethod
    def plot_calibration(
        all_bond_lengths: List[float],
        thresholds: CalibratedThresholds,
        output_path: Path,
    ) -> None:
        """
        Renders a high-resolution publication-quality calibration plot with
        histogram, KDE, fitted GMM components, and classification color bands.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data = np.array(all_bond_lengths)

        fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
        fig.patch.set_facecolor("#fcfbfa")
        ax.set_facecolor("#ffffff")

        # Histogram
        bins = np.linspace(1.28, 1.72, 75)
        n, bins_out, patches = ax.hist(
            data,
            bins=bins,
            density=True,
            alpha=0.35,
            color="#9bb3a8",
            edgecolor="#688b7b",
            linewidth=0.8,
            label=f"Dataset C–C Bonds (N={len(data)})",
        )

        # Kernel Density Estimate
        x_eval = np.linspace(1.28, 1.72, 1000)
        kde = gaussian_kde(data, bw_method=0.035)
        ax.plot(x_eval, kde(x_eval), color="#1b4d3e", linewidth=2.2, label="Kernel Density Estimate (KDE)")

        # GMM individual components
        if thresholds.gmm_means and len(thresholds.gmm_means) == 3:
            comp_colors = ["#c2593f", "#2e7d5a", "#3b6998"]
            comp_labels = ["GMM: Localized C=C", "GMM: Resonant Aromatic", "GMM: Single-like C–C"]
            total_gmm_pdf = np.zeros_like(x_eval)

            for k in range(3):
                m = thresholds.gmm_means[k]
                s = thresholds.gmm_stds[k]
                w = thresholds.gmm_weights[k]
                pdf_k = w * (1.0 / (s * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x_eval - m) / s) ** 2)
                total_gmm_pdf += pdf_k
                ax.plot(
                    x_eval,
                    pdf_k,
                    linestyle="--",
                    color=comp_colors[k],
                    linewidth=1.6,
                    label=f"{comp_labels[k]} (μ={m:.3f} Å, σ={s:.3f} Å, w={w*100:.1f}%)",
                )

            ax.plot(x_eval, total_gmm_pdf, color="#112d23", linewidth=1.2, linestyle=":", label="GMM Mixture Sum")

        # Decision threshold vertical lines
        ax.axvline(
            thresholds.double_max,
            color="#b94a2b",
            linestyle="-.",
            linewidth=1.8,
            label=f"Valley T1: Double / Deloc ({thresholds.double_max:.3f} Å)",
        )
        ax.axvline(
            thresholds.aromatic_max,
            color="#2a5a8c",
            linestyle="-.",
            linewidth=1.8,
            label=f"Valley T2: Deloc / Single ({thresholds.aromatic_max:.3f} Å)",
        )

        # Shaded background intervals
        max_y = ax.get_ylim()[1]
        ax.axvspan(1.28, thresholds.double_max, color="#c2593f", alpha=0.08, label="Double-like Region (d ≤ T1)")
        ax.axvspan(thresholds.double_max, thresholds.aromatic_max, color="#2e7d5a", alpha=0.08, label="Delocalized Region (T1 < d < T2)")
        ax.axvspan(thresholds.aromatic_max, 1.72, color="#3b6998", alpha=0.08, label="Single-like Region (d ≥ T2)")

        ax.set_xlim(1.28, 1.70)
        ax.set_xlabel("C–C Bond Length d (Å)", fontsize=12, fontweight="bold", color="#143d2b")
        ax.set_ylabel("Probability Density", fontsize=12, fontweight="bold", color="#143d2b")
        ax.set_title(
            "2D Carbon Allotropes: C–C Bond Length Distribution & GMM Calibration",
            fontsize=13,
            fontweight="bold",
            color="#143d2b",
            pad=14,
        )

        ax.grid(True, linestyle=":", alpha=0.5, color="#cbdad0")
        ax.legend(loc="upper right", fontsize=8.5, framealpha=0.92, facecolor="#ffffff", edgecolor="#cbdad0")

        plt.tight_layout()
        plt.savefig(output_path, dpi=300)
        plt.close()
        print(f"  [Figure] Saved calibration plot: {output_path}")


# ==============================================================================
# MODULE 3: 2D PLANAR FACE RING PERCEPTION (PERIODIC POLYGON COUNTING)
# ==============================================================================

class PlanarRingPerceiver:
    """
    Computes exact elementary ring polygons for 2D carbon networks using
    a 2D supercell expansion and half-edge cyclic angle planar traversal.
    Completely eliminates nx.minimum_cycle_basis periodic boundary wraparound artifacts.
    """

    def __init__(self, cutoff: float = 1.85, supercell_size: Tuple[int, int] = (5, 5)):
        self.cutoff = cutoff
        self.supercell_size = supercell_size

    def perceive_rings(self, atoms: ase.Atoms) -> Tuple[Dict[int, int], Dict[int, float], float, float, float, Dict[int, float]]:
        """
        Finds elementary rings enclosing the central unit cell.
        Returns:
            - ring_counts: {k: count} for k-gons
            - ring_fractions: {k: fraction}
            - ring_entropy: Shannon entropy S_ring
            - non_hexagonal_fraction: 1.0 - f6
            - stone_wales_fraction: f5 + f7
            - ring_bond_spreads: {k: max_d - min_d for k-gon}
        """
        nx, ny = self.supercell_size
        sc = atoms * (nx, ny, 1)

        # 2D lattice projection in xy-plane
        cell2d = atoms.cell[:2, :2]
        inv_cell2d = np.linalg.inv(cell2d)

        pos = sc.positions[:, :2]
        n_sc = len(sc)

        # Build neighbor graph in supercell using KDTree
        tree = KDTree(pos)
        pairs = tree.query_pairs(r=self.cutoff)

        adj: Dict[int, List[int]] = {i: [] for i in range(n_sc)}
        for u, v in pairs:
            adj[u].append(v)
            adj[v].append(u)

        # Sort neighbor edges counter-clockwise by polar angle
        for u in adj:
            adj[u].sort(key=lambda v: np.arctan2(pos[v, 1] - pos[u, 1], pos[v, 0] - pos[u, 0]))

        # Construct next_edge half-edge mapping
        next_edge: Dict[Tuple[int, int], Tuple[int, int]] = {}
        for u in adj:
            for v in adj[u]:
                if u not in adj[v]:
                    continue
                idx_vu = adj[v].index(u)
                # Next edge turning most leftward is the cyclic predecessor in CCW order
                w = adj[v][(idx_vu - 1) % len(adj[v])]
                next_edge[(u, v)] = (v, w)

        # Traverse face cycles
        visited: Set[Tuple[int, int]] = set()
        faces: List[Dict[str, Any]] = []

        for start_edge in next_edge:
            if start_edge in visited:
                continue

            cycle: List[int] = []
            curr: Optional[Tuple[int, int]] = start_edge

            while curr is not None and curr not in visited:
                visited.add(curr)
                cycle.append(curr[0])
                curr = next_edge.get(curr)
                if len(cycle) > 30:  # Cap maximum ring size to prevent infinite loops
                    break

            if curr == start_edge and len(cycle) >= 3:
                xs = [pos[i, 0] for i in cycle]
                ys = [pos[i, 1] for i in cycle]

                # Signed area via shoelace formula
                area = 0.5 * sum(
                    xs[k] * ys[(k + 1) % len(cycle)] - xs[(k + 1) % len(cycle)] * ys[k]
                    for k in range(len(cycle))
                )

                if area > 0.05:  # Positive area indicates a finite interior face
                    cx, cy = float(np.mean(xs)), float(np.mean(ys))

                    # Map centroid back to relative fractional coordinates in central unit cell
                    frac = inv_cell2d @ np.array([cx, cy])
                    ox, oy = nx // 2, ny // 2
                    fx_rel = frac[0] - ox
                    fy_rel = frac[1] - oy

                    # Accept face if centroid resides inside the central unit cell [0, 1) x [0, 1)
                    if -1e-4 <= fx_rel < 1.0 - 1e-4 and -1e-4 <= fy_rel < 1.0 - 1e-4:
                        # Extract bond lengths along this polygon cycle
                        ring_bonds = []
                        for k in range(len(cycle)):
                            v1 = cycle[k]
                            v2 = cycle[(k + 1) % len(cycle)]
                            d_bond = float(np.linalg.norm(pos[v1] - pos[v2]))
                            ring_bonds.append(d_bond)

                        spread_ring = max(ring_bonds) - min(ring_bonds) if ring_bonds else 0.0

                        faces.append({
                            "size": len(cycle),
                            "area": area,
                            "centroid": (cx, cy),
                            "spread": spread_ring,
                        })

        # Collate polygon statistics
        ring_counts: Dict[int, int] = {}
        ring_spread_accum: Dict[int, List[float]] = {}

        for f in faces:
            sz = f["size"]
            ring_counts[sz] = ring_counts.get(sz, 0) + 1
            if sz not in ring_spread_accum:
                ring_spread_accum[sz] = []
            ring_spread_accum[sz].append(f["spread"])

        total_rings = sum(ring_counts.values()) or 1
        ring_fractions: Dict[int, float] = {
            k: round(cnt / total_rings, 5) for k, cnt in sorted(ring_counts.items())
        }

        # Shannon ring entropy: S_ring = - sum f_k ln(f_k)
        ring_entropy = 0.0
        for f_k in ring_fractions.values():
            if f_k > 1e-7:
                ring_entropy -= f_k * math.log(f_k)

        # Defect fractions
        f6 = ring_fractions.get(6, 0.0)
        non_hex_fraction = round(1.0 - f6, 5)
        stone_wales_fraction = round(ring_fractions.get(5, 0.0) + ring_fractions.get(7, 0.0), 5)

        # Mean bond spread per ring size
        ring_bond_spreads: Dict[int, float] = {
            k: round(float(np.mean(v)), 4) for k, v in ring_spread_accum.items()
        }

        return (
            ring_counts,
            ring_fractions,
            round(ring_entropy, 5),
            non_hex_fraction,
            stone_wales_fraction,
            ring_bond_spreads,
        )


# ==============================================================================
# MODULE 4: CONTINUOUS DESCRIPTORS & BOND CHARACTER CLASSIFICATION
# ==============================================================================

class ContinuousDescriptorCalculator:
    """
    Computes continuous Pauling bond orders, structure-level statistics,
    hybridization-specific bond character counts, and topological BLA.
    """

    @staticmethod
    def pauling_bond_order(distance: float) -> float:
        """
        Pauling empirical bond order: n_i = 10^((1.54 - d_i) / 0.71)
        - d = 1.54 A -> n = 1.00 (Single)
        - d = 1.425 A -> n = 1.45 (Graphene resonant aromatic)
        - d = 1.33 A -> n = 1.98 (Double)
        - d = 1.20 A -> n = 3.01 (Triple)
        """
        return float(10.0 ** ((1.54 - distance) / 0.71))

    @staticmethod
    def compute_descriptors(
        atoms: ase.Atoms,
        environments: List[AtomEnvironment],
        raw_bonds: List[Tuple[int, int, Tuple[int, int, int], float]],
        thresholds: CalibratedThresholds,
    ) -> Dict[str, Any]:
        """
        Extracts comprehensive per-structure bond descriptors, topological BLA,
        and hybridization-aware bond character breakdowns.
        """
        if not raw_bonds:
            return {}

        bond_lengths = [b[3] for b in raw_bonds]
        bl_arr = np.array(bond_lengths, dtype=float)

        # Continuous Pauling bond orders
        pauling_orders = [ContinuousDescriptorCalculator.pauling_bond_order(d) for d in bond_lengths]
        po_arr = np.array(pauling_orders, dtype=float)

        # Structure-level bond length statistics
        mean_d = float(np.mean(bl_arr))
        std_d = float(np.std(bl_arr))
        min_d = float(np.min(bl_arr))
        max_d = float(np.max(bl_arr))
        spread_d = float(max_d - min_d)

        # Topological Bond Length Alternation (BLA)
        # BLA = mean |d_i - d_j| over adjacent bonds sharing a common atom
        atom_to_bonds: Dict[int, List[float]] = {i: [] for i in range(len(atoms))}
        for u, v, _, d in raw_bonds:
            atom_to_bonds[u].append(d)
            atom_to_bonds[v].append(d)

        adjacent_diffs: List[float] = []
        for a, b_list in atom_to_bonds.items():
            if len(b_list) >= 2:
                for idx1 in range(len(b_list)):
                    for idx2 in range(idx1 + 1, len(b_list)):
                        adjacent_diffs.append(abs(b_list[idx1] - b_list[idx2]))

        bla = float(np.mean(adjacent_diffs)) if adjacent_diffs else 0.0

        # Structural uniformity flag: decoupled from bond character
        is_uniform_resonant = bool(spread_d < 0.030 or bla < 0.008)

        # Hybridization-aware bond classification
        # Classify each bond depending on the hybridization of its two terminal atoms
        classified_bonds: List[BondRecord] = []
        char_counts = {
            "double_like": 0,
            "delocalized": 0,
            "single_like": 0,
            "triple_like": 0,
            "sp_sp_single": 0,
            "sp_sp2_single": 0,
        }

        for u, v, off, d in raw_bonds:
            hyb_u = environments[u].hybridization
            hyb_v = environments[v].hybridization
            hyb_pair = tuple(sorted([hyb_u, hyb_v]))
            po = ContinuousDescriptorCalculator.pauling_bond_order(d)

            # 1. sp-sp linkages
            if hyb_u == "sp" and hyb_v == "sp":
                if d <= thresholds.triple_max:
                    char = "triple_like"
                else:
                    char = "sp_sp_single"

            # 2. sp-sp2 linkages
            elif (hyb_u == "sp" and "sp2" in hyb_v) or (hyb_v == "sp" and "sp2" in hyb_u):
                char = "sp_sp2_single"

            # 3. Standard sp2-sp2 linkages (primary 2D carbon networks)
            else:
                if d <= thresholds.double_max:
                    char = "double_like"
                elif d < thresholds.aromatic_max:
                    char = "delocalized"
                else:
                    char = "single_like"

            char_counts[char] = char_counts.get(char, 0) + 1
            classified_bonds.append(
                BondRecord(
                    atom_i=u,
                    atom_j=v,
                    offset=off,
                    length=round(d, 5),
                    pauling_order=round(po, 3),
                    hybridization_pair=hyb_pair,
                    character=char,
                )
            )

        total_b = len(raw_bonds)
        char_fractions = {
            k: round(cnt / total_b, 5) for k, cnt in char_counts.items()
        }

        # Deterministic primary bonding designation
        f_deloc = char_fractions["delocalized"]
        f_single = char_fractions["single_like"]
        f_double = char_fractions["double_like"]
        f_triple = char_fractions["triple_like"]

        if is_uniform_resonant and f_triple == 0:
            primary_bonding = "Uniform Resonant sp²"
        elif f_triple > 0:
            primary_bonding = "Acetylenic sp / sp²"
        elif f_double > 0 and f_single > 0 and f_deloc < 0.20:
            primary_bonding = "Localized Olefinic (C=C / C–C)"
        elif f_deloc >= 0.50 and f_single > 0.15:
            primary_bonding = "Delocalized sp² (Strained)"
        elif f_deloc >= 0.70:
            primary_bonding = "Resonant Aromatic sp²"
        elif f_double > 0:
            primary_bonding = "Mixed Olefinic / Aromatic sp²"
        else:
            primary_bonding = "Strained sp² Network"

        return {
            "total_bonds_unit_cell": total_b,
            "bond_length_mean": round(mean_d, 5),
            "bond_length_std": round(std_d, 5),
            "bond_length_min": round(min_d, 5),
            "bond_length_max": round(max_d, 5),
            "bond_length_spread": round(spread_d, 5),
            "bond_length_alternation_bla": round(bla, 5),
            "pauling_order_mean": round(float(np.mean(po_arr)), 3),
            "pauling_order_min": round(float(np.min(po_arr)), 3),
            "pauling_order_max": round(float(np.max(po_arr)), 3),
            "is_uniform_resonant": is_uniform_resonant,
            "primary_bonding": primary_bonding,
            "character_counts": char_counts,
            "character_fractions": char_fractions,
            "has_double_like": bool(char_counts["double_like"] > 0),
            "has_delocalized": bool(char_counts["delocalized"] > 0),
            "has_single_like": bool(char_counts["single_like"] > 0),
            "has_triple_like": bool(char_counts["triple_like"] > 0),
        }


# ==============================================================================
# MODULE 5: MASTER PIPELINE ORCHESTRATION & CATALOG EXPORT
# ==============================================================================

class AllotropesPipeline:
    """
    End-to-end preprocessing, calibration, descriptor extraction,
    and JSON catalog generator.
    """

    def __init__(
        self,
        cif_dir: Path,
        output_catalog_path: Path,
        calibration_plot_path: Path,
        cutoff: float = 1.85,
    ):
        self.cif_dir = cif_dir
        self.output_catalog_path = output_catalog_path
        self.calibration_plot_path = calibration_plot_path
        self.cutoff = cutoff

        self.parser = ASECIFParser(cutoff=self.cutoff)
        self.ring_perceiver = PlanarRingPerceiver(cutoff=self.cutoff, supercell_size=(5, 5))

    def run(self) -> Dict[str, Any]:
        """Executes the full preprocessing pipeline."""
        print(f"\n=======================================================")
        print(f" CARBON ATLAS: 2D ALLOTROPES PREPROCESSING PIPELINE")
        print(f"=======================================================")
        cif_files = sorted(self.cif_dir.glob("*.cif"))
        if not cif_files:
            raise FileNotFoundError(f"No .cif files found in {self.cif_dir}")

        print(f"Found {len(cif_files)} CIF structures in {self.cif_dir}")

        # PASS 1: Parse all structures, gather environments and unique bonds
        parsed_structures = []
        all_unique_lengths: List[float] = []

        print("\n[Pass 1/3] Parsing CIFs and building periodic neighbor graphs...")
        for idx, cf in enumerate(cif_files, 1):
            atoms, envs, raw_bonds = self.parser.parse_structure(cf)
            parsed_structures.append({
                "cif_path": cf,
                "atoms": atoms,
                "envs": envs,
                "raw_bonds": raw_bonds,
            })
            for _, _, _, dist in raw_bonds:
                all_unique_lengths.append(dist)

        print(f"  Total unique C–C bonds across dataset: {len(all_unique_lengths)}")

        # PASS 2: Dataset-wide GMM threshold calibration
        print("\n[Pass 2/3] Calibrating GMM decision boundaries and rendering plot...")
        thresholds = BondDistributionCalibrator.calibrate(all_unique_lengths)
        print(f"  GMM Means: {thresholds.gmm_means}")
        print(f"  Calibrated Valley Threshold T1 (Double/Deloc): {thresholds.double_max:.3f} Å")
        print(f"  Calibrated Valley Threshold T2 (Deloc/Single): {thresholds.aromatic_max:.3f} Å")

        BondDistributionCalibrator.plot_calibration(
            all_unique_lengths, thresholds, self.calibration_plot_path
        )

        # PASS 3: Extract continuous descriptors & planar face topology
        print("\n[Pass 3/3] Computing continuous descriptors and planar face ring topology...")
        catalog_entries = []

        for item in parsed_structures:
            cf: Path = item["cif_path"]
            atoms: ase.Atoms = item["atoms"]
            envs: List[AtomEnvironment] = item["envs"]
            raw_bonds = item["raw_bonds"]

            # 1. Bond descriptors
            bond_desc = ContinuousDescriptorCalculator.compute_descriptors(
                atoms, envs, raw_bonds, thresholds
            )

            # 2. Planar ring topology
            (
                ring_counts,
                ring_fractions,
                ring_entropy,
                non_hex_frac,
                stone_wales_frac,
                ring_spreads,
            ) = self.ring_perceiver.perceive_rings(atoms)

            # 3. Hybridization summary
            hyb_counts = {}
            for e in envs:
                hyb_counts[e.hybridization] = hyb_counts.get(e.hybridization, 0) + 1

            code_match = re.match(r"(g-\d+)", cf.stem)
            code = code_match.group(1).upper() if code_match else cf.stem.upper()

            entry = {
                "id": cf.stem,
                "code": code,
                "filename": cf.name,
                "natoms": len(atoms),
                "cell": {
                    "a": round(float(atoms.cell.lengths()[0]), 5),
                    "b": round(float(atoms.cell.lengths()[1]), 5),
                    "c": round(float(atoms.cell.lengths()[2]), 5),
                    "alpha": round(float(atoms.cell.angles()[0]), 2),
                    "beta": round(float(atoms.cell.angles()[1]), 2),
                    "gamma": round(float(atoms.cell.angles()[2]), 2),
                },
                "hybridization_breakdown": hyb_counts,
                "is_fully_sp2": all("sp2" in e.hybridization for e in envs),
                "bonding_descriptors": bond_desc,
                "ring_topology": {
                    "polygon_counts": ring_counts,
                    "polygon_fractions": ring_fractions,
                    "ring_entropy_shannon": ring_entropy,
                    "non_hexagonal_fraction": non_hex_frac,
                    "stone_wales_fraction": stone_wales_frac,
                    "ring_bond_spreads": ring_spreads,
                },
            }
            catalog_entries.append(entry)

        # Master output bundle
        master_output = {
            "metadata": {
                "description": "CarbonAtlas Calibrated 2D Carbon Allotropes Catalog",
                "total_structures": len(catalog_entries),
                "total_unique_bonds": len(all_unique_lengths),
                "functional": "PBE-DFT relaxed",
                "cutoff_radius_angstrom": self.cutoff,
                "calibrated_thresholds": {
                    "double_max": thresholds.double_max,
                    "aromatic_max": thresholds.aromatic_max,
                    "triple_max": thresholds.triple_max,
                    "gmm_means": thresholds.gmm_means,
                    "gmm_stds": thresholds.gmm_stds,
                    "gmm_weights": thresholds.gmm_weights,
                },
            },
            "structures": catalog_entries,
        }

        self.output_catalog_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_catalog_path, "w", encoding="utf-8") as f:
            json.dump(master_output, f, indent=2)

        print(f"\n[Success] Exported catalog with {len(catalog_entries)} entries to {self.output_catalog_path}")
        return master_output


# ==============================================================================
# CLI ENTRY POINT
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Preprocess 2D Carbon Allotrope CIF files and calibrate bond length distributions."
    )
    parser.add_argument(
        "--cif-dir",
        type=Path,
        default=Path("data/structures"),
        help="Directory containing relaxed .cif files (default: data/structures)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/allotropes_catalog.json"),
        help="Destination JSON catalog (default: data/allotropes_catalog.json)",
    )
    parser.add_argument(
        "--plot",
        type=Path,
        default=Path("reports/c_c_bond_distribution_calibration.png"),
        help="Destination path for GMM calibration plot (default: reports/c_c_bond_distribution_calibration.png)",
    )
    parser.add_argument(
        "--cutoff",
        type=float,
        default=1.85,
        help="C–C covalent bond cutoff radius in Angstroms (default: 1.85)",
    )

    args = parser.parse_args()
    pipeline = AllotropesPipeline(
        cif_dir=args.cif_dir,
        output_catalog_path=args.output,
        calibration_plot_path=args.plot,
        cutoff=args.cutoff,
    )
    pipeline.run()


if __name__ == "__main__":
    main()
