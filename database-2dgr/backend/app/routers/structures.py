"""
Structures API Router.
Provides search, filtering, detailed geometry, and symmetry metadata for 2D carbon allotropes.
"""

from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.services.crystallography import (
    list_structures,
    get_structure_by_id,
    get_pymatgen_structure,
    compute_bond_statistics,
)
from backend.app.services.symmetry import analyze_symmetry

router = APIRouter(prefix="/api/structures", tags=["structures"])


@router.get("", summary="List and filter 2D carbon allotropes")
def get_structures(
    q: Optional[str] = Query(None, description="Search query across name, symbol, ID, crystal system"),
    crystal_system: Optional[str] = Query(None, description="Filter by crystal system (e.g. Hexagonal, Orthorhombic)"),
    polygon_type: Optional[int] = Query(None, description="Filter by presence of n-gon ring (e.g. 4, 5, 7, 8)"),
    max_energy: Optional[float] = Query(None, description="Maximum Delta E relative to graphene (eV/atom)"),
    under_benchmark: bool = Query(False, description="Filter allotropes below 0.456 eV/atom benchmark"),
    sort_by: str = Query("energy", description="Sort field: energy, code, name, natoms"),
    order: str = Query("asc", description="Sort order: asc or desc"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=200, description="Pagination limit"),
):
    """Retrieve verified structures with optional filtering, sorting, and pagination."""
    ascending = order.lower() == "asc"
    return list_structures(
        query=q,
        crystal_system=crystal_system,
        polygon_type=polygon_type,
        max_energy=max_energy,
        under_benchmark=under_benchmark,
        sort_by=sort_by,
        ascending=ascending,
        offset=offset,
        limit=limit,
    )


@router.get("/{identifier}", summary="Get full allotrope details by ID or code")
def get_structure_detail(identifier: str):
    """Retrieve full crystallographic and energetic record including Cartesian coordinates and bonds."""
    record = get_structure_by_id(identifier)
    if not record:
        raise HTTPException(status_code=404, detail=f"Allotrope '{identifier}' not found in manifest")
    return record


@router.get("/{identifier}/symmetry", summary="Get detailed symmetry and 2D wallpaper operations")
def get_structure_symmetry(identifier: str, symprec: float = Query(1e-3, ge=1e-5, le=1e-1)):
    """Calculate space group, Wyckoff positions, point group, and 2D wallpaper group."""
    try:
        struct = get_pymatgen_structure(identifier)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Allotrope '{identifier}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load structure: {e}")

    return analyze_symmetry(struct, symprec=symprec)


@router.get("/{identifier}/bonds", summary="Get interatomic bond lengths and statistics")
def get_structure_bonds(identifier: str):
    """Extract C-C bond length distribution and statistics for sp2 network."""
    try:
        struct = get_pymatgen_structure(identifier)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Allotrope '{identifier}' not found")

    return compute_bond_statistics(struct)
