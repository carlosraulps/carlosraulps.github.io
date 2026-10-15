"""
Test suite for Geometric and Topological Descriptor Extraction.
Verifies bond lengths, bond angle MSD, ring fractions, Shannon entropy,
and strict intensive descriptor invariance under supercell replication.
"""

from pathlib import Path
import pytest
import numpy as np
from pymatgen.core import Structure

from backend.app.services.descriptors import (
    extract_all_descriptors,
    parse_girao_rings,
    compute_ring_entropy,
)

WS_ROOT = Path(__file__).resolve().parent.parent.parent


def test_graphene_ideal_sp2_descriptors():
    s_gr = Structure.from_file(WS_ROOT / "data" / "structures" / "g-01_graphene.cif")
    desc = extract_all_descriptors(s_gr, "h6_1", "graphene")

    assert abs(desc["bond_length_mean"] - 1.4248) < 0.005
    assert desc["bond_length_std"] < 0.001
    assert abs(desc["bond_angle_mean"] - 120.0) < 0.1
    assert desc["bond_angle_msd_120"] < 0.01  # zero angle strain
    assert desc["fraction_ring_6"] == 1.0
    assert desc["non_hexagonal_fraction"] == 0.0
    assert desc["ring_entropy"] == 0.0
    assert desc["mean_coordination"] == 3.0
    assert desc["fraction_coord3"] == 1.0
    assert desc["buckling_height_angstrom"] < 0.001


def test_biphenylene_strained_descriptors():
    s_biph = Structure.from_file(WS_ROOT / "data" / "structures" / "g-02_biphenylene.cif")
    desc = extract_all_descriptors(s_biph, "r4^1_6^1_8^1_47", "biphenylene")

    # 4-6-8 rings with 90 deg and ~145 deg angles
    assert desc["bond_angle_min"] <= 91.0
    assert desc["bond_angle_max"] >= 144.0
    assert desc["bond_angle_msd_120"] > 300.0  # significant angular strain
    assert desc["fraction_ring_4"] > 0.3
    assert desc["fraction_ring_6"] > 0.3
    assert desc["fraction_ring_8"] > 0.3
    assert desc["non_hexagonal_fraction"] > 0.65
    assert desc["ring_entropy"] > 1.0


def test_supercell_invariance():
    """Intensive physical and geometric descriptors must be invariant under cell expansion."""
    s = Structure.from_file(WS_ROOT / "data" / "structures" / "g-01_graphene.cif")
    s_2x2 = s.copy()
    s_2x2.make_supercell([2, 2, 1])

    d1 = extract_all_descriptors(s, "h6_1", "graphene")
    d2 = extract_all_descriptors(s_2x2, "h6_1", "graphene")

    assert abs(d1["area_per_atom"] - d2["area_per_atom"]) < 1e-4
    assert abs(d1["bond_length_mean"] - d2["bond_length_mean"]) < 1e-4
    assert abs(d1["bond_angle_mean"] - d2["bond_angle_mean"]) < 1e-4
    assert abs(d1["bond_angle_msd_120"] - d2["bond_angle_msd_120"]) < 1e-4
    assert abs(d1["mean_coordination"] - d2["mean_coordination"]) < 1e-4
    assert abs(d1["fraction_coord3"] - d2["fraction_coord3"]) < 1e-4
    assert abs(d1["ring_entropy"] - d2["ring_entropy"]) < 1e-4
    assert abs(d1["fraction_single_bonds"] - d2["fraction_single_bonds"]) < 1e-4
    assert abs(d1["fraction_double_bonds"] - d2["fraction_double_bonds"]) < 1e-4
    assert abs(d1["fraction_aromatic_bonds"] - d2["fraction_aromatic_bonds"]) < 1e-4


def test_covalent_bonding_characterization():
    """Verify primary literature bond order assignments."""
    s_gr = Structure.from_file(WS_ROOT / "data" / "structures" / "g-01_graphene.cif")
    desc_gr = extract_all_descriptors(s_gr, "h6_1", "graphene")
    assert desc_gr["has_aromatic_bonds"] is True
    assert desc_gr["is_pure_aromatic"] is True
    assert desc_gr["has_single_bonds"] is False
    assert desc_gr["has_double_bonds"] is False
    assert desc_gr["fraction_aromatic_bonds"] == 1.0
    assert "pure_aromatic" in desc_gr["bonding_types"]

    s_biph = Structure.from_file(WS_ROOT / "data" / "structures" / "g-02_biphenylene.cif")
    desc_biph = extract_all_descriptors(s_biph, "r4^1_6^1_8^1_47", "biphenylene")
    # Biphenylene has cyclobutadiene 4-ring single bonds (d > 1.455 A) and double/aromatic bonds
    assert desc_biph["has_single_bonds"] is True
    assert desc_biph["single_bonds_count"] > 0
    assert desc_biph["fraction_single_bonds"] > 0.0
    assert "single" in desc_biph["bonding_types"]

