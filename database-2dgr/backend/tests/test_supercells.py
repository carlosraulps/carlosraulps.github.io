"""Unit tests for supercell generation and scaling validation."""

import pytest
from backend.app.services.crystallography import get_pymatgen_structure
from backend.app.services.supercells import build_supercell


def test_graphene_2x2_and_4x4(graphene_id):
    """Verify supercell generation scales atoms and cell vectors correctly on Graphene."""
    base = get_pymatgen_structure(graphene_id)
    assert len(base) == 2

    # 2x2 supercell
    sc_2x2, meta_2x2 = build_supercell(base, scale_x=2, scale_y=2, scale_z=1)
    assert len(sc_2x2) == 8
    assert meta_2x2["num_atoms"] == 8
    assert pytest.approx(sc_2x2.lattice.a, 0.01) == base.lattice.a * 2
    assert pytest.approx(sc_2x2.lattice.b, 0.01) == base.lattice.b * 2
    assert pytest.approx(sc_2x2.lattice.c, 0.01) == base.lattice.c

    # 4x4 supercell
    sc_4x4, meta_4x4 = build_supercell(base, scale_x=4, scale_y=4, scale_z=1)
    assert len(sc_4x4) == 32
    assert meta_4x4["num_atoms"] == 32
    assert pytest.approx(sc_4x4.lattice.a, 0.01) == base.lattice.a * 4
    assert pytest.approx(sc_4x4.lattice.b, 0.01) == base.lattice.b * 4


def test_biphenylene_supercell(biphenylene_id):
    """Verify supercell on Biphenylene network."""
    base = get_pymatgen_structure(biphenylene_id)
    assert len(base) == 6

    sc, meta = build_supercell(base, scale_x=2, scale_y=2, scale_z=1)
    assert len(sc) == 24
    assert meta["num_bonds"] > 0
    # Every atom in the supercell should have valid coordinates
    for atom in meta["atoms"]:
        assert len(atom["position"]) == 3
        assert len(atom["frac_coords"]) == 3


def test_invalid_scaling_raises_error(graphene_id):
    """Verify bounds checking on scale factors."""
    base = get_pymatgen_structure(graphene_id)
    with pytest.raises(ValueError):
        build_supercell(base, scale_x=0, scale_y=2)
    with pytest.raises(ValueError):
        build_supercell(base, scale_x=10, scale_y=10)
