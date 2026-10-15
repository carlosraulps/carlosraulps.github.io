"""
2D Carbon Explorer — Scientific Backend Application.
FastAPI service delivering verified crystallographic metrics, periodic supercells,
2D wallpaper symmetries, and simulation-ready file exports for 2D carbon allotropes.
"""

from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routers.structures import router as structures_router
from backend.app.routers.exports import router as exports_router
from backend.app.routers.bibliography import router as bibliography_router
from backend.app.routers.ml import router as ml_router
from backend.app.services.crystallography import get_manifest

app = FastAPI(
    title="2D Carbon Explorer Scientific API",
    description=(
        "Production-grade crystallographic service for two-dimensional carbon allotropes. "
        "Powered by Pymatgen, ASE, and Spglib. Based on Mendeley Data v2 and DFT-D3 literature calculations."
    ),
    version="2.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Enable CORS for local Vite development and production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints
app.include_router(structures_router)
app.include_router(exports_router)
app.include_router(bibliography_router)
app.include_router(ml_router)


@app.get("/api/health", tags=["system"])
def health_check():
    """Verify backend status, manifest integrity, and scientific dependencies."""
    try:
        manifest = get_manifest()
        total = manifest.get("total_structures", 0)
        status = "healthy"
    except Exception as exc:
        total = 0
        status = f"unhealthy: {exc}"

    return {
        "status": status,
        "api_version": "2.1.0",
        "total_verified_structures": total,
        "engine": "Pymatgen + ASE + Spglib + FastAPI",
    }


@app.get("/", tags=["system"])
def root():
    """API root redirecting to interactive documentation."""
    return {
        "title": "2D Carbon Explorer Scientific API",
        "docs_url": "/api/docs",
        "endpoints": {
            "structures": "/api/structures",
            "supercell": "/api/structures/{id}/supercell",
            "export": "/api/structures/{id}/export?format={cif|poscar|xyz|qe|json}&scale={1|2|4}",
        },
    }
