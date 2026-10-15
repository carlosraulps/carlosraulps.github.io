"""
Supercell Generation Service.
Generates periodic supercells (e.g. 2x2, 3x3, 4x4) from verified unit cells,
calculates scaled lattice parameters and interatomic bond connectivity,
and centers geometry for simulation and 3D visualization.
"""

from __future__ import annotations
from typing import Any, Dict, List, Tuple
import numpy as np
from pymatgen.core import Structure


def build_supercell(
    structure: Structure,
    scale_x: int = 2,
    scale_y: int = 2,
    scale_z: int = 1,
    min_bond_dist: float = 1.18,
    max_bond_dist: float = 1.68,
) -> Tuple[Structure, Dict[str, Any]]:
    """
    Generate an Nx x Ny x Nz supercell from a base monolayer Structure.
    Returns the new pymatgen Structure and a visualization-ready dictionary.
    """
    if scale_x < 1 or scale_y < 1 or scale_z < 1:
        raise ValueError("Supercell scale factors must be positive integers >= 1")
    if scale_x > 8 or scale_y > 8 or scale_z > 4:
        raise ValueError("Maximum supercell scaling is 8x8x4 to prevent memory exhaustion")

    base_atoms = len(structure)
    expected_atoms = base_atoms * scale_x * scale_y * scale_z

    sc: Structure = structure.copy()
    sc.make_supercell([scale_x, scale_y, scale_z])

    if len(sc) != expected_atoms:
        raise RuntimeError(
            f"Supercell scaling inconsistency: expected {expected_atoms} atoms, obtained {len(sc)}"
        )

    # Lattice vectors
    lat = sc.lattice
    matrix = [[round(float(v), 6) for v in row] for row in lat.matrix]

    # Atoms coordinates
    raw_coords = sc.cart_coords
    center = np.mean(raw_coords, axis=0)
    centered_coords = raw_coords - center
    frac_coords = sc.frac_coords

    atoms_data = [
        {
            "id": idx,
            "element": "C",
            "position": [round(float(p[0]), 4), round(float(p[1]), 4), round(float(p[2]), 4)],
            "raw_position": [round(float(p[0]), 4), round(float(p[1]), 4), round(float(p[2]), 4)],
            "frac_coords": [round(float(f[0]), 5), round(float(f[1]), 5), round(float(f[2]), 5)],
        }
        for idx, (p, f) in enumerate(zip(centered_coords, frac_coords))
    ]

    # Calculate bonds in supercell
    bonds: List[List[int]] = []
    n_atoms = len(sc)
    for i in range(n_atoms):
        for j in range(i + 1, n_atoms):
            d = float(np.linalg.norm(raw_coords[i] - raw_coords[j]))
            if min_bond_dist <= d <= max_bond_dist:
                bonds.append([i, j])

    metadata = {
        "scale": [scale_x, scale_y, scale_z],
        "multiplication_factor": scale_x * scale_y * scale_z,
        "base_atoms": base_atoms,
        "num_atoms": len(sc),
        "num_bonds": len(bonds),
        "lattice": {
            "a": round(float(lat.a), 5),
            "b": round(float(lat.b), 5),
            "c": round(float(lat.c), 5),
            "alpha": round(float(lat.alpha), 2),
            "beta": round(float(lat.beta), 2),
            "gamma": round(float(lat.gamma), 2),
            "volume": round(float(lat.volume), 4),
            "matrix": matrix,
        },
        "atoms": atoms_data,
        "bonds": bonds,
    }

    return sc, metadata
