"""
Bibliography and Literature Router for 2D Carbon Allotropes.
Exposes peer-reviewed primary publications, DOIs, open-access links, and structure mappings.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from backend.app.services.canonical_catalog import resolve_canonical_id

router = APIRouter(prefix="/api/bibliography", tags=["bibliography"])

BIB_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "bibliography.json"


def load_bib() -> Dict[str, Any]:
    if not BIB_PATH.exists():
        raise HTTPException(status_code=500, detail="Bibliography database not found.")
    with open(BIB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("", summary="Get all peer-reviewed bibliographic references")
def get_all_references() -> Dict[str, Any]:
    """Returns the full structure-specific scientific bibliography."""
    bib = load_bib()
    return {
        "total_references": len(bib.get("references", [])),
        "references": bib.get("references", []),
        "structure_associations_count": len(bib.get("structure_associations", {})),
    }


@router.get("/structure/{structure_id}", summary="Get references for a specific carbon allotrope")
def get_structure_references(structure_id: str) -> Dict[str, Any]:
    """Returns all literature citations mapped to a given structure or its canonical identity."""
    bib = load_bib()
    refs_by_id = {r["id"]: r for r in bib.get("references", [])}
    associations = bib.get("structure_associations", {})

    canonical_id = resolve_canonical_id(structure_id)
    ref_keys = associations.get(structure_id, associations.get(canonical_id, []))

    # Always guarantee foundational taxonomy reference
    if not ref_keys:
        ref_keys = ["girao_2023_carbon", "girao_2023_mendeley"]

    found_refs = [refs_by_id[k] for k in ref_keys if k in refs_by_id]

    return {
        "structure_id": structure_id,
        "canonical_id": canonical_id,
        "is_canonical": (structure_id == canonical_id),
        "total_references": len(found_refs),
        "references": found_refs,
    }
