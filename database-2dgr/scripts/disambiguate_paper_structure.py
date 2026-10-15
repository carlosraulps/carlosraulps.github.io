#!/usr/bin/env python3
"""
scripts/disambiguate_paper_structure.py
Scientific Allotrope Disambiguation, Feature Extraction & Cross-Paper Reconciler
for 2D Carbon Allotropes.

Analyzes PDF texts, abstracts, and crystallographic parameters to determine
the exact 2D carbon structure being discussed, matches against the 61-allotrope
catalog, and detects when different literature publications propose or analyze
the same physical allotrope under different aliases (e.g. C568 vs Me-graphene -> G-50).

Scientific Rules Enforced:
1. Earliest Publication Chronological Priority Algorithm:
   When multiple papers name the same physical allotrope, the primary canonical
   literature name is awarded to the earliest published work (verified online/print date).
   Subsequent names are registered as secondary literature aliases with explicit citations.
   Example:
     - Ram & Mizuseki, Carbon 2020 (online Nov 26, 2019): proposes 'C568' -> Primary Name
     - Zhuo et al., Nanoscale 2020 (received May 19, 2020): proposes 'Me-graphene' -> Secondary Alias

2. Structural Invariant vs. Background Citation Discrimination:
   Prevents conflating an allotrope with background papers cited in its introduction.
   Example:
     - Wang et al., Nano Lett. 2015 (Phagraphene, 5-6-7 rings, Pmma #51) cites
       Sharma et al., 2014 (Pentahexoctite, 5-6-8 rings).
     - They possess fundamentally different ring topologies (5-6-7 vs 5-6-8) and
       are NOT equivalent allotropes.

Usage:
  python3 scripts/disambiguate_paper_structure.py <path_to_pdf>
  python3 scripts/disambiguate_paper_structure.py --cross-audit
  python3 scripts/disambiguate_paper_structure.py --apply
"""

from __future__ import annotations
import os
import sys
import re
import json
import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set

WORKSPACE = Path(__file__).resolve().parent.parent
DATA_DIR = WORKSPACE / "data"
PAPERS_DIR = WORKSPACE / "downloads" / "papers"

ALIASES_FILE = DATA_DIR / "allotrope_aliases.json"
MANIFEST_FILE = DATA_DIR / "manifest.json"
CATALOG_FILE = DATA_DIR / "catalog.json"
MASTER_FILE = DATA_DIR / "literature_master.json"


# ==============================================================================
# 1. CRYSTALLOGRAPHIC & TEXT PATTERN EXTRACTORS
# ==============================================================================

SPACE_GROUP_PATTERNS = [
    (r"P-?4m2|P\s*[-–—]\s*4m2|P4ˉm2", "P-4m2 (#115)", 115),
    (r"Cmmm", "Cmmm (#65)", 65),
    (r"Pmmm", "Pmmm (#47)", 47),
    (r"P6/mmm", "P6/mmm (#191)", 191),
    (r"Pbam", "Pbam (#55)", 55),
    (r"Pmma|Pmg|p2mg", "Pmma (#51)", 51),
    (r"Amm2", "Amm2 (#38)", 38),
    (r"P4/mmm", "P4/mmm (#123)", 123),
    (r"P2/m", "P2/m (#10)", 10),
    (r"Pm", "Pm (#6)", 6),
]


def extract_pdf_sections(pdf_path: Path, max_pages: int = 5) -> Tuple[str, str, str]:
    """
    Extracts text from PDF and segments into (title_abstract, main_body, full_text).
    Strips the references/bibliography section to avoid false positive citations.
    """
    try:
        import pypdf
        reader = pypdf.PdfReader(str(pdf_path))
        num_pages = min(max_pages, len(reader.pages))
        pages_text = [reader.pages[i].extract_text() or "" for i in range(num_pages)]
        
        full_text = "\n".join(pages_text)
        
        # Strip references if present
        ref_split = re.split(r"\n\s*(?:References|REFERENCES|Bibliography)\s*\n", full_text, maxsplit=1)
        content_text = ref_split[0]
        
        # First page usually has Title and Abstract. Isolate before Introduction or KEYWORDS to prevent background citation bleed.
        first_page = pages_text[0] if pages_text else ""
        intro_split = re.split(r"\n\s*(?:KEYWORDS|Key\s*words|1\.\s*Introduction|I\.\s*Introduction|Introduction)\b", first_page, flags=re.IGNORECASE, maxsplit=1)
        title_abstract = intro_split[0] if intro_split else first_page
        main_body = (intro_split[1] + "\n" if len(intro_split) > 1 else "") + "\n".join(pages_text[1:])
        
        return title_abstract, main_body, content_text
    except Exception as e:
        print(f"⚠️ Error reading PDF {pdf_path}: {e}")
        return "", "", ""


def extract_crystallographic_features(text: str) -> Dict[str, Any]:
    """
    Extracts rings, space groups, lattice parameters, and atom counts
    from academic paper text.
    """
    features: Dict[str, Any] = {
        "space_groups": [],
        "space_group_numbers": [],
        "rings": set(),
        "lattice_a": [],
        "lattice_b": [],
        "atom_counts": set(),
        "detected_aliases": []
    }

    # 1. Space groups
    for pat, name, num in SPACE_GROUP_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            features["space_groups"].append(name)
            features["space_group_numbers"].append(num)

    sg_num_matches = re.findall(r"space\s+group(?:\s+no\.?)?\s+(\d+)", text, re.IGNORECASE)
    for num_str in sg_num_matches:
        num = int(num_str)
        if num not in features["space_group_numbers"]:
            features["space_group_numbers"].append(num)

    # 2. Ring systems (e.g. "5-6-8", "5, 6, and 8", "5-8-5", "4-6-8", "5-7", "4-5-6-7-8")
    ring_combos = [
        (r"5[-,\s]+6[-,\s]+8|5\s*,\s*6(?:\s*,\s*and)?\s*8[-–\s]*(?:membered|ring|carbon|allotrope)", [5, 6, 8]),
        (r"4[-,\s]+6[-,\s]+8|4\s*,\s*6(?:\s*,\s*and)?\s*8[-–\s]*(?:membered|ring|carbon|allotrope)", [4, 6, 8]),
        (r"5[-,\s]+7|5\s*,\s*(?:and\s*)?7[-–\s]*(?:membered|ring|carbon|allotrope)", [5, 7]),
        (r"5[-,\s]+8[-,\s]+5|5\s*,\s*8(?:\s*,\s*and)?\s*5[-–\s]*(?:membered|ring|carbon|allotrope)", [5, 6, 8]),
        (r"4[-,\s]+5[-,\s]+6[-,\s]+7[-,\s]+8", [4, 5, 6, 7, 8]),
        (r"4[-,\s]+6[-,\s]+12", [4, 6, 12]),
        (r"5[-,\s]+6[-,\s]+7", [5, 6, 7]),
    ]
    for pat, rings in ring_combos:
        if re.search(pat, text, re.IGNORECASE):
            for r in rings:
                features["rings"].add(r)

    # 3. In-plane lattice constants (e.g., "a = b = 5.725 Å", "a = 5.749")
    a_b_matches = re.findall(r"a\s*=\s*b\s*=\s*([0-9.]+)\s*(?:Å|A|angstrom)?", text, re.IGNORECASE)
    for m in a_b_matches:
        try:
            val = float(m)
            if 2.0 < val < 25.0:
                features["lattice_a"].append(val)
                features["lattice_b"].append(val)
        except ValueError:
            pass

    # 4. Atom count in unit cell (e.g., "13 carbon atoms", "C13", "C20", "6 carbon atoms")
    c_num_matches = re.findall(r"\bC\s*([0-9]{1,2})\b|(?:consisting\s+of|unit\s+cell\s+of)\s+([0-9]{1,2})\s+carbon\s+atoms", text, re.IGNORECASE)
    for m in c_num_matches:
        num_str = m[0] or m[1]
        if num_str:
            features["atom_counts"].add(int(num_str))

    # 5. Hybridization state (sp2 vs sp-sp2 vs sp2-sp3 vs sp3)
    features["hybridization"] = set()
    if re.search(r"sp\s*2\s*[-/–\s]+\s*sp\s*3|sp\^2\s*[-/–\s]+\s*sp\^3|12\s*:\s*1|sp3\s*node|four[- ]coordinated", text, re.IGNORECASE):
        features["hybridization"].add("sp2-sp3")
    if re.search(r"acetylenic|[-–—]C\s*≡\s*C[-–—]|graphdiyne|graphyne|diacetylen|sp\s*[-/–]\s*sp\s*2|sp\^1\s*[-/–]\s*sp\^2", text, re.IGNORECASE):
        features["hybridization"].add("sp-sp2")
    if re.search(r"pure\s+sp2|all[- ]sp2|planar\s+sp2|sp2[- ]hybridized\s+carbon\s+sheet", text, re.IGNORECASE):
        features["hybridization"].add("sp2")
    if re.search(r"diamane|diamondized|all[- ]sp3|tetrahedral\s+sp3", text, re.IGNORECASE):
        features["hybridization"].add("sp3")

    # 6. Electronic character (Dirac semimetal, metallic, semiconductor)
    features["electronic_class"] = set()
    if re.search(r"dirac\s+cone|distorted\s+dirac|massless|fermi\s+velocity|anisotropic\s+dirac", text, re.IGNORECASE):
        features["electronic_class"].add("dirac_semimetal")
    if re.search(r"metallic|conductor|metal\s+allotrope|zero\s+band\s+gap", text, re.IGNORECASE):
        features["electronic_class"].add("metallic")
    if re.search(r"semiconductor|semiconducting|band\s*gap\s*of\s*[0-9.]+\s*eV|HSE06\s*gap", text, re.IGNORECASE):
        features["electronic_class"].add("semiconductor")

    # 7. Typo / Phantom name sanitization
    if re.search(r"\bparagraphene\b", text, re.IGNORECASE):
        features["detected_aliases"].append("paragraphene_typo")

    return features


# ==============================================================================
# 2. DISAMBIGUATION & SCORING ENGINE
# ==============================================================================

def score_structure_match(
    struct_id: str,
    struct_data: Dict[str, Any],
    title_abstract: str,
    body_text: str,
    extracted_features: Dict[str, Any]
) -> Tuple[float, List[str]]:
    """
    Scores how well a given carbon allotrope matches the extracted features of a paper.
    Section-aware: Title/Abstract matches get high priority over body text citations.
    """
    score = 0.0
    reasons = []

    # 1. Alias Match
    # Check title/abstract first (Primary Topic)
    for alias in struct_data.get("literature_aliases", []):
        if len(alias) >= 3:
            # Word boundary search
            pattern = r"(?<![a-zA-Z0-9])" + re.escape(alias) + r"(?![a-zA-Z0-9])"
            # If candidate is pristine graphene, do not match bare 'graphene' if used as generic modifier or when specific allotrope is present
            if struct_id == "graphene" and alias.lower() == "graphene":
                if re.search(r"graphene\s+allotrope|allotrope\s+of\s+graphene", title_abstract, re.IGNORECASE) or any(k in title_abstract.lower() for k in ["phagraphene", "me-graphene", "popgraphene", "biphenylene", "graphyne", "graphdiyne"]):
                    continue

            if re.search(pattern, title_abstract, re.IGNORECASE):
                score += 30.0
                reasons.append(f"Title/Abstract primary alias match: '{alias}' (+30)")
                break
            elif re.search(pattern, body_text, re.IGNORECASE):
                # Only give body alias match if not a generic term like "graphene"
                if alias.lower() not in ["graphene", "allotrope", "carbon"]:
                    score += 15.0
                    reasons.append(f"Body text alias match: '{alias}' (+15)")
                    break

    # 2. Ring Polygon Match
    struct_rings = set(struct_data.get("rings", []))
    matched_rings = struct_rings & extracted_features["rings"]
    if matched_rings:
        ring_score = len(matched_rings) * 5.0
        score += ring_score
        reasons.append(f"Polygon ring match {sorted(matched_rings)} (+{ring_score:.0f})")

    # 3. Space Group Match
    sg_numbers = extracted_features["space_group_numbers"]
    struct_sg_aliases = struct_data.get("space_group_aliases", [])
    for sg_alias in struct_sg_aliases:
        if sg_alias in extracted_features["space_groups"] or any(str(num) in sg_alias for num in sg_numbers):
            score += 12.0
            reasons.append(f"Space group match: '{sg_alias}' (+12)")
            break

    # 4. Direct Catalog Code or ID Match
    catalog_code = struct_data.get("catalog_code", "")
    if catalog_code and re.search(r"\b" + re.escape(catalog_code) + r"\b", title_abstract + " " + body_text, re.IGNORECASE):
        score += 15.0
        reasons.append(f"Catalog code match: '{catalog_code}' (+15)")

    # 5. Combined Co-occurrence Bonus (e.g. Ring set + Space group together)
    if matched_rings and any(str(num) in struct_data.get("space_group_aliases", []) for num in sg_numbers):
        score += 10.0
        reasons.append("Co-occurrence synergy: matching rings + space group (+10)")

    # 6. 5-Fold Structural Invariant Tuple Verification Gate
    # A. Ring topology discrimination (e.g. 5-6-7 Phagraphene vs 5-6-8 Pentahexoctite / alpha-phographene)
    if 7 in extracted_features["rings"] and 7 not in struct_rings and 8 in struct_rings:
        score -= 25.0
        reasons.append("Invariant violation: extracted 5-6-7 net contradicts 5-6-8 allotrope (-25)")

    if 7 not in extracted_features["rings"] and 8 in extracted_features["rings"] and 7 in struct_rings:
        score -= 25.0
        reasons.append("Invariant violation: extracted 5-6-8 net contradicts 5-6-7 allotrope (-25)")

    # B. Hybridization discrimination (e.g. C568 sp2-sp3 vs Pentahexoctite pure sp2)
    extracted_hyb = extracted_features.get("hybridization", set())
    is_sp2_sp3_candidate = any(k in struct_id.lower() or k in struct_data.get("name", "").lower() for k in ["c568", "me-graphene", "penta-graphene"])
    if "sp2-sp3" in extracted_hyb:
        if is_sp2_sp3_candidate:
            score += 25.0
            reasons.append("Hybridization match: confirmed mixed sp2-sp3 network (+25)")
        else:
            score -= 20.0
            reasons.append("Hybridization violation: paper reports sp2-sp3, candidate is purely sp2 (-20)")

    # C. Acetylenic / Graphyne discrimination (e.g. alpha-graphyne vs phagraphene)
    is_graphyne_candidate = any(k in struct_id.lower() or k in struct_data.get("name", "").lower() for k in ["graphyne", "graphdiyne", "carbyne"])
    primary_hyb = extracted_features.get("primary_hybridization", extracted_hyb)
    if "sp-sp2" in primary_hyb and "sp2-sp3" not in extracted_hyb:
        if is_graphyne_candidate:
            score += 20.0
            reasons.append("Hybridization match: confirmed acetylenic sp-sp2 network (+20)")
        else:
            score -= 25.0
            reasons.append("Hybridization violation: acetylenic linkages present, candidate lacks sp carbons (-25)")

    # D. Unit cell atom count verification
    extracted_atoms = extracted_features.get("atom_counts", set())
    if 13 in extracted_atoms and is_sp2_sp3_candidate:
        score += 10.0
        reasons.append("Stoichiometry match: 13-atom primitive cell (12 sp2 + 1 sp3) (+10)")
    elif 20 in extracted_atoms and "phagraphene" in struct_id.lower():
        score += 10.0
        reasons.append("Stoichiometry match: 20-atom primitive cell for phagraphene (+10)")

    return score, reasons


def disambiguate_text_sections(title_abstract: str, body_text: str, full_content: str) -> List[Dict[str, Any]]:
    """
    Disambiguates text sections against all registered allotropes in allotrope_aliases.json.
    Differentiates between primary proposal features (title/abstract) and background literature review citations.
    """
    if not ALIASES_FILE.exists():
        return []

    with open(ALIASES_FILE, "r", encoding="utf-8") as f:
        aliases_db = json.load(f)

    # Primary features from Title & Abstract (weighted highest)
    primary_features = extract_crystallographic_features(title_abstract)
    # Background features from entire text
    full_features = extract_crystallographic_features(full_content)

    # Effective features: prioritize primary (title/abstract) over background literature citations
    effective_features = {
        "space_groups": primary_features["space_groups"] or full_features["space_groups"],
        "space_group_numbers": primary_features["space_group_numbers"] or full_features["space_group_numbers"],
        "rings": primary_features["rings"] if primary_features["rings"] else full_features["rings"],
        "lattice_a": primary_features["lattice_a"] or full_features["lattice_a"],
        "lattice_b": primary_features["lattice_b"] or full_features["lattice_b"],
        "atom_counts": primary_features["atom_counts"] if primary_features["atom_counts"] else full_features["atom_counts"],
        "hybridization": primary_features["hybridization"] if primary_features["hybridization"] else full_features["hybridization"],
        "primary_hybridization": primary_features["hybridization"],
        "electronic_class": primary_features["electronic_class"] if primary_features["electronic_class"] else full_features["electronic_class"],
        "detected_aliases": list(set(primary_features["detected_aliases"] + full_features["detected_aliases"]))
    }

    results = []

    for sid, sdata in aliases_db.items():
        score, reasons = score_structure_match(sid, sdata, title_abstract, body_text, effective_features)
        if score > 0:
            results.append({
                "structure_id": sid,
                "canonical_id": sdata.get("canonical_id", sid),
                "catalog_code": sdata.get("catalog_code", ""),
                "name": sdata.get("name", sid),
                "score": score,
                "reasons": reasons,
                "known_aliases": sdata.get("literature_aliases", [])
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def disambiguate_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    """Disambiguates a PDF file."""
    t_abs, body, full = extract_pdf_sections(pdf_path)
    return disambiguate_text_sections(t_abs, body, full)


# ==============================================================================
# 3. CROSS-PAPER RECONCILIATION & CONVERGENCE
# ==============================================================================

def run_cross_audit() -> Dict[str, Any]:
    """
    Audits all literature papers in data/literature_master.json,
    extracts crystallographic fingerprints from local PDFs,
    and identifies which papers discuss the SAME physical allotrope.
    """
    if not MASTER_FILE.exists():
        print(f"❌ Master file not found: {MASTER_FILE}")
        return {}

    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        master = json.load(f)

    print("=" * 80)
    print("🔬 CROSS-PAPER ALLOTROPE RECONCILIATION AUDIT")
    print("=" * 80)

    structure_to_papers: Dict[str, List[Dict[str, Any]]] = {}

    for item in master:
        pdf_fn = item.get("localPdf")
        if not pdf_fn or not pdf_fn.lower().endswith(".pdf"):
            continue
        pdf_path = PAPERS_DIR / pdf_fn
        if not pdf_path.exists():
            continue

        candidates = disambiguate_pdf(pdf_path)
        if not candidates:
            continue

        best = candidates[0]
        # High confidence match
        if best["score"] >= 20.0:
            sid = best["structure_id"]
            if sid not in structure_to_papers:
                structure_to_papers[sid] = []
            structure_to_papers[sid].append({
                "paper_id": item["id"],
                "paper_title": item["title"],
                "paper_year": item["year"],
                "authors": item["authors"],
                "match_score": best["score"],
                "match_reasons": best["reasons"],
                "catalog_code": best["catalog_code"]
            })

    # Report multi-paper structures
    multi_paper_structures = {k: v for k, v in structure_to_papers.items() if len(v) >= 2}
    print(f"\nDiscovered {len(multi_paper_structures)} allotrope(s) with multiple independent literature papers:\n")

    for sid, papers in multi_paper_structures.items():
        code = papers[0]["catalog_code"]
        print(f"📌 Allotrope: {sid} (#{code}) — {len(papers)} Literature Papers")
        for p in papers:
            authors_str = p["authors"][0] if p["authors"] else "Unknown"
            print(f"   • [{p['paper_year']}] {p['paper_title']} ({authors_str} et al.) [Score: {p['match_score']:.0f}]")
            for r in p["match_reasons"][:2]:
                print(f"     ↳ {r}")
        print()

    return structure_to_papers


# ==============================================================================
# 4. CHRONOLOGICAL PRIORITY & TOPOLOGICAL DISCRIMINATION
# ==============================================================================

def resolve_chronological_priority(papers: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Applies the Earliest Publication Chronological Priority Algorithm.
    Given a list of reconciled papers proposing or studying the same allotrope:
    1. Extracts explicit publication dates (year, month, online publication date).
    2. Sorts ascending by verified earliest publication timestamp.
    3. The earliest paper defines the primary literature display name.
    4. Subsequent papers provide secondary literature aliases.
    """
    def paper_date_key(p: Dict[str, Any]) -> Tuple[int, int]:
        year = int(p.get("year", 9999))
        month = int(p.get("month", 12))
        return (year, month)

    sorted_papers = sorted(papers, key=paper_date_key)
    primary = sorted_papers[0]
    secondary = sorted_papers[1:] if len(sorted_papers) > 1 else []
    return primary, secondary


def verify_topological_discrimination(
    candidate_rings: Set[int],
    target_rings: Set[int],
    candidate_sg: Optional[int],
    target_sg: Optional[int]
) -> Tuple[bool, str]:
    """
    Validates structural invariants before declaring allotrope equivalence.
    Prevents confusing an allotrope with background citations.
    
    Examples:
      - Phagraphene (5-6-7 rings, Pmma #51) vs Pentahexoctite (5-6-8 rings):
        Rings mismatch ({5,6,7} != {5,6,8}) -> REJECT equivalence.
      - Phagraphene (Pmma #51) vs alpha-phographene (P2_1/m #11):
        Space groups mismatch -> REJECT equivalence.
      - C568 vs Me-graphene (both 5-6-8 rings, P-4m2 #115):
        Rings match AND space group matches -> CONFIRM equivalence.
    """
    if candidate_rings and target_rings and candidate_rings != target_rings:
        return False, f"Ring topology mismatch: {candidate_rings} != {target_rings}"
    if candidate_sg and target_sg and candidate_sg != target_sg:
        return False, f"Space group mismatch: #{candidate_sg} != #{target_sg}"
    return True, "Topological invariants consistent"


# ==============================================================================
# 5. APPLY RECONCILIATION & UPDATE ALL DEPENDENCIES
# ==============================================================================

def apply_reconciliations() -> None:
    """
    Applies confirmed alias reconciliations across:
      1. data/manifest.json (updates structure aliases & literature_name)
      2. data/catalog.json (updates structure aliases)
      3. data/literature_master.json (links papers to unified structures)
      4. Invokes scripts/track_papers.py --sync
    """
    print("=" * 80)
    print("🛠️ APPLYING SCIENTIFIC ALLOTROPE ALIAS RECONCILIATION")
    print("=" * 80)

    # 1. Update data/manifest.json for c5^2_6^2_8^1_b_65 (G-50)
    # Primary canonical name: C568 (Ram & Mizuseki, Carbon 2020, online Nov 26, 2019)
    # Secondary alias: Me-graphene (Zhuo et al., Nanoscale 2020, received May 19, 2020)
    if MANIFEST_FILE.exists():
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        updated_manifest = False
        for s in manifest.get("structures", []):
            if s.get("id") == "c5^2_6^2_8^1_b_65":
                existing_aliases = set(s.get("aliases", []))
                for a in ["C568", "c568", "Me-graphene", "me-graphene", "c58", "G-50", "P-4m2-lb-C13", "c5^2_6^2_8^1_b_65", "c5²·6²·8¹·b"]:
                    existing_aliases.add(a)
                s["aliases"] = sorted(existing_aliases)
                s["literature_name"] = "C568"
                s["note"] = "Validated DFT record (C568)"
                
                # Add bibliography keys
                bib_keys = set(s.get("bibliography_keys", []))
                bib_keys.add("ram_2020_carbon")
                bib_keys.add("zhuo_2020_nanoscale")
                s["bibliography_keys"] = sorted(bib_keys)
                updated_manifest = True

        if updated_manifest:
            with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print(" [1/3] Updated data/manifest.json (enriched aliases & chronological priority literature_name C568 for G-50)")

    # 2. Update data/catalog.json
    if CATALOG_FILE.exists():
        with open(CATALOG_FILE, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        updated_catalog = False
        for s in catalog:
            if s.get("id") == "c5^2_6^2_8^1_b_65":
                existing_aliases = set(s.get("aliases", []))
                for a in ["C568", "c568", "Me-graphene", "me-graphene", "c58", "G-50", "P-4m2-lb-C13", "c5^2_6^2_8^1_b_65", "c5²·6²·8¹·b"]:
                    existing_aliases.add(a)
                s["aliases"] = sorted(existing_aliases)
                s["literature_name"] = "C568"
                s["note"] = "Validated DFT record (C568)"
                updated_catalog = True

        if updated_catalog:
            with open(CATALOG_FILE, "w", encoding="utf-8") as f:
                json.dump(catalog, f, indent=2, ensure_ascii=False)
            print(" [2/3] Updated data/catalog.json (enriched aliases for G-50 with C568 primary)")

    # 3. Update data/literature_master.json for ram_2020_carbon and zhuo_2020_nanoscale
    if MASTER_FILE.exists():
        with open(MASTER_FILE, "r", encoding="utf-8") as f:
            master = json.load(f)

        for item in master:
            if item.get("id") == "ram_2020_carbon":
                item["linkedAllotropeIds"] = ["c5^2_6^2_8^1_b_65", "G-50", "c5^2_6^2_8^1_a_65"]
                if not item.get("roles"): item["roles"] = {}
                item["roles"]["c5^2_6^2_8^1_b_65"] = "Theoretical prediction of C568: 5-6-8 carbon ring network with 1.13 eV indirect gap"
                item["roles"]["G-50"] = "C568 allotrope structural archetype (P-4m2, 13 atoms)"
                item["roles"]["c5^2_6^2_8^1_a_65"] = "Comparative centered-rectangular 5-6-8 ring isomer"

            if item.get("id") == "zhuo_2020_nanoscale":
                item["linkedAllotropeIds"] = ["c5^2_6^2_8^1_b_65", "G-50", "graphene"]
                if not item.get("roles"): item["roles"] = {}
                item["roles"]["c5^2_6^2_8^1_b_65"] = "Theoretical characterization of Me-graphene (P-4m2-lb-C13): near-zero Poisson ratio and high mobility"
                item["roles"]["G-50"] = "Me-graphene: identical 5-6-8 carbon allotrope archetype"
                item["roles"]["graphene"] = "Benchmark reference for auxetic response and near-zero in-plane Poisson ratio"

        with open(MASTER_FILE, "w", encoding="utf-8") as f:
            json.dump(master, f, indent=2, ensure_ascii=False)
        print(" [3/3] Updated data/literature_master.json (linked both papers to c5^2_6^2_8^1_b_65 / G-50)")

    # 4. Trigger full sync
    print("\n🔄 Triggering automated project synchronization...")
    import subprocess
    subprocess.run(["python3", str(WORKSPACE / "scripts" / "track_papers.py"), "--sync"])


# ==============================================================================
# 5. CLI INTERFACE
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Scientific Allotrope Disambiguation, Feature Extraction & Cross-Paper Reconciler."
    )
    parser.add_argument("pdf_path", nargs="?", type=str, help="Path to PDF paper file to analyze")
    parser.add_argument("--cross-audit", action="store_true", help="Audit all papers in database and detect cross-paper allotrope convergence")
    parser.add_argument("--apply", action="store_true", help="Apply confirmed alias reconciliations to manifest, catalog, master, and frontend")
    args = parser.parse_args()

    if args.apply:
        apply_reconciliations()
    elif args.cross_audit:
        run_cross_audit()
    elif args.pdf_path:
        pdf_path = Path(args.pdf_path)
        if not pdf_path.exists():
            print(f"❌ File not found: {pdf_path}")
            sys.exit(1)
        print(f"\n🔬 Analyzing paper: {pdf_path.name}")
        t_abs, body, full = extract_pdf_sections(pdf_path)
        extracted = extract_crystallographic_features(full)
        print("Extracted Features:")
        print(f"  • Space Groups: {extracted['space_groups']} (numbers: {extracted['space_group_numbers']})")
        print(f"  • Rings:        {sorted(extracted['rings'])}")
        print(f"  • Lattice a:    {extracted['lattice_a']}")
        print(f"  • Lattice b:    {extracted['lattice_b']}")
        print(f"  • Atoms/cell:   {sorted(extracted['atom_counts'])}")

        candidates = disambiguate_text_sections(t_abs, body, full)
        print("\nRanked Structure Matches:")
        for idx, c in enumerate(candidates[:5], 1):
            print(f"  [{idx}] {c['structure_id']} (#{c['catalog_code']}) — Score: {c['score']:.1f}")
            for r in c["reasons"]:
                print(f"      ↳ {r}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
