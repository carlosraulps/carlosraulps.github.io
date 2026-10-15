"""
Format Exporter Service.
Generates simulation-ready crystallographic files:
- CIF (Crystallographic Information File via Pymatgen)
- POSCAR (VASP format via Pymatgen)
- Extended XYZ (with PBC and lattice matrix via ASE)
- Quantum ESPRESSO pw.x input (with standard PBE pseudopotential header via ASE)
- JSON (complete structured metadata)
"""

from __future__ import annotations
import io
import json
from typing import Any, Dict, Optional, Tuple
from pymatgen.core import Structure
from pymatgen.io.cif import CifWriter
from pymatgen.io.vasp import Poscar
from pymatgen.io.ase import AseAtomsAdaptor
import ase.io


def export_structure_content(
    structure: Structure,
    format_type: str,
    metadata: Optional[Dict[str, Any]] = None,
    scale_label: str = "1x1",
) -> Tuple[str, str, str]:
    """
    Export a Structure to the requested format string.
    Returns: (file_content_str, filename_extension, mime_type)
    """
    fmt = format_type.strip().lower()
    name = (metadata or {}).get("name", "structure")
    slug = (metadata or {}).get("id", "allotrope")
    sym = (metadata or {}).get("symbol", "")

    stamp = (
        f"2D Carbon Allotrope: {name} ({sym}) | "
        f"Supercell: {scale_label} | "
        f"Atoms: {len(structure)} | "
        f"Derived from Mendeley Data v2 / Carbon 203 (2023) 611-619"
    )

    if fmt in ("cif", "chemical/x-cif"):
        # For supercells (scale > 1), symprec MUST be None to write explicit P1 sites.
        # Passing a tolerance invokes SpacegroupAnalyzer which writes the parent space group,
        # causing VESTA to apply symmetry operations on already-replicated atoms (60+ overlapping atoms).
        is_supercell = scale_label not in ("1x1", "1", 1, None)
        writer = CifWriter(structure, symprec=None if is_supercell else 1e-3)
        cif_body = str(writer)
        content = f"# {stamp}\n{cif_body}"
        return content, "cif", "chemical/x-cif"

    elif fmt in ("poscar", "vasp"):
        poscar = Poscar(structure, comment=stamp)
        return poscar.get_str(), "vasp", "text/plain"

    elif fmt in ("xyz", "extxyz"):
        atoms = AseAtomsAdaptor.get_atoms(structure)
        buf = io.StringIO()
        ase.io.write(buf, atoms, format="extxyz")
        content = buf.getvalue()
        # Ensure stamp is in comment line
        lines = content.splitlines()
        if len(lines) >= 2:
            lines[1] = f'{lines[1]} comment="{stamp}"'
            content = "\n".join(lines) + "\n"
        return content, "xyz", "text/plain"

    elif fmt in ("qe", "espresso", "pw", "pwi"):
        atoms = AseAtomsAdaptor.get_atoms(structure)
        buf = io.StringIO()
        ase.io.write(
            buf,
            atoms,
            format="espresso-in",
            pseudopotentials={"C": "C.pbe-n-kjpaw_psl.1.0.0.UPF"},
            input_data={
                "control": {
                    "calculation": "scf",
                    "restart_mode": "from_scratch",
                    "pseudo_dir": "./",
                    "title": stamp,
                },
                "system": {
                    "ecutwfc": 50.0,
                    "ecutrho": 400.0,
                    "occupations": "smearing",
                    "smearing": "marzari-vanderbilt",
                    "degauss": 0.01,
                },
                "electrons": {
                    "conv_thr": 1.0e-8,
                    "mixing_beta": 0.7,
                },
            },
            kpts=(8, 8, 1),
        )
        return buf.getvalue(), "pwi", "text/plain"

    elif fmt == "json":
        lat = structure.lattice
        export_dict = {
            "metadata": metadata or {},
            "stamp": stamp,
            "formula": "C",
            "natoms": len(structure),
            "lattice": {
                "a": round(float(lat.a), 5),
                "b": round(float(lat.b), 5),
                "c": round(float(lat.c), 5),
                "alpha": round(float(lat.alpha), 2),
                "beta": round(float(lat.beta), 2),
                "gamma": round(float(lat.gamma), 2),
                "volume": round(float(lat.volume), 4),
                "matrix": [[round(float(v), 6) for v in row] for row in lat.matrix],
            },
            "atoms": [
                {
                    "index": i,
                    "element": "C",
                    "cart_coords": [round(float(c), 5) for c in site.coords],
                    "frac_coords": [round(float(c), 5) for c in site.frac_coords],
                }
                for i, site in enumerate(structure)
            ],
        }
        return json.dumps(export_dict, indent=2), "json", "application/json"

    else:
        raise ValueError(
            f"Unsupported format '{format_type}'. Supported formats: cif, poscar, xyz, qe, json."
        )
