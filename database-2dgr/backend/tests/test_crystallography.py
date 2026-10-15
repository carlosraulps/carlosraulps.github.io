"""Unit tests for crystallography service and structure loading."""

import pytest
from backend.app.services.crystallography import (
    get_manifest,
    list_structures,
    get_structure_by_id,
    get_pymatgen_structure,
    compute_bond_statistics,
)


def test_manifest_integrity(manifest):
    """Verify that the manifest contains 61 validated structures and consistent keys."""
    assert manifest["total_structures"] == 61
    assert len(manifest["structures"]) == 61
    assert manifest["benchmark_biphenylene_ev"] == 0.456

    for item in manifest["structures"]:
        assert "id" in item
        assert "code" in item
        assert "name" in item
        assert "lattice" in item
        assert "atoms" in item
        assert "bonds" in item
        assert "delta_e_ev_per_atom" in item
        assert "provenance" in item
        assert len(item["atoms"]) == item["natoms"]
        assert item["lattice"]["a"] > 0
        assert item["lattice"]["b"] > 0
        assert max(item["lattice"]["a"], item["lattice"]["b"], item["lattice"]["c"]) >= 10.0  # Vacuum axis >= 10 A


def test_list_and_search_structures():
    """Verify text search and filtering functionality."""
    res_graph = list_structures(query="graphene")
    assert res_graph["total"] >= 1
    assert any(s["id"] == "graphene" for s in res_graph["structures"])

    res_hex = list_structures(crystal_system="Hexagonal")
    assert res_hex["total"] >= 16

    res_ring4 = list_structures(polygon_type=4)
    assert res_ring4["total"] > 0
    for s in res_ring4["structures"]:
        assert 4 in s["polygon_types"]

    res_bench = list_structures(under_benchmark=True)
    assert res_bench["total"] > 0
    for s in res_bench["structures"]:
        assert s["delta_e_ev_per_atom"] < 0.456


def test_get_structure_by_id(graphene_id, biphenylene_id):
    """Verify retrieval by ID and by Code."""
    g = get_structure_by_id(graphene_id)
    assert g is not None
    assert g["id"] == "graphene"
    assert g["code"] == "G-01"
    assert g["delta_e_ev_per_atom"] == 0.0

    b = get_structure_by_id("G-02")
    assert b is not None
    assert b["id"] == biphenylene_id
    assert b["delta_e_ev_per_atom"] == 0.456


def test_pymatgen_structure_and_bonds(biphenylene_id):
    """Verify that the structure object is physical and bonds conform to sp2 carbon."""
    struct = get_pymatgen_structure(biphenylene_id)
    assert len(struct) == 6
    stats = compute_bond_statistics(struct)
    assert stats["num_bonds"] >= 4
    assert 1.35 <= stats["mean_length_angstrom"] <= 1.55
