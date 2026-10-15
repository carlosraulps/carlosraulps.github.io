"""
Exports and Supercells API Router.
Generates scaled periodic supercells and downloads in standard simulation formats:
CIF, VASP POSCAR, Extended XYZ, Quantum ESPRESSO pw.x, and JSON.
"""

from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from backend.app.services.crystallography import get_structure_by_id, get_pymatgen_structure
from backend.app.services.supercells import build_supercell
from backend.app.services.exporters import export_structure_content

router = APIRouter(prefix="/api/structures", tags=["exports"])


class SupercellRequest(BaseModel):
    scale_x: int = Field(2, ge=1, le=8, description="Multiplication along lattice vector a")
    scale_y: int = Field(2, ge=1, le=8, description="Multiplication along lattice vector b")
    scale_z: int = Field(1, ge=1, le=4, description="Multiplication along lattice vector c")


@router.post("/{identifier}/supercell", summary="Generate periodic supercell coordinates and connectivity")
def generate_supercell_endpoint(identifier: str, req: SupercellRequest):
    """Generate an Nx x Ny x Nz supercell with updated lattice vectors and bond connectivity."""
    record = get_structure_by_id(identifier)
    if not record:
        raise HTTPException(status_code=404, detail=f"Allotrope '{identifier}' not found")

    try:
        base_struct = get_pymatgen_structure(identifier)
        _, metadata = build_supercell(base_struct, req.scale_x, req.scale_y, req.scale_z)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supercell generation error: {e}")

    metadata["identifier"] = identifier
    metadata["name"] = record.get("name")
    metadata["symbol"] = record.get("symbol")
    return metadata


@router.get("/{identifier}/export", summary="Export structure or supercell to CIF, POSCAR, XYZ, QE, or JSON")
def export_structure_endpoint(
    identifier: str,
    format: str = Query("cif", description="Export format: cif, poscar, xyz, qe, json"),
    scale: int = Query(1, ge=1, le=8, description="Uniform periodic scaling: 1 (unit cell), 2 (2x2), 4 (4x4)"),
):
    """
    Download verified geometry files suitable for inspection and DFT simulation input.
    Supports scaling 1x1, 2x2, 3x3, 4x4.
    """
    record = get_structure_by_id(identifier)
    if not record:
        raise HTTPException(status_code=404, detail=f"Allotrope '{identifier}' not found")

    try:
        base_struct = get_pymatgen_structure(identifier)
        if scale > 1:
            struct, _ = build_supercell(base_struct, scale, scale, 1)
            scale_label = f"{scale}x{scale}"
        else:
            struct = base_struct
            scale_label = "1x1"

        content, ext, mime_type = export_structure_content(
            structure=struct,
            format_type=format,
            metadata=record,
            scale_label=scale_label,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {e}")

    slug = record.get("id", "allotrope").lower()
    filename = f"{slug}_{scale_label}.{ext}"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return Response(content=content, media_type=mime_type, headers=headers)
