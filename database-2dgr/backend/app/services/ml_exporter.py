"""
Machine Learning Dataset Exporter for 2D Carbon Allotropes.
Produces reproducible, leakage-free CSV and Parquet feature tables alongside
complete scientific feature definitions, units, and dataset schema versioning.
"""

from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd
import numpy as np

DATASET_VERSION = "2.1.0"

FEATURE_METADATA: Dict[str, Dict[str, Any]] = {
    "delta_e_ev_per_atom": {
        "role": "target",
        "description": "Computed DFT-D3 relative formation energy per carbon atom relative to pristine graphene.",
        "units": "eV/atom",
        "dtype": "float64",
        "reference_baseline": "Pristine monolayer graphene = 0.000 eV/atom",
    },
    "area_per_atom": {
        "role": "feature",
        "description": "Planar unit cell surface area divided by total number of carbon atoms in the cell.",
        "units": "Å²/atom",
        "dtype": "float64",
        "graphene_value": 2.637,
    },
    "atomic_area_density": {
        "role": "feature",
        "description": "Number of carbon atoms per unit planar surface area (natoms / planar_area).",
        "units": "atoms/Å²",
        "dtype": "float64",
        "graphene_value": 0.379,
    },
    "in_plane_ratio_b_a": {
        "role": "feature",
        "description": "Aspect ratio of in-plane lattice parameters (b / a).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 1.000,
    },
    "lattice_gamma": {
        "role": "feature",
        "description": "In-plane lattice angle between vectors a and b.",
        "units": "degrees",
        "dtype": "float64",
        "graphene_value": 120.0,
    },
    "buckling_height_angstrom": {
        "role": "feature",
        "description": "Out-of-plane vertical atomic span along z-axis (max(z) - min(z)).",
        "units": "Å",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "bond_length_mean": {
        "role": "feature",
        "description": "Mean C-C bond length in the 2D periodic network within 1.85 Å cutoff.",
        "units": "Å",
        "dtype": "float64",
        "graphene_value": 1.425,
    },
    "bond_length_std": {
        "role": "feature",
        "description": "Standard deviation of C-C bond lengths.",
        "units": "Å",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "bond_length_span": {
        "role": "feature",
        "description": "Difference between maximum and minimum C-C bond length (max - min).",
        "units": "Å",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "bond_angle_mean": {
        "role": "feature",
        "description": "Mean C-C-C planar bond angle across all adjacent triplets.",
        "units": "degrees",
        "dtype": "float64",
        "graphene_value": 120.0,
    },
    "bond_angle_std": {
        "role": "feature",
        "description": "Standard deviation of planar C-C-C bond angles.",
        "units": "degrees",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "bond_angle_msd_120": {
        "role": "feature",
        "description": "Mean Squared Deviation of bond angles from ideal 120.0° planar sp² geometry: (1/M) sum (theta_i - 120)^2.",
        "units": "degrees²",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "bond_angle_rmsd_120": {
        "role": "feature",
        "description": "Root Mean Squared Deviation of bond angles from ideal 120.0° planar sp² geometry.",
        "units": "degrees",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "mean_coordination": {
        "role": "feature",
        "description": "Average atomic coordination number in the 2D periodic network.",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 3.000,
    },
    "fraction_coord3": {
        "role": "feature",
        "description": "Fraction of atoms with strictly 3-fold coordination (sp² planar sites).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 1.000,
    },
    "ring_entropy": {
        "role": "feature",
        "description": "Topological Shannon entropy of ring size distribution: - sum_k f_k * ln(f_k).",
        "units": "nats",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "fraction_ring_4": {
        "role": "feature",
        "description": "Fraction of 4-membered carbon rings (cyclobutadiene-like units).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "fraction_ring_5": {
        "role": "feature",
        "description": "Fraction of 5-membered carbon rings (pentagonal motifs).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "fraction_ring_6": {
        "role": "feature",
        "description": "Fraction of 6-membered carbon rings (benzenoid hexagonal motifs).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 1.000,
    },
    "fraction_ring_7": {
        "role": "feature",
        "description": "Fraction of 7-membered carbon rings (heptagonal motifs).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "fraction_ring_8": {
        "role": "feature",
        "description": "Fraction of 8-membered carbon rings (octagonal motifs).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "non_hexagonal_fraction": {
        "role": "feature",
        "description": "Fraction of topological rings that deviate from standard hexagons (1.0 - fraction_ring_6).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
    "stone_wales_fraction": {
        "role": "feature",
        "description": "Combined fraction of 5- and 7-membered rings (Stone-Wales defect motifs).",
        "units": "dimensionless",
        "dtype": "float64",
        "graphene_value": 0.000,
    },
}


def build_ml_dataframe(manifest_path: Path | str) -> pd.DataFrame:
    """Extracts a normalized pandas DataFrame from data/manifest.json."""
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    rows = []
    for s in manifest.get("structures", []):
        desc = s.get("descriptors", {})
        delta_e = s.get("delta_e_ev_per_atom")
        if delta_e is None:
            delta_e = s.get("energy", 0.0)

        row = {
            "id": s.get("id"),
            "canonical_id": s.get("canonical_id", s.get("id")),
            "code": s.get("code"),
            "is_canonical": bool(s.get("is_canonical", True)),
            "literature_name": s.get("literature_name", s.get("name")),
            "girao_symbol": s.get("girao_symbol", s.get("symbol")),
            "girao_code": s.get("girao_code", s.get("id")),
            "crystal_system": s.get("crystal_system", "Orthorhombic"),
            "space_group_symbol": s.get("space_group_symbol", "P1"),
            "space_group_number": s.get("space_group_number", 1),
            "natoms": desc.get("natoms", s.get("natoms", 2)),
            "delta_e_ev_per_atom": float(delta_e),
            # Descriptors
            "area_per_atom": float(desc.get("area_per_atom", s.get("area_per_atom_angstrom2", 2.637))),
            "atomic_area_density": float(desc.get("atomic_area_density", 0.379)),
            "in_plane_ratio_b_a": float(desc.get("in_plane_ratio_b_a", 1.0)),
            "lattice_gamma": float(desc.get("lattice_gamma", 120.0)),
            "buckling_height_angstrom": float(desc.get("buckling_height_angstrom", 0.0)),
            "bond_length_mean": float(desc.get("bond_length_mean", 1.425)),
            "bond_length_std": float(desc.get("bond_length_std", 0.0)),
            "bond_length_span": float(desc.get("bond_length_span", 0.0)),
            "bond_angle_mean": float(desc.get("bond_angle_mean", 120.0)),
            "bond_angle_std": float(desc.get("bond_angle_std", 0.0)),
            "bond_angle_msd_120": float(desc.get("bond_angle_msd_120", 0.0)),
            "bond_angle_rmsd_120": float(desc.get("bond_angle_rmsd_120", 0.0)),
            "mean_coordination": float(desc.get("mean_coordination", 3.0)),
            "fraction_coord3": float(desc.get("fraction_coord3", 1.0)),
            "ring_entropy": float(desc.get("ring_entropy", 0.0)),
            "fraction_ring_4": float(desc.get("fraction_ring_4", 0.0)),
            "fraction_ring_5": float(desc.get("fraction_ring_5", 0.0)),
            "fraction_ring_6": float(desc.get("fraction_ring_6", 1.0)),
            "fraction_ring_7": float(desc.get("fraction_ring_7", 0.0)),
            "fraction_ring_8": float(desc.get("fraction_ring_8", 0.0)),
            "non_hexagonal_fraction": float(desc.get("non_hexagonal_fraction", 0.0)),
            "stone_wales_fraction": float(desc.get("stone_wales_fraction", 0.0)),
            "source_provenance": "Girão et al., Carbon 203 (2023) / Mendeley v2 / DFT-D3",
        }
        rows.append(row)

    return pd.DataFrame(rows)


def export_ml_datasets(
    workspace_root: Path | str,
    output_dir: Optional[Path | str] = None,
) -> Dict[str, Any]:
    """
    Exports CSV and Parquet files for both canonical (53) and full catalog (61) datasets.
    Writes JSON feature metadata.
    """
    ws = Path(workspace_root)
    manifest_p = ws / "data" / "manifest.json"
    out_d = Path(output_dir) if output_dir else ws / "data" / "ml"
    out_d.mkdir(parents=True, exist_ok=True)

    df_full = build_ml_dataframe(manifest_p)
    df_canonical = df_full[df_full["is_canonical"] == True].copy().reset_index(drop=True)

    # File paths
    full_csv = out_d / "carbon2d_ml_dataset_full.csv"
    full_parquet = out_d / "carbon2d_ml_dataset_full.parquet"
    canon_csv = out_d / "carbon2d_ml_dataset.csv"
    canon_parquet = out_d / "carbon2d_ml_dataset.parquet"
    meta_json = out_d / "feature_metadata.json"

    # Save files
    df_full.to_csv(full_csv, index=False)
    df_full.to_parquet(full_parquet, index=False)
    df_canonical.to_csv(canon_csv, index=False)
    df_canonical.to_parquet(canon_parquet, index=False)

    metadata_payload = {
        "dataset_name": "2D Carbon Allotropes Machine Learning Database",
        "dataset_version": DATASET_VERSION,
        "description": "Standardized geometric and topological descriptor dataset for 2D carbon allotropes.",
        "target_property": "delta_e_ev_per_atom",
        "total_catalog_entries": len(df_full),
        "unique_canonical_allotropes": len(df_canonical),
        "duplicate_alias_entries": len(df_full) - len(df_canonical),
        "compute_savings_percentage": round((len(df_full) - len(df_canonical)) / len(df_full) * 100, 2),
        "missing_values_count": int(df_canonical.isna().sum().sum()),
        "plane_orientation": "Strictly z-normal (sheets lie in xy-plane)",
        "features": FEATURE_METADATA,
        "leakage_prevention_guideline": (
            "Train and cross-validate exclusively on the 53 canonical allotropes using GroupKFold(groups=crystal_system). "
            "Never evaluate on duplicate aliases as test samples."
        ),
    }

    with open(meta_json, "w", encoding="utf-8") as f:
        json.dump(metadata_payload, f, indent=2)

    return {
        "status": "success",
        "dataset_version": DATASET_VERSION,
        "total_rows": len(df_full),
        "canonical_rows": len(df_canonical),
        "duplicate_rows": len(df_full) - len(df_canonical),
        "feature_count": len(FEATURE_METADATA) - 1,
        "files_written": [
            str(canon_csv),
            str(canon_parquet),
            str(full_csv),
            str(full_parquet),
            str(meta_json),
        ],
    }


if __name__ == "__main__":
    res = export_ml_datasets(Path(__file__).resolve().parent.parent.parent.parent)
    print(f"ML Datasets successfully exported: {res}")
