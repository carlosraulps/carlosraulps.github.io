"""
Crystallography Service.
Handles structure loading, querying, geometry analysis, and metric extraction
for 2D carbon allotropes using Pymatgen.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from pymatgen.core import Structure


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MANIFEST_PATH = DATA_DIR / "manifest.json"
STRUCTURES_DIR = DATA_DIR / "structures"

_MANIFEST_CACHE: Optional[Dict[str, Any]] = None


def get_manifest(force_reload: bool = False) -> Dict[str, Any]:
    """Load and memory-cache data/manifest.json."""
    global _MANIFEST_CACHE
    if _MANIFEST_CACHE is None or force_reload:
        if not MANIFEST_PATH.exists():
            raise FileNotFoundError(f"Manifest not found at {MANIFEST_PATH}")
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            _MANIFEST_CACHE = json.load(f)
    return _MANIFEST_CACHE


def list_structures(
    query: Optional[str] = None,
    crystal_system: Optional[str] = None,
    polygon_type: Optional[int] = None,
    max_energy: Optional[float] = None,
    under_benchmark: bool = False,
    sort_by: str = "energy",
    ascending: bool = True,
    offset: int = 0,
    limit: int = 100,
) -> Dict[str, Any]:
    """Filter, search, sort, and paginate verified structures."""
    manifest = get_manifest()
    items = list(manifest.get("structures", []))
    benchmark = float(manifest.get("benchmark_biphenylene_ev", 0.456))

    # Text search
    if query:
        q = query.strip().lower()
        items = [
            it
            for it in items
            if q in it.get("id", "").lower()
            or q in it.get("code", "").lower()
            or q in it.get("name", "").lower()
            or q in it.get("symbol", "").lower()
            or q in it.get("crystal_system", "").lower()
            or q in it.get("space_group_symbol", "").lower()
        ]

    # Crystal system filter
    if crystal_system:
        cs = crystal_system.strip().lower()
        items = [it for it in items if it.get("crystal_system", "").lower() == cs]

    # Polygon type filter
    if polygon_type is not None:
        items = [it for it in items if polygon_type in it.get("polygon_types", [])]

    # Energy filters
    if max_energy is not None:
        items = [it for it in items if it.get("delta_e_ev_per_atom", 999.0) <= max_energy]

    if under_benchmark:
        items = [it for it in items if it.get("delta_e_ev_per_atom", 999.0) < benchmark]

    # Sorting
    if sort_by == "energy":
        items.sort(key=lambda x: x.get("delta_e_ev_per_atom", 999.0), reverse=not ascending)
    elif sort_by == "id" or sort_by == "code":
        items.sort(key=lambda x: x.get("code", ""), reverse=not ascending)
    elif sort_by == "natoms":
        items.sort(key=lambda x: x.get("natoms", 0), reverse=not ascending)
    elif sort_by == "name":
        items.sort(key=lambda x: x.get("name", ""), reverse=not ascending)

    total_count = len(items)
    paginated = items[offset : offset + limit]

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "benchmark_biphenylene_ev": benchmark,
        "structures": paginated,
    }


def get_structure_by_id(identifier: str) -> Optional[Dict[str, Any]]:
    """Retrieve full manifest structure record by id or code (e.g. 'graphene' or 'G-01')."""
    manifest = get_manifest()
    clean_id = identifier.strip().lower()
    for item in manifest.get("structures", []):
        if item.get("id", "").lower() == clean_id or item.get("code", "").lower() == clean_id:
            return item
    return None


def get_pymatgen_structure(identifier: str) -> Structure:
    """Load Structure object from disk for an allotrope."""
    record = get_structure_by_id(identifier)
    if not record:
        raise KeyError(f"Allotrope '{identifier}' not found in manifest")

    cif_rel = record.get("cif_filename", "")
    candidates = [
        DATA_DIR / cif_rel,
        DATA_DIR / "structures" / Path(cif_rel).name,
        DATA_DIR / Path(cif_rel).name,
    ]
    cif_path = None
    for cand in candidates:
        if cand.exists() and cand.is_file():
            cif_path = cand
            break

    if not cif_path:
        raise FileNotFoundError(f"Structure CIF file not found for '{identifier}' (tried {[str(c) for c in candidates]})")

    return Structure.from_file(cif_path)



def compute_bond_statistics(structure: Structure, min_d: float = 1.15, max_d: float = 1.70) -> Dict[str, Any]:
    """Compute bond lengths and statistics for sp2 carbon network."""
    coords = structure.cart_coords
    n_atoms = len(structure)
    distances = []
    bonds = []

    for i in range(n_atoms):
        for j in range(i + 1, n_atoms):
            d = float(np.linalg.norm(coords[i] - coords[j]))
            if min_d <= d <= max_d:
                distances.append(round(d, 4))
                bonds.append([i, j])

    if not distances:
        return {
            "num_bonds": 0,
            "bonds": [],
            "mean_length_angstrom": None,
            "min_length_angstrom": None,
            "max_length_angstrom": None,
            "std_length_angstrom": None,
        }

    return {
        "num_bonds": len(bonds),
        "bonds": bonds,
        "mean_length_angstrom": round(float(np.mean(distances)), 4),
        "min_length_angstrom": round(float(np.min(distances)), 4),
        "max_length_angstrom": round(float(np.max(distances)), 4),
        "std_length_angstrom": round(float(np.std(distances)), 4),
    }
