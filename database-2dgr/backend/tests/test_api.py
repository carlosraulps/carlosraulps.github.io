"""Integration tests for FastAPI endpoints."""

from fastapi.testclient import TestClient


def test_api_health(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["total_verified_structures"] == 61


def test_api_structures_list(client: TestClient):
    """Test structures list endpoint with filtering."""
    response = client.get("/api/structures")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 61
    assert len(data["structures"]) > 0

    # Filter query
    resp_filter = client.get("/api/structures?crystal_system=Hexagonal")
    assert resp_filter.status_code == 200
    data_hex = resp_filter.json()
    assert data_hex["total"] >= 16


def test_api_structure_detail(client: TestClient):
    """Test structure detail by ID and Code."""
    response = client.get("/api/structures/graphene")
    assert response.status_code == 200
    item = response.json()
    assert item["id"] == "graphene"
    assert item["natoms"] == 2
    assert "visual_mesh" in item

    resp_code = client.get("/api/structures/G-01")
    assert resp_code.status_code == 200
    assert resp_code.json()["id"] == "graphene"


def test_api_supercell_endpoint(client: TestClient):
    """Test supercell generation endpoint."""
    payload = {"scale_x": 2, "scale_y": 2, "scale_z": 1}
    response = client.post("/api/structures/biphenylene/supercell", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["base_atoms"] == 6
    assert data["num_atoms"] == 24
    assert len(data["atoms"]) == 24
    assert len(data["bonds"]) > 0


def test_api_export_endpoints(client: TestClient):
    """Test export downloads for all supported formats."""
    # CIF export
    resp_cif = client.get("/api/structures/biphenylene/export?format=cif&scale=1")
    assert resp_cif.status_code == 200
    assert "data_" in resp_cif.text
    assert "biphenylene" in resp_cif.headers.get("content-disposition", "")

    # POSCAR export
    resp_poscar = client.get("/api/structures/biphenylene/export?format=poscar&scale=2")
    assert resp_poscar.status_code == 200
    assert "direct" in resp_poscar.text.lower() or "cartesian" in resp_poscar.text.lower()

    # Extended XYZ export
    resp_xyz = client.get("/api/structures/graphene/export?format=xyz&scale=1")
    assert resp_xyz.status_code == 200
    assert "Lattice=" in resp_xyz.text

    # Quantum ESPRESSO export
    resp_qe = client.get("/api/structures/graphene/export?format=qe&scale=1")
    assert resp_qe.status_code == 200
    assert "&CONTROL" in resp_qe.text

    # JSON export
    resp_json = client.get("/api/structures/graphene/export?format=json&scale=1")
    assert resp_json.status_code == 200
    assert resp_json.json()["formula"] == "C"


def test_api_bibliography_endpoints(client: TestClient):
    """Test bibliography endpoints and structure-specific literature linking."""
    resp_all = client.get("/api/bibliography")
    assert resp_all.status_code == 200
    data_all = resp_all.json()
    assert data_all["total_references"] >= 30
    assert len(data_all["references"]) >= 30

    # Test graphene literature mapping
    resp_graph = client.get("/api/bibliography/structure/graphene")
    assert resp_graph.status_code == 200
    data_graph = resp_graph.json()
    assert data_graph["structure_id"] == "graphene"
    assert data_graph["is_canonical"] is True
    assert any("novoselov" in r["id"] for r in data_graph["references"])

    # Test C568 (c5^2_6^2_8^1_a_65) literature mapping
    resp_c568 = client.get("/api/bibliography/structure/c5^2_6^2_8^1_a_65")
    assert resp_c568.status_code == 200
    data_c568 = resp_c568.json()
    assert any("ram_2020" in r["id"] for r in data_c568["references"])

