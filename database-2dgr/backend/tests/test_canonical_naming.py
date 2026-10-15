"""
Test suite for Canonical Naming, Duplicate Mapping, and Alias Resolution.
Validates the 53 canonical unique allotropes and 8 duplicate aliases (13.1% compute savings).
"""

import json
from pathlib import Path
import pytest
from backend.app.services.canonical_catalog import (
    DUPLICATE_MAP,
    CANONICAL_LITERATURE_METADATA,
    is_canonical_structure,
    resolve_canonical_id,
    get_canonical_group,
    compute_savings_summary,
)


def test_duplicate_counts_and_savings():
    summary = compute_savings_summary(61, 53)
    assert summary["total_catalog_entries"] == 61
    assert summary["unique_canonical_structures"] == 53
    assert summary["duplicate_entries"] == 8
    assert abs(summary["compute_savings_percentage"] - 13.11) < 0.1


def test_canonical_identification_and_resolution():
    # Canonical structures
    assert is_canonical_structure("graphene") is True
    assert is_canonical_structure("biphenylene") is True
    assert is_canonical_structure("c5^2_7^2_65") is True
    assert is_canonical_structure("r5^2_6^6_7^2_51") is True

    # Duplicates / aliases
    assert is_canonical_structure("G-03") is False
    assert resolve_canonical_id("G-03") == "graphene"
    assert resolve_canonical_id("h6^1_191") == "graphene"

    assert is_canonical_structure("beta_gr") is False
    assert resolve_canonical_id("beta_gr") == "biphenylene"
    assert resolve_canonical_id("G-13") == "biphenylene"
    assert resolve_canonical_id("r4^1_6^1_8^1_47") == "biphenylene"

    assert resolve_canonical_id("pentaheptite") == "c5^2_7^2_65"
    assert resolve_canonical_id("cmmm_graphene") == "c5^2_6^4_8^1_65"
    assert resolve_canonical_id("phagraphene") == "r5^2_6^6_7^2_51"
    assert resolve_canonical_id("alpha_gr") == "r5^2_6^6_7^2_51"
    assert resolve_canonical_id("h4^3_6^2_12^1_191") == "graphenylene"


def test_canonical_groups():
    group_biph = get_canonical_group("biphenylene")
    assert "biphenylene" in group_biph
    assert "beta_gr" in group_biph
    assert "r4^1_6^1_8^1_47" in group_biph


def test_manifest_contains_canonical_metadata():
    manifest_p = Path(__file__).resolve().parent.parent.parent / "data" / "manifest.json"
    assert manifest_p.exists()
    with open(manifest_p, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["unique_canonical_count"] == 53
    assert manifest["duplicate_count"] == 8

    canon_count = sum(1 for s in manifest["structures"] if s.get("is_canonical") is True)
    assert canon_count == 53

    # Check G-01 vs G-03
    s_g01 = next(s for s in manifest["structures"] if s["code"] == "G-01")
    s_g03 = next(s for s in manifest["structures"] if s["code"] == "G-03")
    assert s_g01["is_canonical"] is True
    assert s_g03["is_canonical"] is False
    assert s_g03["canonical_id"] == "graphene"


def test_canonical_and_alias_energies_synchronization():
    manifest_p = Path(__file__).resolve().parent.parent.parent / "data" / "manifest.json"
    with open(manifest_p, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    by_id = {s["id"]: s for s in manifest["structures"]}

    # Verify every alias has identical delta_e to its canonical counterpart
    for s in manifest["structures"]:
        if not s.get("is_canonical", True):
            alias_id = s["id"]
            canon_id = s.get("canonical_id")
            assert canon_id in by_id, f"Canonical ID {canon_id} missing from manifest"
            canon_struct = by_id[canon_id]

            alias_energy = s.get("delta_e_ev_per_atom")
            canon_energy = canon_struct.get("delta_e_ev_per_atom")

            assert alias_energy is not None, f"Alias {alias_id} missing delta_e_ev_per_atom"
            assert canon_energy is not None, f"Canonical {canon_id} missing delta_e_ev_per_atom"
            assert round(float(alias_energy), 4) == round(float(canon_energy), 4), (
                f"Energy mismatch: alias {alias_id} has {alias_energy} but canonical {canon_id} has {canon_energy}"
            )


def test_verified_literature_energies_ground_truth():
    manifest_p = Path(__file__).resolve().parent.parent.parent / "data" / "manifest.json"
    with open(manifest_p, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    by_id = {s["id"]: s for s in manifest["structures"]}

    # Verified literature values from Girão et al., Carbon 203 (2023) Tables 1 and 2
    assert by_id["graphene"]["delta_e_ev_per_atom"] == 0.000
    assert by_id["h6^1_191"]["delta_e_ev_per_atom"] == 0.000

    assert by_id["biphenylene"]["delta_e_ev_per_atom"] == 0.456
    assert by_id["beta_gr"]["delta_e_ev_per_atom"] == 0.456
    assert by_id["r4^1_6^1_8^1_47"]["delta_e_ev_per_atom"] == 0.456

    assert by_id["r5^2_6^6_7^2_51"]["delta_e_ev_per_atom"] == 0.193
    assert by_id["phagraphene"]["delta_e_ev_per_atom"] == 0.193
    assert by_id["alpha_gr"]["delta_e_ev_per_atom"] == 0.193

    assert by_id["c5^2_7^2_65"]["delta_e_ev_per_atom"] == 0.239
    assert by_id["pentaheptite"]["delta_e_ev_per_atom"] == 0.239

    assert by_id["c5^2_6^4_8^1_65"]["delta_e_ev_per_atom"] == 0.236
    assert by_id["cmmm_graphene"]["delta_e_ev_per_atom"] == 0.236

    assert by_id["graphenylene"]["delta_e_ev_per_atom"] == 0.622
    assert by_id["h4^3_6^2_12^1_191"]["delta_e_ev_per_atom"] == 0.622

    assert by_id["photh_graphene"]["delta_e_ev_per_atom"] == 0.539


def test_catalog_json_synchronization():
    cat_p = Path(__file__).resolve().parent.parent.parent / "data" / "catalog.json"
    with open(cat_p, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    cat_by_id = {item["id"]: item for item in catalog}
    assert cat_by_id["biphenylene"]["delta_e_ev"] == 0.456
    assert cat_by_id["beta_gr"]["delta_e_ev"] == 0.456
    assert cat_by_id["graphene"]["delta_e_ev"] == 0.000
    assert cat_by_id["phagraphene"]["delta_e_ev"] == 0.193
    assert cat_by_id["alpha_gr"]["delta_e_ev"] == 0.193
    assert cat_by_id["cmmm_graphene"]["delta_e_ev"] == 0.236
    assert cat_by_id["pentaheptite"]["delta_e_ev"] == 0.239
    assert cat_by_id["graphenylene"]["delta_e_ev"] == 0.622

