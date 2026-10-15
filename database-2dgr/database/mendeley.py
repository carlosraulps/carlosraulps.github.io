"""Mendeley 2D Carbon Allotropes catalog query and metadata manager."""

from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from pymatgen.core import Structure

from database.catalog import clean_taxonomy_symbol, clean_chart_label

SUP_MAP = str.maketrans("0123456789+-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻")


def parse_rings_from_symbol(symbol: str) -> Dict[int, int]:
    """Parse ring configuration like 'h4^6_6^8_8^3_12^1' -> {4: 6, 6: 8, 8: 3, 12: 1}."""
    rings: Dict[int, int] = {}
    parts = symbol.split("_")
    for part in parts:
        # strip crystal system prefix if present (h, r, c, o, t)
        cleaned = re.sub(r"^[a-zA-Z]+", "", part)
        match = re.match(r"^(\d+)\^(\d+)$", cleaned)
        if match:
            ring_size = int(match.group(1))
            ring_count = int(match.group(2))
            rings[ring_size] = ring_count
    return rings


class MendeleyCatalog:
    """Provides querying and filtering of the 52 Mendeley 2D carbon allotropes dataset."""

    def __init__(
        self,
        base_dir: Optional[Path] = None,
        cache_path: Optional[Path] = None,
        force_reload: bool = False,
    ) -> None:
        project_root = Path(__file__).parent.parent
        self.base_dir = Path(base_dir) if base_dir else project_root / "data" / "mendeley"
        self.cache_path = Path(cache_path) if cache_path else project_root / "data" / "mendeley_catalog.json"
        self._entries: List[Dict[str, Any]] = []
        self._cache_structures: Dict[str, Structure] = {}

        if self.cache_path.exists() and not force_reload:
            self._load_cache()
        else:
            self._build_and_cache(project_root / "data" / "catalog.json")

    def _load_cache(self) -> None:
        with open(self.cache_path, "r", encoding="utf-8") as f:
            self._entries = json.load(f)

    def _build_and_cache(self, master_catalog_path: Path) -> None:
        master_records: Dict[str, Dict[str, Any]] = {}
        if master_catalog_path.exists():
            with open(master_catalog_path, "r", encoding="utf-8") as f:
                raw_master = json.load(f)
            for m in raw_master:
                if "filename" in m:
                    master_records[m["filename"]] = m
                    master_records[Path(m["filename"]).name] = m
                if "id" in m:
                    master_records[m["id"]] = m
                if "symbol" in m:
                    master_records[m["symbol"]] = m

        entries: List[Dict[str, Any]] = []
        if self.base_dir.exists():
            for cif_file in sorted(self.base_dir.glob("*/*.cif")):
                system_dir = cif_file.parent.name
                stem = cif_file.stem
                rel_path = f"mendeley/{system_dir}/{cif_file.name}"

                # Match with master catalog
                master_match = (
                    master_records.get(cif_file.name)
                    or master_records.get(stem)
                    or master_records.get(f"allotropes/{cif_file.name}")
                    or {}
                )

                # Space group number
                sg_num = None
                sg_match = re.search(r"_(\d+)$", stem)
                if sg_match:
                    sg_num = int(sg_match.group(1))

                # Symbol without space group number
                raw_sym = re.sub(r"_\d+$", "", stem)
                # rings
                rings = parse_rings_from_symbol(raw_sym)
                polygon_types = sorted(list(rings.keys()))
                polygon_count = sum(rings.values())

                entry: Dict[str, Any] = {
                    "id": stem,
                    "filename": cif_file.name,
                    "relative_path": rel_path,
                    "crystal_system": system_dir.replace("_", " "),
                    "system_key": system_dir,
                    "raw_symbol": raw_sym,
                    "display_symbol": clean_taxonomy_symbol(raw_sym),
                    "space_group_number": sg_num,
                    "space_group": master_match.get("space_group", f"#{sg_num}" if sg_num else "N/A"),
                    "rings": rings,
                    "polygon_types": polygon_types,
                    "polygon_count": polygon_count,
                    "delta_e_ev": master_match.get("delta_e_ev", 0.0),
                    "natoms": master_match.get("natoms", 0),
                    "density": master_match.get("density", 0.0),
                    "wallpaper_group": master_match.get("wallpaper_group", "N/A"),
                    "wallpaper_number": master_match.get("wallpaper_number", 0),
                    "reference": master_match.get("reference", "Girão et al. (Mendeley Data)"),
                    "dataset_source": "mendeley",
                }

                # Human-friendly display name
                if stem == "h6^1_191":
                    entry["display_name"] = "Graphene (h6¹)"
                elif stem == "r4^1_6^1_8^1_47":
                    entry["display_name"] = "Biphenylene (r4¹6¹8¹)"
                else:
                    entry["display_name"] = f"{entry['crystal_system']} {entry['display_symbol']}"

                entry["selector_label"] = (
                    f"{entry['display_name']} · "
                    f"ΔE = {entry['delta_e_ev']:.3f} eV/atom · "
                    f"SG: #{sg_num} · {entry['crystal_system']}"
                )
                entries.append(entry)

        self._entries = entries
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_path, "w", encoding="utf-8") as f:
            json.dump(self._entries, f, indent=2)

    def get_all(self) -> List[Dict[str, Any]]:
        """Return all Mendeley dataset entries."""
        return list(self._entries)

    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Find an entry by its ID or filename stem."""
        for entry in self._entries:
            if entry["id"] == item_id or entry["filename"] == item_id or entry["relative_path"] == item_id:
                return entry
        return None

    def get_by_system(self, system: str) -> List[Dict[str, Any]]:
        """Filter entries by crystal system name (case-insensitive)."""
        clean_sys = system.lower().replace(" ", "_")
        return [
            e
            for e in self._entries
            if e["system_key"].lower() == clean_sys or e["crystal_system"].lower() == system.lower()
        ]

    def get_systems(self) -> List[str]:
        """Return unique crystal system names."""
        return sorted(list({e["crystal_system"] for e in self._entries}))

    def get_system_distribution(self) -> Dict[str, int]:
        """Return counts per crystal system."""
        dist: Dict[str, int] = {}
        for e in self._entries:
            sys = e["crystal_system"]
            dist[sys] = dist.get(sys, 0) + 1
        return dist

    def get_structure(self, item_id: str) -> Structure:
        """Load and cache the pymatgen Structure object for a Mendeley allotrope."""
        if item_id in self._cache_structures:
            return self._cache_structures[item_id]

        entry = self.get_by_id(item_id)
        if not entry:
            raise KeyError(f"Allotrope {item_id} not found in Mendeley catalog")

        project_root = Path(__file__).parent.parent
        cif_path = project_root / "data" / entry["relative_path"]
        if not cif_path.exists():
            raise FileNotFoundError(f"CIF file not found at {cif_path}")

        structure = Structure.from_file(cif_path)
        self._cache_structures[item_id] = structure
        return structure
