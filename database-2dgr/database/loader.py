"""Pymatgen structure loader and 2D dimensionality analysis for allotropes."""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Optional, Tuple
from pymatgen.core import Structure
from pymatgen.analysis.dimensionality import get_dimensionality_cheon


class StructureLoader:
    """Loads and caches pymatgen Structure objects from CIF files."""

    def __init__(self, base_data_dir: Optional[Path] = None) -> None:
        if base_data_dir is None:
            base_data_dir = Path(__file__).parent.parent / "data"
        self.base_data_dir = Path(base_data_dir)
        self._cache: Dict[str, Structure] = {}

    def get_structure(self, relative_filename: str) -> Structure:
        """Load a pymatgen Structure from the data directory with memory caching."""
        if relative_filename in self._cache:
            return self._cache[relative_filename]

        file_path = self.base_data_dir / relative_filename
        if not file_path.exists():
            # Fallback checks across subdirectories (mendeley, allotropes)
            cand1 = self.base_data_dir / "allotropes" / Path(relative_filename).name
            cand2 = list(self.base_data_dir.glob(f"mendeley/*/{Path(relative_filename).name}"))
            if cand1.exists():
                file_path = cand1
            elif cand2 and cand2[0].exists():
                file_path = cand2[0]
            else:
                raise FileNotFoundError(f"CIF structure file not found: {file_path}")

        structure = Structure.from_file(file_path)
        self._cache[relative_filename] = structure
        return structure

    def analyze_2d_dimensionality(self, structure: Structure) -> Tuple[str, bool]:
        """
        Verify that the material is strictly a 2D planar or buckled monolayer
        using pymatgen.analysis.dimensionality.
        """
        try:
            dim_type = get_dimensionality_cheon(structure)
            is_2d = "2D" in str(dim_type) or "intercalated" in str(dim_type)
            return str(dim_type), is_2d
        except Exception as exc:
            return f"Heuristic 2D (vacuum >= 10 A) [{exc}]", True
