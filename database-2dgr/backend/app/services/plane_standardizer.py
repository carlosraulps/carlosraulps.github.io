"""
Scientific Plane Standardization Service for 2D Carbon Allotropes.
Detects 2D sheet orientation (vacuum axis vs in-plane axes) and rotates
slabs so that the sheet lies strictly in the xy-plane and the vacuum axis is z.
Ensures correct vacuum-fixed DFT relaxation and 2D k-mesh integration.
"""

from __future__ import annotations
import math
from typing import Any, Dict, List, Tuple
import numpy as np
from pymatgen.core import Structure, Lattice


def pbc_span(fracs: List[float], length: float) -> float:
    """Compute periodic atomic thickness along a fractional coordinate axis."""
    s = sorted([float(f) % 1.0 for f in fracs])
    if len(s) <= 1:
        return 0.0
    gaps = [s[j + 1] - s[j] for j in range(len(s) - 1)]
    gaps.append(1.0 - s[-1] + s[0])
    max_gap = max(gaps)
    return round((1.0 - max_gap) * length, 4)


def detect_normal_axis(structure: Structure) -> Dict[str, Any]:
    """
    Detect the 2D periodic sheet orientation (in-plane axes vs vacuum normal axis).
    Returns the normal axis ('x', 'y', or 'z') and span metrics.
    """
    th_x = pbc_span([site.frac_coords[0] for site in structure], structure.lattice.a)
    th_y = pbc_span([site.frac_coords[1] for site in structure], structure.lattice.b)
    th_z = pbc_span([site.frac_coords[2] for site in structure], structure.lattice.c)

    th_dict = {
        'x': (th_x, structure.lattice.a, 0),
        'y': (th_y, structure.lattice.b, 1),
        'z': (th_z, structure.lattice.c, 2),
    }
    normal_axis = min(th_dict.keys(), key=lambda k: th_dict[k][0])

    return {
        "normal_axis": normal_axis,
        "th_x": th_x,
        "th_y": th_y,
        "th_z": th_z,
        "lattice_a": structure.lattice.a,
        "lattice_b": structure.lattice.b,
        "lattice_c": structure.lattice.c,
    }


def rotate_slab_to_z(
    structure: Structure,
    original_normal: str | None = None,
) -> Tuple[Structure, Dict[str, Any]]:
    """
    Rotates a slab structure whose vacuum axis is x or y so that the vacuum axis
    becomes z and the 2D sheet lies in the xy-plane.
    Preserves right-handed coordinate frame (det(matrix) > 0) via SO(3) cyclic permutation.
    Returns (standardized_structure, rotation_metadata).
    """
    if original_normal is None:
        det = detect_normal_axis(structure)
        original_normal = det["normal_axis"]

    if original_normal == "z":
        return structure.copy(), {
            "was_rotated": False,
            "original_normal": "z",
            "final_normal": "z",
            "operation": "identity",
        }

    s = structure.copy()
    lat = np.array(s.lattice.matrix, dtype=float)
    coords = np.array(s.cart_coords, dtype=float)

    if original_normal == "y":
        # Cyclic permutation sending old (z, x, y) -> new (x, y, z): det = +1
        # Lattice row 2 (z in-plane) -> new a (x)
        # Lattice row 0 (x in-plane) -> new b (y)
        # Lattice row 1 (y vacuum)   -> new c (z)
        R = np.array([
            [0, 0, 1],
            [1, 0, 0],
            [0, 1, 0],
        ], dtype=float)
        new_lat = np.array([
            lat[2] @ R.T,
            lat[0] @ R.T,
            lat[1] @ R.T,
        ], dtype=float)
        new_coords = coords @ R.T

        standardized = Structure(Lattice(new_lat), s.species, new_coords, coords_are_cartesian=True)
        return standardized, {
            "was_rotated": True,
            "original_normal": "y",
            "final_normal": "z",
            "operation": "cyclic_so3_(z->x,x->y,y->z)",
            "sign_flip": False,
        }

    elif original_normal == "x":
        # Cyclic permutation sending old (y, z, x) -> new (x, y, z): det = +1
        # Lattice row 1 (y in-plane) -> new a (x)
        # Lattice row 2 (z in-plane) -> new b (y)
        # Lattice row 0 (x vacuum)   -> new c (z)
        R = np.array([
            [0, 1, 0],
            [0, 0, 1],
            [1, 0, 0],
        ], dtype=float)
        new_lat = np.array([
            lat[1] @ R.T,
            lat[2] @ R.T,
            lat[0] @ R.T,
        ], dtype=float)
        new_coords = coords @ R.T

        standardized = Structure(Lattice(new_lat), s.species, new_coords, coords_are_cartesian=True)
        return standardized, {
            "was_rotated": True,
            "original_normal": "x",
            "final_normal": "z",
            "operation": "cyclic_so3_(y->x,z->y,x->z)",
            "sign_flip": False,
        }

    raise ValueError(f"Unknown normal axis: {original_normal}")

