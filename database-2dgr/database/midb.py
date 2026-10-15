"""MIDb (Materials Informatics Database) catalog query and metadata manager."""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


class MIDbCatalog:
    """Provides querying and filtering of MIDb 2D carbon allotropes and heterostructures."""

    def __init__(self, catalog_path: Optional[Path] = None) -> None:
        if catalog_path is None:
            catalog_path = Path(__file__).parent.parent / "data" / "midb_catalog.json"
        self.catalog_path = Path(catalog_path)
        self._raw_data: Dict[str, Any] = self._load()
        self._entries: List[Dict[str, Any]] = self._raw_data.get("records", [])

    def _load(self) -> Dict[str, Any]:
        if not self.catalog_path.exists():
            return {"records": [], "sankey_distribution": {}}
        with open(self.catalog_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_all(self) -> List[Dict[str, Any]]:
        """Return all MIDb records."""
        return list(self._entries)

    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Find a record by its unique ID."""
        for entry in self._entries:
            if entry["id"] == item_id or entry.get("uuid") == item_id:
                return entry
        return None

    def get_sankey_distribution(self) -> Dict[str, float]:
        """Return symmetry/crystal system distribution percentages."""
        return dict(self._raw_data.get("sankey_distribution", {
            "hexagonal": 59.2,
            "triclinic": 23.5,
            "monoclinic": 8.6,
            "orthorhombic": 8.7,
        }))

    def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Filter records by category."""
        return [
            e for e in self._entries
            if category.lower() in e.get("category", "").lower()
        ]
