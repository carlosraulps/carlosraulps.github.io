"""
Canonical Naming and Duplicate Mapping Service for 2D Carbon Allotropes.
Manages the 53 unique canonical allotropes out of the 61 catalog entries,
identifies the 8 duplicate entries, and resolves aliases bidirectionally.
Saves ~13.1% redundant computation for high-throughput DFT and ML modeling.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Set, Tuple

# Mapping of Duplicate entries to their Canonical Reference
# Only 53 of the 61 entries are unique. Exactly 8 entries are aliases:
# 1. G-03 (h6^1_191) -> alias of G-01 (graphene)
# 2. G-13 (beta_gr) -> alias of G-02 (biphenylene)
# 3. G-15 (r4^1_6^1_8^1_47) -> alias of G-02 (biphenylene)
# 4. G-25 (pentaheptite) -> alias of G-04 (c5^2_7^2_65)
# 5. G-14 (cmmm_graphene) -> alias of G-05 (c5^2_6^4_8^1_65)
# 6. G-08 (phagraphene) -> alias of G-07 (r5^2_6^6_7^2_51)
# 7. G-12 (alpha_gr) -> alias of G-07 (r5^2_6^6_7^2_51)
# 8. G-61 (h4^3_6^2_12^1_191) -> alias of G-60 (graphenylene)

DUPLICATE_MAP: Dict[str, str] = {
    "h6^1_191": "graphene",                 # G-03 -> G-01
    "G-03": "graphene",
    "beta_gr": "biphenylene",               # G-13 -> G-02
    "G-13": "biphenylene",
    "r4^1_6^1_8^1_47": "biphenylene",       # G-15 -> G-02
    "G-15": "biphenylene",
    "pentaheptite": "c5^2_7^2_65",          # G-25 -> G-04
    "G-25": "c5^2_7^2_65",
    "cmmm_graphene": "c5^2_6^4_8^1_65",     # G-14 -> G-05
    "G-14": "c5^2_6^4_8^1_65",
    "phagraphene": "r5^2_6^6_7^2_51",       # G-08 -> G-07
    "G-08": "r5^2_6^6_7^2_51",
    "alpha_gr": "r5^2_6^6_7^2_51",          # G-12 -> G-07
    "G-12": "r5^2_6^6_7^2_51",
    "h4^3_6^2_12^1_191": "graphenylene",    # G-61 -> G-60
    "G-61": "graphenylene",
    "C568": "c5^2_6^2_8^1_b_65",           # Literature alias -> G-50
    "c568": "c5^2_6^2_8^1_b_65",
    "Me-graphene": "c5^2_6^2_8^1_b_65",    # Literature alias -> G-50
    "me_graphene": "c5^2_6^2_8^1_b_65",
    "me-graphene": "c5^2_6^2_8^1_b_65",
    "P-4m2-lb-C13": "c5^2_6^2_8^1_b_65",
    "G-50": "c5^2_6^2_8^1_b_65",
}

# Canonical primary names and verified literature designations
CANONICAL_LITERATURE_METADATA: Dict[str, Dict[str, Any]] = {
    "graphene": {
        "literature_name": "Pristine Graphene",
        "girao_code": "h6_1",
        "girao_symbol": "h6₁",
        "aliases": ["G-01", "G-03", "h6^1_191", "Graphene monolayer"],
        "is_benchmark": True,
        "verified_delta_e": 0.000,
        "literature_reference": "Table 1, Ref [1]",
        "historical_synthesis_year": 2004,
        "seminal_doi": "10.1126/science.1102896",
    },
    "biphenylene": {
        "literature_name": "Biphenylene Network",
        "girao_code": "r4^1_6^1_8^1_47",
        "girao_symbol": "r4¹·6¹·8¹",
        "aliases": ["G-02", "G-13", "G-15", "beta_gr", "β-Gr", "r4^1_6^1_8^1_47"],
        "is_benchmark": True,
        "verified_delta_e": 0.456,
        "literature_reference": "Table 1, Ref [13, 26]",
        "historical_synthesis_year": 2021,
        "seminal_doi": "10.1126/science.abg4509",
    },
    "c5^2_7^2_65": {
        "literature_name": "Pentaheptite",
        "girao_code": "c5^2_7^2_65",
        "girao_symbol": "c5²·7²",
        "aliases": ["G-04", "G-25", "pentaheptite", "C57"],
        "is_benchmark": False,
        "verified_delta_e": 0.239,
        "literature_reference": "Table 1, Ref [8–10]",
        "historical_synthesis_year": 1996,
        "seminal_doi": "10.1103/PhysRevB.53.R13303",
    },
    "c5^2_6^4_8^1_65": {
        "literature_name": "Cmmm Graphene",
        "girao_code": "c5^2_6^4_8^1_65",
        "girao_symbol": "c5²·6⁴·8¹",
        "aliases": ["G-05", "G-14", "cmmm_graphene", "Cmmm carbon"],
        "is_benchmark": False,
        "verified_delta_e": 0.236,
        "literature_reference": "Table 1, Ref [11]",
        "historical_synthesis_year": 2012,
        "seminal_doi": "10.1063/1.4746115",
    },
    "r5^2_6^6_7^2_51": {
        "literature_name": "Phagraphene",
        "girao_code": "r5^2_6^6_7^2_51",
        "girao_symbol": "r5²·6⁶·7²",
        "aliases": ["G-07", "G-08", "G-12", "phagraphene", "alpha_gr", "α-Gr"],
        "is_benchmark": True,
        "verified_delta_e": 0.193,
        "literature_reference": "Table 1, Ref [17]",
        "historical_synthesis_year": 2015,
        "seminal_doi": "10.1021/acs.nanolett.5b02512",
    },
    "graphenylene": {
        "literature_name": "Graphenylene",
        "girao_code": "h4^3_6^2_12^1_191",
        "girao_symbol": "h4³·6²·12¹",
        "aliases": ["G-60", "G-61", "h4^3_6^2_12^1_191", "Net C"],
        "is_benchmark": True,
        "verified_delta_e": 0.622,
        "literature_reference": "Table 1, Ref [14, 25, 35–37]",
        "historical_synthesis_year": 2013,
        "seminal_doi": "10.1021/jp4012218",
    },
    "photh_graphene": {
        "literature_name": "PHOTH-Graphene",
        "girao_code": "r4^2_6^2_8^2_47",
        "girao_symbol": "r4²·6²·8²",
        "aliases": ["G-09", "photh_graphene", "PHOTH-Gr"],
        "is_benchmark": True,
        "verified_delta_e": 0.539,
        "literature_reference": "Internal PBE-VASP (04_strain_analysis)",
        "historical_synthesis_year": 2025,
        "seminal_doi": "10.1038/s41524-025-01932-8",
    },
    "c5^2_6^2_8^1_b_65": {
        "literature_name": "C568",
        "girao_code": "c5^2_6^2_8^1_b_65",
        "girao_symbol": "c5²·6²·8¹·b",
        "aliases": ["C568", "c568", "Me-graphene", "me-graphene", "c58", "G-50", "c5^2_6^2_8^1_b_65", "P-4m2-lb-C13"],
        "is_benchmark": False,
        "verified_delta_e": 0.196,
        "literature_reference": "Ram & Mizuseki, Carbon 158 (2020) 827; Zhuo et al., Nanoscale 12 (2020) 19359",
        "historical_synthesis_year": 2020,
        "seminal_doi": "10.1016/j.carbon.2019.11.062",
    },
}


def is_canonical_structure(identifier: str) -> bool:
    """Return True if identifier is not an alias."""
    return identifier not in DUPLICATE_MAP


def resolve_canonical_id(identifier: str) -> str:
    """Resolve any alias or code to its canonical structure ID."""
    return DUPLICATE_MAP.get(identifier, identifier)


def get_canonical_group(canonical_id: str) -> List[str]:
    """Get all aliases and catalog codes that map to this canonical ID."""
    res = [canonical_id]
    for alias, target in DUPLICATE_MAP.items():
        if target == canonical_id and alias not in res:
            res.append(alias)
    return res


def compute_savings_summary(total_entries: int = 61, unique_entries: int = 53) -> Dict[str, Any]:
    """Compute reduction statistics from filtering duplicates."""
    saved_runs = total_entries - unique_entries
    savings_pct = round((saved_runs / total_entries) * 100, 2)
    return {
        "total_catalog_entries": total_entries,
        "unique_canonical_structures": unique_entries,
        "duplicate_entries": saved_runs,
        "compute_savings_percentage": savings_pct,
        "duplicate_pairs": [
            {"alias": k, "canonical": v}
            for k, v in DUPLICATE_MAP.items()
            if not k.startswith("G-")
        ],
    }
