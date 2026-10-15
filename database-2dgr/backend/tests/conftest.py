"""Test configuration and shared fixtures for 2D Carbon Explorer backend."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.crystallography import get_manifest


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def manifest():
    return get_manifest()


@pytest.fixture
def graphene_id() -> str:
    return "graphene"


@pytest.fixture
def biphenylene_id() -> str:
    return "biphenylene"
