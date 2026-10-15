"""Catalog query and metadata management for 2D carbon allotropes."""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


import re

SUP_MAP = str.maketrans("0123456789+-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻")
SUB_MAP = str.maketrans("0123456789+-", "₀₁₂₃₄₅₆₇₈₉₊₋")


def clean_taxonomy_symbol(raw: str) -> str:
    """Format Girão taxonomy codes like 'r4^1_6^1_8^1' -> 'r4¹·6¹·8¹', 'alpha_gr' -> 'α-Gr'."""
    if not raw or raw == "N/A":
        return "N/A"
    special = {
        "alpha_gr": "α-Gr",
        "beta_gr": "β-Gr",
        "cmmm_graphene": "Cmmm-Gr",
        "photh_graphene": "PHOTH-Gr",
        "graphene": "h6₁",
        "h6_1": "h6₁",
    }
    if str(raw).lower() in special:
        return special[str(raw).lower()]

    parts = str(raw).split("_")
    idx = None
    if len(parts) > 1 and parts[-1].isascii() and parts[-1].isdigit():
        idx = parts.pop()

    rings = [re.sub(r'\^([0-9]+)', lambda m: m.group(1).translate(SUP_MAP), p) for p in parts]
    res = "·".join(rings)
    if idx:
        res += f" (#{idx})"
    return res


def clean_chart_label(item: dict) -> str:
    """Format concise, non-overlapping x-axis tick label for stability bar charts."""
    name = item.get("name", "")
    flagship = {
        "Pristine Graphene": "Graphene (h6₁)",
        "Biphenylene Network": "Biphenylene (r4¹6¹8¹)",
        "Phagraphene": "Phagraphene",
        "Pentaheptite": "Pentaheptite (r5²7²)",
        "Graphenylene": "Graphenylene",
        "Alpha Gr": "α-Gr",
        "Beta Gr": "β-Gr",
        "Cmmm Graphene": "Cmmm-Gr",
        "PHOTH-Graphene": "PHOTH-Gr",
    }
    if name in flagship:
        return flagship[name]
    if name.startswith("Allotrope "):
        raw_code = name.replace("Allotrope ", "")
        parts = raw_code.split("_")
        idx = None
        if len(parts) > 1 and parts[-1].isascii() and parts[-1].isdigit():
            idx = parts.pop()
        rings = [re.sub(r'\^([0-9]+)', lambda m: m.group(1).translate(SUP_MAP), p) for p in parts]
        formatted = "·".join(rings)
        if idx:
            return f"{formatted} (#{idx})"
        return formatted
    return name


def clean_display_name(item: dict) -> str:
    """Format clean allotrope display name without ugly raw caret or underscore codes."""
    name = item.get("name", "")
    special = {
        "alpha_gr": "α-Gr (Alpha Graphene)",
        "beta_gr": "β-Gr (Beta Graphene)",
        "cmmm_graphene": "Cmmm Graphene",
        "photh_graphene": "PHOTH-Graphene",
    }
    raw_id = item.get("id", "").lower()
    if raw_id in special:
        return special[raw_id]

    if name.startswith("Allotrope "):
        raw_code = name.replace("Allotrope ", "")
        parts = raw_code.split("_")
        idx = None
        if len(parts) > 1 and parts[-1].isascii() and parts[-1].isdigit():
            idx = parts.pop()
        rings = [re.sub(r'\^([0-9]+)', lambda m: m.group(1).translate(SUP_MAP), p) for p in parts]
        formatted = "·".join(rings)
        if idx:
            return f"Allotrope {formatted} (#{idx})"
        return f"Allotrope {formatted}"
    return name


class AllotropesCatalog:
    """Provides querying, searching, and filtering of 2D carbon allotropes."""

    def __init__(self, catalog_path: Optional[Path] = None) -> None:
        if catalog_path is None:
            catalog_path = Path(__file__).parent.parent / "data" / "catalog.json"
        self.catalog_path = Path(catalog_path)
        self._entries: List[Dict[str, Any]] = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if not self.catalog_path.exists():
            return []
        with open(self.catalog_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        biphenylene_ref = 0.456
        for item in data:
            de = float(item.get("delta_e_ev", 0.0))
            item["offset_biphenylene"] = round(de - biphenylene_ref, 3)

            raw_id = item.get("id", "")
            raw_sym = item.get("symbol", "")
            if "_" in raw_id and any(c.isdigit() for c in raw_id) and not raw_id.startswith("alpha") and not raw_id.startswith("beta") and not raw_id.startswith("cmmm") and not raw_id.startswith("photh"):
                target_code = raw_id
            else:
                target_code = raw_sym

            item["display_symbol"] = clean_taxonomy_symbol(target_code)
            item["display_name"] = clean_display_name(item)
            item["chart_label"] = clean_chart_label(item)

            wp = item.get("wallpaper_group", "p1")
            wp_num = item.get("wallpaper_number", 1)
            item["selector_label"] = (
                f"{item['display_name']} ({item['display_symbol']}) · "
                f"ΔE = {de:.3f} eV/atom · "
                f"Plane Group: {wp} (#{wp_num})"
            )
        return data

    def get_all(self) -> List[Dict[str, Any]]:
        """Return all catalog entries."""
        return list(self._entries)

    def get_featured(self) -> List[Dict[str, Any]]:
        """Return featured flagship allotropes."""
        return [entry for entry in self._entries if entry.get("featured", False)]

    def get_by_id(self, allotrope_id: str) -> Optional[Dict[str, Any]]:
        """Find an allotrope by its unique ID."""
        for entry in self._entries:
            if entry["id"] == allotrope_id:
                return entry
        return None

    def filter_by_crystal_system(self, crystal_system: str) -> List[Dict[str, Any]]:
        """Filter allotropes by crystal system."""
        return [
            entry
            for entry in self._entries
            if entry.get("crystal_system", "").lower() == crystal_system.lower()
        ]

    def filter_by_max_energy(self, max_delta_e: float) -> List[Dict[str, Any]]:
        """Filter allotropes with Delta E <= max_delta_e relative to graphene."""
        return [
            entry
            for entry in self._entries
            if entry.get("delta_e_ev", 999.0) <= max_delta_e
        ]
