"""
Symmetry Analysis Service.
Calculates 3D crystallographic space group, symmetry operations, Wyckoff sites,
and 2D monolayer wallpaper (plane) groups using Spglib and Pymatgen.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
import numpy as np
from pymatgen.core import Structure
from pymatgen.symmetry.analyzer import SpacegroupAnalyzer

WALLPAPER_MAP = {
    191: {"group": "p6m", "name": "p6mm (#17)", "rotations": ["C6", "C3", "C2"], "mirrors": "Reflection lines at 30° intervals"},
    187: {"group": "p6m", "name": "p6mm (#17)", "rotations": ["C6", "C3", "C2"], "mirrors": "Reflection lines at 30° intervals"},
    189: {"group": "p6m", "name": "p6mm (#17)", "rotations": ["C6", "C3", "C2"], "mirrors": "Reflection lines at 30° intervals"},
    156: {"group": "p3m1", "name": "p3m1 (#14)", "rotations": ["C3"], "mirrors": "Reflection lines through vertices"},
    123: {"group": "p4m", "name": "p4mm (#11)", "rotations": ["C4", "C2"], "mirrors": "Reflection lines along axes & diagonals"},
    127: {"group": "p4m", "name": "p4mm (#11)", "rotations": ["C4", "C2"], "mirrors": "Reflection lines along axes & diagonals"},
    65: {"group": "cmm", "name": "cmm (#9)", "rotations": ["C2"], "mirrors": "Centered orthogonal reflection lines"},
    51: {"group": "pmg", "name": "pmg (#7)", "rotations": ["C2"], "mirrors": "Parallel reflection lines & glide lines"},
    55: {"group": "pmm", "name": "pmm (#6)", "rotations": ["C2"], "mirrors": "Perpendicular reflection lines"},
    47: {"group": "pmm", "name": "pmm (#6)", "rotations": ["C2"], "mirrors": "Perpendicular reflection lines"},
    38: {"group": "cmm", "name": "cmm (#9)", "rotations": ["C2"], "mirrors": "Centered orthogonal reflection lines"},
    25: {"group": "pm", "name": "pm (#3)", "rotations": [], "mirrors": "Parallel reflection lines"},
    10: {"group": "p2", "name": "p2 (#2)", "rotations": ["C2"], "mirrors": "None"},
    6: {"group": "pm", "name": "pm (#3)", "rotations": [], "mirrors": "Parallel reflection lines"},
}


def analyze_symmetry(structure: Structure, symprec: float = 1e-3) -> Dict[str, Any]:
    """
    Perform deep crystallographic symmetry analysis on a monolayer structure.
    Returns space group, point group, operations, Wyckoff positions, and 2D wallpaper group.
    """
    try:
        sga = SpacegroupAnalyzer(structure, symprec=symprec)
        sg_num = sga.get_space_group_number()
        sg_sym = sga.get_space_group_symbol()
        hall = sga.get_hall_symbol()
        crystal_sys = sga.get_crystal_system().capitalize()
        point_group = sga.get_point_group_symbol()
        dataset = sga.get_symmetry_dataset()
        operations = sga.get_symmetry_operations()

        wyckoffs = list(dataset.wyckoffs) if dataset else []
        equivalent_atoms = list(dataset.equivalent_atoms) if dataset else []

        ops_summary = [
            {
                "index": i,
                "rotation_matrix": [[int(v) for v in row] for row in op.rotation_matrix],
                "translation_vector": [round(float(v), 4) for v in op.translation_vector],
            }
            for i, op in enumerate(operations[:24])  # limit representation
        ]
    except Exception as exc:
        sg_num = 1
        sg_sym = "P1"
        hall = "P 1"
        crystal_sys = "Triclinic"
        point_group = "1"
        wyckoffs = ["a"] * len(structure)
        equivalent_atoms = list(range(len(structure)))
        ops_summary = []

    # Map to 2D wallpaper group
    wallpaper_info = WALLPAPER_MAP.get(
        sg_num,
        {
            "group": "p1",
            "name": "p1 (#1)",
            "rotations": [],
            "mirrors": "None",
        },
    )

    return {
        "space_group_number": sg_num,
        "space_group_symbol": sg_sym,
        "hall_symbol": hall,
        "crystal_system": crystal_sys,
        "point_group": point_group,
        "total_symmetry_operations": len(operations) if "operations" in locals() else 1,
        "symmetry_operations_sample": ops_summary,
        "wyckoff_positions": wyckoffs,
        "equivalent_atoms": equivalent_atoms,
        "wallpaper_group": wallpaper_info["group"],
        "wallpaper_name": wallpaper_info["name"],
        "wallpaper_rotations": wallpaper_info.get("rotations", []),
        "wallpaper_mirrors": wallpaper_info.get("mirrors", "None"),
        "symprec_used": symprec,
    }
