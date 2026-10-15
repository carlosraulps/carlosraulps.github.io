"""
Test suite for 2D Sheet Plane Standardization and Normal Vector Detection.
Verifies that all 12 non-z oriented structures are correctly rotated to z-normal,
that sheets lie in xy-plane, and right-handedness (det > 0) is strictly maintained.
"""

import glob
from pathlib import Path
import pytest
import numpy as np
from pymatgen.core import Structure
from backend.app.services.plane_standardizer import detect_normal_axis, rotate_slab_to_z

WS_ROOT = Path(__file__).resolve().parent.parent.parent


def test_graphene_is_already_z_normal():
    cif_p = WS_ROOT / "data" / "structures" / "g-01_graphene.cif"
    s = Structure.from_file(cif_p)
    det = detect_normal_axis(s)
    assert det["normal_axis"] == "z"
    assert s.lattice.c > 15.0


def test_cyclic_rotation_preserves_right_handedness():
    cif_p = WS_ROOT / "data" / "structures" / "g-07_r5^2_6^6_7^2_51.cif"
    s = Structure.from_file(cif_p)
    # Even after being rotated, rotation service should be idempotent
    s_rot, meta = rotate_slab_to_z(s)
    assert np.linalg.det(s_rot.lattice.matrix) > 0.0
    det = detect_normal_axis(s_rot)
    assert det["normal_axis"] == "z"


def test_all_structures_in_dataset_are_z_normal():
    cifs = list((WS_ROOT / "data" / "structures").glob("*.cif"))
    assert len(cifs) == 61

    from backend.app.services.plane_standardizer import pbc_span
    for cf in cifs:
        s = Structure.from_file(cf)
        det = detect_normal_axis(s)
        assert det["normal_axis"] == "z", f"File {cf.name} is not z-normal! Detected: {det['normal_axis']}"
        z_span = pbc_span([site.frac_coords[2] for site in s], s.lattice.c)
        assert z_span < 2.0, f"File {cf.name} has non-planar periodic z_span: {z_span}"
        assert s.lattice.c >= 14.5, f"File {cf.name} vacuum c is too small: {s.lattice.c}"

