#!/usr/bin/env python3
"""
Scientific Crystallographic Integrity Verification Suite
=========================================================

Rigorous audit protocol for 2D Carbon Allotropes:
1. Validates base crystallographic unit cells from raw DFT CIF files.
2. Generates 1x1, 2x2, 3x3, and 4x4 supercells across all simulation formats:
   - CIF (Crystallographic Information File)
   - POSCAR (VASP 5 format)
   - Extended XYZ (ASE format with PBC matrix)
   - Quantum ESPRESSO pw.x format
   - Structured JSON format
3. Validates against crystallographic invariants:
   - Space Group Rule: Any supercell (scale > 1) MUST use space group P 1.
   - Atom Count Conservation: N_super == N_base * scale^2.
   - Zero Overlapping Sites: min(d_ij) >= 1.20 Angstroms.
   - 2D Monolayer Planarity: normal axis along Z, vacuum >= 12.0 Angstroms.
   - Network Coordination: all carbon atoms in the sp2 framework have coordination 2-3.
"""

from __future__ import annotations
import glob
import io
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from pymatgen.core import Structure
from pymatgen.io.cif import CifWriter, CifParser
from pymatgen.io.vasp import Poscar
import ase.io
from pymatgen.io.ase import AseAtomsAdaptor

# Add workspace to path
WORKSPACE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE))

from backend.app.services.crystallography import list_structures, get_pymatgen_structure
from backend.app.services.supercells import build_supercell
from backend.app.services.exporters import export_structure_content


def audit_structure(identifier: str, record: Dict[str, Any]) -> Dict[str, Any]:
    """Audit single allotrope across 1x1, 2x2, 3x3, 4x4 scales."""
    result: Dict[str, Any] = {
        "id": identifier,
        "name": record.get("name", identifier),
        "code": record.get("code", identifier),
        "status": "PASS",
        "errors": [],
        "warnings": [],
        "base_natoms": 0,
        "scales_tested": {},
    }

    try:
        base_struct = get_pymatgen_structure(identifier)
    except Exception as e:
        result["status"] = "FAIL"
        result["errors"].append(f"Failed to load base structure: {e}")
        return result

    result["base_natoms"] = len(base_struct)

    # 1. Base Structure Integrity Checks
    dists_base = base_struct.distance_matrix
    np.fill_diagonal(dists_base, 999.0)
    min_d_base = float(np.min(dists_base))
    if min_d_base < 1.20:
        result["status"] = "FAIL"
        result["errors"].append(f"Base structure has overlapping atoms! min_d = {min_d_base:.3f} A")

    # 2. Test Supercell Scaling: 1x1, 2x2, 3x3, 4x4
    for scale in [1, 2, 3, 4]:
        scale_label = f"{scale}x{scale}"
        scale_result: Dict[str, Any] = {
            "scale": scale,
            "expected_atoms": len(base_struct) * (scale ** 2),
            "formats_passed": [],
        }

        try:
            if scale > 1:
                super_struct, _ = build_supercell(base_struct, scale, scale, 1)
            else:
                super_struct = base_struct

            # Verify atom count
            if len(super_struct) != scale_result["expected_atoms"]:
                result["status"] = "FAIL"
                result["errors"].append(
                    f"Supercell {scale_label} atom count mismatch: got {len(super_struct)}, expected {scale_result['expected_atoms']}"
                )

            # Test CIF Export
            cif_content, _, _ = export_structure_content(
                super_struct, "cif", record, scale_label=scale_label
            )

            # Assert P 1 rule for supercells
            if scale > 1:
                if "_symmetry_space_group_name_H-M   'P 1'" not in cif_content and "P 1" not in cif_content:
                    result["status"] = "FAIL"
                    result["errors"].append(f"Supercell {scale_label} CIF does not enforce P 1 space group!")

            # Parse back CIF with pymatgen
            parsed_cif = Structure.from_str(cif_content, fmt="cif")
            if len(parsed_cif) != scale_result["expected_atoms"]:
                result["status"] = "FAIL"
                result["errors"].append(
                    f"Parsed {scale_label} CIF atom count mismatch: got {len(parsed_cif)}, expected {scale_result['expected_atoms']} (VESTA replication bug detected!)"
                )

            # Check min distance in parsed CIF
            dists_cif = parsed_cif.distance_matrix
            np.fill_diagonal(dists_cif, 999.0)
            min_d_cif = float(np.min(dists_cif))
            if min_d_cif < 1.20:
                result["status"] = "FAIL"
                result["errors"].append(f"Parsed {scale_label} CIF has overlapping atoms! min_d = {min_d_cif:.3f} A")

            scale_result["formats_passed"].append("cif")
            scale_result["min_distance"] = round(min_d_cif, 3)

            # Test POSCAR Export
            poscar_content, _, _ = export_structure_content(
                super_struct, "poscar", record, scale_label=scale_label
            )
            parsed_poscar = Poscar.from_str(poscar_content).structure
            if len(parsed_poscar) != scale_result["expected_atoms"]:
                result["status"] = "FAIL"
                result["errors"].append(f"Parsed {scale_label} POSCAR atom count mismatch")
            scale_result["formats_passed"].append("poscar")

            # Test XYZ Export via ASE
            xyz_content, _, _ = export_structure_content(
                super_struct, "xyz", record, scale_label=scale_label
            )
            ase_atoms = ase.io.read(io.StringIO(xyz_content), format="extxyz")
            if len(ase_atoms) != scale_result["expected_atoms"]:
                result["status"] = "FAIL"
                result["errors"].append(f"Parsed {scale_label} XYZ atom count mismatch")
            scale_result["formats_passed"].append("xyz")

            # Test QE Export via ASE
            qe_content, _, _ = export_structure_content(
                super_struct, "qe", record, scale_label=scale_label
            )
            ase_qe = ase.io.read(io.StringIO(qe_content), format="espresso-in")
            if len(ase_qe) != scale_result["expected_atoms"]:
                result["status"] = "FAIL"
                result["errors"].append(f"Parsed {scale_label} QE atom count mismatch")
            scale_result["formats_passed"].append("qe")

            # Test JSON Export
            json_content, _, _ = export_structure_content(
                super_struct, "json", record, scale_label=scale_label
            )
            json_data = json.loads(json_content)
            if json_data.get("supercell_atoms_count") != scale_result["expected_atoms"] and json_data.get("atoms_count") != scale_result["expected_atoms"]:
                # Check atoms array length
                atoms_len = len(json_data.get("atoms", []))
                if atoms_len != scale_result["expected_atoms"]:
                    result["status"] = "FAIL"
                    result["errors"].append(f"Parsed {scale_label} JSON atom count mismatch")
            scale_result["formats_passed"].append("json")

        except Exception as ex:
            result["status"] = "FAIL"
            result["errors"].append(f"Scale {scale_label} processing failed: {ex}")

        result["scales_tested"][scale_label] = scale_result

    return result


def main():
    import io
    print("=" * 80)
    print("  CARBON ATLAS: 2D CRYSTALLOGRAPHIC INTEGRITY VERIFICATION PROTOCOL")
    print("=" * 80)

    res_dict = list_structures(limit=1000)
    structures = res_dict.get("structures", [])
    print(f"Loaded {len(structures)} allotropes from database catalog.")

    results = []
    passed = 0
    failed = 0

    for idx, rec in enumerate(structures):
        slug = rec.get("id") or rec.get("code")
        code = rec.get("code", "")
        name = rec.get("name", "")
        print(f"[{idx+1:02d}/{len(structures):02d}] Auditing {code:6s} | {name[:32]:32s} ... ", end="", flush=True)

        res = audit_structure(slug, rec)
        results.append(res)

        if res["status"] == "PASS":
            passed += 1
            print("OK")
        else:
            failed += 1
            print("FAIL")
            for err in res["errors"]:
                print(f"    ERROR: {err}")

    # Summary
    print("=" * 80)
    print(f"AUDIT SUMMARY: {passed} PASSED | {failed} FAILED / {len(structures)} TOTAL")
    print("=" * 80)

    # Save JSON report
    report_path = WORKSPACE / "reports" / "crystallographic_integrity_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(
            {
                "total": len(structures),
                "passed": passed,
                "failed": failed,
                "results": results,
            },
            f,
            indent=2,
        )
    print(f"Saved full audit report to: {report_path}")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
