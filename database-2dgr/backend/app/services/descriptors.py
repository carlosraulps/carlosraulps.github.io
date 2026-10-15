"""
Geometric and Topological Descriptor Extraction Service for 2D Carbon Allotropes.
Computes in-plane lattice metrics, bond length distributions, bond angle distortions,
buckling heights, ring fractions, and Shannon entropy for ML regression.
"""

from __future__ import annotations
import math
import re
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from pymatgen.core import Structure


def parse_girao_rings(symbol_or_code: str, default_id: str = "") -> Tuple[Dict[int, int], Dict[int, float]]:
    """
    Parses polygon ring sizes and counts from Girão taxonomy notation (e.g., r4^1_6^1_8^1_47 -> 4:1, 6:1, 8:1).
    Falls back to canonical literature benchmarks if no exponents are present.
    Returns (ring_counts, ring_fractions).
    """
    matches = re.findall(r"(\d+)\^(\d+)", symbol_or_code)
    rings: Dict[int, int] = {}
    if matches:
        for ring_size_str, count_str in matches:
            r = int(ring_size_str)
            c = int(count_str)
            rings[r] = rings.get(r, 0) + c
    else:
        # Fallback for benchmarks with plain names
        benchmark_lower = default_id.lower() or symbol_or_code.lower()
        if "graphene" in benchmark_lower and "photh" not in benchmark_lower and "pha" not in benchmark_lower:
            rings = {6: 1}
        elif "biphenylene" in benchmark_lower or "beta_gr" in benchmark_lower:
            rings = {4: 1, 6: 1, 8: 1}
        elif "pentaheptite" in benchmark_lower:
            rings = {5: 2, 7: 2}
        elif "phagraphene" in benchmark_lower or "alpha_gr" in benchmark_lower:
            rings = {5: 2, 6: 6, 7: 2}
        elif "cmmm_graphene" in benchmark_lower:
            rings = {5: 2, 6: 4, 8: 1}
        elif "photh" in benchmark_lower:
            rings = {4: 2, 6: 2, 8: 2}
        elif "graphenylene" in benchmark_lower:
            rings = {4: 3, 6: 2, 12: 1}
        else:
            rings = {6: 1}

    total = sum(rings.values())
    fractions: Dict[int, float] = {
        r: round(c / total, 5) for r, c in rings.items()
    }
    return rings, fractions


def compute_ring_entropy(ring_fractions: Dict[int, float]) -> float:
    """
    Computes Shannon topological disorder entropy of ring distributions:
    S_ring = - sum_k f_k * ln(f_k)
    For pristine graphene (all 6-membered rings), S_ring = 0.
    """
    entropy = 0.0
    for f in ring_fractions.values():
        if f > 1e-7:
            entropy -= f * math.log(f)
    return round(float(entropy), 5)


def extract_bond_metrics(
    structure: Structure,
    r_cut: float = 1.85,
) -> Dict[str, Any]:
    """
    Extracts periodic C-C bond length and C-C-C bond angle distributions using Pymatgen.
    Returns summary statistics including Mean Squared Deviation from ideal 120° sp2 planar angle.
    """
    bond_lengths: List[float] = []
    bond_angles: List[float] = []
    coordinations: List[int] = []

    for i, site in enumerate(structure):
        neighbors = structure.get_neighbors(site, r=r_cut)
        coordinations.append(len(neighbors))

        # Bond lengths
        for n in neighbors:
            if n.index > i:  # avoid double counting
                bond_lengths.append(float(n.nn_distance))

        # Bond angles around current site
        if len(neighbors) >= 2:
            vecs = [n.coords - site.coords for n in neighbors]
            normalized = [v / np.linalg.norm(v) for v in vecs]
            for j in range(len(normalized)):
                for k in range(j + 1, len(normalized)):
                    cos_theta = np.clip(np.dot(normalized[j], normalized[k]), -1.0, 1.0)
                    deg = float(np.degrees(np.arccos(cos_theta)))
                    bond_angles.append(deg)

    if not bond_lengths:
        bl_arr = np.array([1.42], dtype=float)
    else:
        bl_arr = np.array(bond_lengths, dtype=float)

    if not bond_angles:
        ba_arr = np.array([120.0], dtype=float)
    else:
        ba_arr = np.array(bond_angles, dtype=float)

    # Angle deviation from ideal 120.0 degrees
    diff_120 = ba_arr - 120.0
    msd_120 = float(np.mean(diff_120 ** 2))
    rmsd_120 = float(np.sqrt(msd_120))

    mean_coord = float(np.mean(coordinations)) if coordinations else 3.0
    frac_c3 = float(np.mean([1.0 if c == 3 else 0.0 for c in coordinations])) if coordinations else 1.0

    # Continuous Pauling empirical bond order: n_i = 10^((1.54 - d_i) / 0.71)
    pauling_orders = 10.0 ** ((1.54 - bl_arr) / 0.71)
    po_mean = float(np.mean(pauling_orders))
    po_min = float(np.min(pauling_orders))
    po_max = float(np.max(pauling_orders))

    # Topological Bond Length Alternation (BLA)
    # Mean |d_i - d_j| over adjacent bonds sharing an atom
    adjacent_diffs: List[float] = []
    for i, site in enumerate(structure):
        neighbors = structure.get_neighbors(site, r=r_cut)
        if len(neighbors) >= 2:
            n_dists = [float(n.nn_distance) for n in neighbors]
            for j in range(len(n_dists)):
                for k in range(j + 1, len(n_dists)):
                    adjacent_diffs.append(abs(n_dists[j] - n_dists[k]))
    bla = float(np.mean(adjacent_diffs)) if adjacent_diffs else 0.0

    # Calibrated decision thresholds (GMM valleys)
    # double_like: d <= 1.375 A
    # delocalized / aromatic: 1.375 < d < 1.455 A
    # single_like: d >= 1.455 A
    # triple_like: d <= 1.250 A
    n_single = int(np.sum(bl_arr >= 1.455))
    n_double = int(np.sum(bl_arr <= 1.375))
    n_aromatic = int(np.sum((bl_arr > 1.375) & (bl_arr < 1.455)))
    n_triple = int(np.sum(bl_arr <= 1.250))
    total_b = len(bl_arr) if len(bl_arr) > 0 else 1

    spread_d = float(np.max(bl_arr) - np.min(bl_arr))
    is_uniform_resonant = bool(spread_d < 0.030 or bla < 0.008)

    has_single = bool(n_single > 0)
    has_double = bool(n_double > 0)
    has_aromatic = bool(n_aromatic > 0)
    has_triple = bool(n_triple > 0)

    b_types = []
    if has_single:
        b_types.append("single")
    if has_double:
        b_types.append("double")
    if has_aromatic:
        b_types.append("aromatic")
    if has_triple:
        b_types.append("triple")
    if is_uniform_resonant:
        b_types.append("pure_aromatic")

    f_deloc = float(n_aromatic / total_b)
    f_single = float(n_single / total_b)
    f_double = float(n_double / total_b)
    f_triple = float(n_triple / total_b)

    if is_uniform_resonant and f_triple == 0:
        primary_bonding = "Uniform Resonant sp²"
    elif f_triple > 0:
        primary_bonding = "Acetylenic sp / sp²"
    elif f_double >= 0.15 and f_single >= 0.15 and f_deloc <= 0.30:
        primary_bonding = "Localized Olefinic (C=C / C–C)"
    elif f_deloc >= 0.50 and f_single >= 0.15:
        primary_bonding = "Delocalized sp² (Strained)"
    elif f_deloc >= 0.65:
        primary_bonding = "Resonant Aromatic sp²"
    elif f_double > 0:
        primary_bonding = "Mixed Olefinic / Aromatic sp²"
    else:
        primary_bonding = "Strained sp² Network"

    return {
        "bond_length_mean": round(float(np.mean(bl_arr)), 5),
        "bond_length_std": round(float(np.std(bl_arr)), 5),
        "bond_length_min": round(float(np.min(bl_arr)), 5),
        "bond_length_max": round(float(np.max(bl_arr)), 5),
        "bond_length_span": round(spread_d, 5),
        "bond_length_alternation_bla": round(bla, 5),
        "pauling_order_mean": round(po_mean, 3),
        "pauling_order_min": round(po_min, 3),
        "pauling_order_max": round(po_max, 3),
        "bond_angle_mean": round(float(np.mean(ba_arr)), 3),
        "bond_angle_std": round(float(np.std(ba_arr)), 3),
        "bond_angle_min": round(float(np.min(ba_arr)), 3),
        "bond_angle_max": round(float(np.max(ba_arr)), 3),
        "bond_angle_msd_120": round(msd_120, 3),
        "bond_angle_rmsd_120": round(rmsd_120, 3),
        "mean_coordination": round(mean_coord, 3),
        "fraction_coord3": round(frac_c3, 4),
        "single_bonds_count": n_single,
        "double_bonds_count": n_double,
        "aromatic_bonds_count": n_aromatic,
        "triple_bonds_count": n_triple,
        "fraction_single_bonds": round(f_single, 4),
        "fraction_double_bonds": round(f_double, 4),
        "fraction_aromatic_bonds": round(f_deloc, 4),
        "fraction_triple_bonds": round(f_triple, 4),
        "has_single_bonds": has_single,
        "has_double_bonds": has_double,
        "has_aromatic_bonds": has_aromatic,
        "has_triple_bonds": has_triple,
        "is_pure_aromatic": is_uniform_resonant,
        "is_uniform_resonant": is_uniform_resonant,
        "bonding_types": b_types,
        "primary_bonding": primary_bonding,
    }


def extract_lattice_and_density_metrics(structure: Structure) -> Dict[str, Any]:
    """
    Extracts in-plane unit cell geometry, area per atom, and buckling height.
    Assumes structure has been standardized to z-normal.
    """
    a = float(structure.lattice.a)
    b = float(structure.lattice.b)
    c = float(structure.lattice.c)
    alpha = float(structure.lattice.alpha)
    beta = float(structure.lattice.beta)
    gamma = float(structure.lattice.gamma)

    # In-plane area: a * b * sin(gamma)
    gamma_rad = math.radians(gamma)
    planar_area = a * b * math.sin(gamma_rad)
    natoms = len(structure)
    area_per_atom = planar_area / natoms if natoms > 0 else 0.0
    atomic_area_density = natoms / planar_area if planar_area > 0 else 0.0

    # Volume and 3D density
    vol = float(structure.lattice.volume)
    # Mass of Carbon = 12.011 g/mol
    # Avogadro = 6.02214076e23
    # 1 A^3 = 1e-24 cm^3
    carbon_mass_g = (natoms * 12.011) / 6.02214076e23
    density_g_cm3 = carbon_mass_g / (vol * 1e-24) if vol > 0 else 0.0

    # Buckling height along z using periodic boundary conditions
    from backend.app.services.plane_standardizer import pbc_span
    buckling_height = pbc_span([float(site.frac_coords[2]) for site in structure], c)

    return {
        "lattice_a": round(a, 5),
        "lattice_b": round(b, 5),
        "lattice_c": round(c, 5),
        "in_plane_ratio_b_a": round(b / a, 5) if a > 0 else 1.0,
        "lattice_alpha": round(alpha, 3),
        "lattice_beta": round(beta, 3),
        "lattice_gamma": round(gamma, 3),
        "cell_volume": round(vol, 4),
        "planar_area": round(planar_area, 4),
        "natoms": natoms,
        "area_per_atom": round(area_per_atom, 5),
        "atomic_area_density": round(atomic_area_density, 5),
        "density_g_cm3": round(density_g_cm3, 4),
        "buckling_height_angstrom": round(buckling_height, 5),
    }



def extract_all_descriptors(
    structure: Structure,
    girao_symbol_or_code: str = "",
    default_id: str = "",
) -> Dict[str, Any]:
    """
    Extracts the full battery of geometric, topological, and crystallographic descriptors
    for a standardized 2D carbon allotrope structure.
    """
    lat_metrics = extract_lattice_and_density_metrics(structure)
    bond_metrics = extract_bond_metrics(structure)
    rings, fractions = parse_girao_rings(girao_symbol_or_code, default_id=default_id)
    entropy = compute_ring_entropy(fractions)

    f6 = fractions.get(6, 0.0)
    non_hex = round(1.0 - f6, 5)
    f4 = fractions.get(4, 0.0)
    f5 = fractions.get(5, 0.0)
    f7 = fractions.get(7, 0.0)
    f8 = fractions.get(8, 0.0)
    stone_wales = round(f5 + f7, 5)

    ring_metrics = {
        "rings": rings,
        "ring_fractions": fractions,
        "ring_entropy": entropy,
        "fraction_ring_4": f4,
        "fraction_ring_5": f5,
        "fraction_ring_6": f6,
        "fraction_ring_7": f7,
        "fraction_ring_8": f8,
        "non_hexagonal_fraction": non_hex,
        "stone_wales_fraction": stone_wales,
        "cyclobutadiene_fraction": f4,
    }

    combined: Dict[str, Any] = {}
    combined.update(lat_metrics)
    combined.update(bond_metrics)
    combined.update(ring_metrics)
    return combined
