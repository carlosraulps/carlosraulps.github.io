"""Unit tests for format exporters and roundtrip validation."""

import io
import json
import pytest
from pymatgen.core import Structure
from pymatgen.io.vasp import Poscar
import ase.io

from backend.app.services.crystallography import get_pymatgen_structure, get_structure_by_id
from backend.app.services.exporters import export_structure_content


def test_cif_roundtrip(biphenylene_id):
    """Verify that exported CIF can be re-parsed by pymatgen with exact stoichiometry."""
    base = get_pymatgen_structure(biphenylene_id)
    rec = get_structure_by_id(biphenylene_id)

    cif_str, ext, mime = export_structure_content(base, "cif", rec, "1x1")
    assert ext == "cif"
    assert mime == "chemical/x-cif"

    # Re-parse CIF
    reparsed = Structure.from_str(cif_str, fmt="cif")
    assert len(reparsed) == len(base)
    assert pytest.approx(reparsed.lattice.a, 0.001) == base.lattice.a
    assert pytest.approx(reparsed.lattice.b, 0.001) == base.lattice.b


def test_poscar_roundtrip(biphenylene_id):
    """Verify that exported POSCAR can be re-parsed by pymatgen with exact stoichiometry."""
    base = get_pymatgen_structure(biphenylene_id)
    rec = get_structure_by_id(biphenylene_id)

    poscar_str, ext, mime = export_structure_content(base, "poscar", rec, "1x1")
    assert ext == "vasp"
    assert mime == "text/plain"

    poscar = Poscar.from_str(poscar_str)
    reparsed = poscar.structure
    assert len(reparsed) == len(base)
    assert pytest.approx(reparsed.lattice.volume, 0.01) == base.lattice.volume


def test_extxyz_roundtrip(graphene_id):
    """Verify that exported Extended XYZ can be re-parsed by ASE with lattice metadata."""
    base = get_pymatgen_structure(graphene_id)
    rec = get_structure_by_id(graphene_id)

    xyz_str, ext, _ = export_structure_content(base, "xyz", rec, "1x1")
    assert ext == "xyz"

    buf = io.StringIO(xyz_str)
    reparsed = ase.io.read(buf, format="extxyz")
    assert len(reparsed) == len(base)
    assert reparsed.pbc.all()  # Periodic boundary conditions preserved


def test_quantum_espresso_generation(biphenylene_id):
    """Verify that Quantum ESPRESSO input contains required namelists and atomic positions."""
    base = get_pymatgen_structure(biphenylene_id)
    rec = get_structure_by_id(biphenylene_id)

    qe_str, ext, _ = export_structure_content(base, "qe", rec, "1x1")
    assert ext == "pwi"
    assert "&CONTROL" in qe_str
    assert "&SYSTEM" in qe_str
    assert "&ELECTRONS" in qe_str
    assert "CELL_PARAMETERS" in qe_str
    assert "ATOMIC_SPECIES" in qe_str
    assert "ATOMIC_POSITIONS" in qe_str
    assert "K_POINTS" in qe_str
    assert "C.pbe-n-kjpaw_psl.1.0.0.UPF" in qe_str


def test_json_export(graphene_id):
    """Verify JSON structure export."""
    base = get_pymatgen_structure(graphene_id)
    rec = get_structure_by_id(graphene_id)

    json_str, ext, mime = export_structure_content(base, "json", rec, "1x1")
    assert ext == "json"
    assert mime == "application/json"
    data = json.loads(json_str)
    assert data["formula"] == "C"
    assert len(data["atoms"]) == 2
    assert "lattice" in data
