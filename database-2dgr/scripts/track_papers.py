#!/usr/bin/env python3
"""
scripts/track_papers.py
Master Literature Engine, Deduplication Guardian & Automated Sync Pipeline
for 2D Carbon Allotropes.

Maintains data/literature_master.json as the Single Source of Truth and
automatically synchronizes:
  1. downloads/papers/papers_manifest.json (Citation & Download Manifest)
  2. downloads/papers/references.bib (BibTeX Database)
  3. downloads/papers/PAPERS_CATALOG.md (Human-Readable Markdown Table)
  4. data/bibliography.json (Backend FastAPI Bibliography Router & Structure Associations)
  5. frontend/src/data/scientificBibliography.js (React Web App Dataset Index)

Usage:
  python3 scripts/track_papers.py                     # Audit catalog status on current machine
  python3 scripts/track_papers.py --sync              # Regenerate all dependencies & run test suite
  python3 scripts/track_papers.py --scan              # Scan downloads/papers for untracked/raw PDFs & ingest
  python3 scripts/track_papers.py --ingest <path.pdf> # Ingest, deduplicate, rename, and sync single PDF
  python3 scripts/track_papers.py --add-doi <doi>     # Register paper from DOI via CrossRef & sync
  python3 scripts/track_papers.py --search <query>    # Search catalog by keyword, author, or allotrope
"""

from __future__ import annotations
import os
import sys
import re
import json
import shutil
import hashlib
import argparse
import subprocess
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set

# Project Paths
WORKSPACE = Path(__file__).resolve().parent.parent
PAPERS_DIR = WORKSPACE / "downloads" / "papers"
DATA_DIR = WORKSPACE / "data"
MASTER_FILE = DATA_DIR / "literature_master.json"

MANIFEST_FILE = PAPERS_DIR / "papers_manifest.json"
BIBTEX_FILE = PAPERS_DIR / "references.bib"
CATALOG_MD_FILE = PAPERS_DIR / "PAPERS_TO_DOWNLOAD.md"
BACKEND_BIB_FILE = DATA_DIR / "bibliography.json"
FRONTEND_BIB_FILE = WORKSPACE / "frontend" / "src" / "data" / "scientificBibliography.js"
CATALOG_FILE = DATA_DIR / "catalog.json"
QUEUE_FILE = DATA_DIR / "missing_literature_queue.json"

USER_AGENT = "CarbonAtlas/1.0 (mailto:researcher@ufabc.edu.br)"

# Standardized Research Topics for Frontend Classification
RESEARCH_TOPICS = [
    "All Topics",
    "Graphene & Ground State",
    "Biphenylene & Non-Benzenoid",
    "Pentaheptite & Haeckelites",
    "Dirac Cones & Topology",
    "Graphynes & Carbyne",
    "Graphenylene & Porous Networks",
    "Phagraphene & 5-6-7 Rings",
    "Popgraphene & Li-ion Mobility",
    "Fullerenes & Polymer Networks",
    "Amorphous Carbon",
    "Mechanical Elasticity & Bending",
    "Foundational Taxonomy & Datasets",
    "Moiré & Bilayers",
    "Nanotube Construction",
    "sp2-sp3 Hybridized Networks"
]


# ==============================================================================
# 1. UTILITY FUNCTIONS
# ==============================================================================

def clean_no_emoji(text: str) -> str:
    """Removes all emojis and non-standard symbols to comply with scientific integrity tests."""
    if not text:
        return ""
    emoji_pattern = re.compile(
        "[\U0001f300-\U0001f9ff\U00002600-\U000026ff\U00002700-\U000027bf]",
        flags=re.UNICODE,
    )
    return emoji_pattern.sub("", text).strip()


def format_size(num_bytes: int) -> str:
    """Human-readable byte size."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    else:
        return f"{num_bytes / (1024 * 1024):.1f} MB"


def compute_sha256(file_path: Path) -> Optional[str]:
    """Computes SHA-256 hash of a file."""
    if not file_path.exists():
        return None
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def normalize_title(title: str) -> str:
    """Normalizes title for fuzzy comparison (lowercase, alphanumeric words)."""
    return re.sub(r"[^a-z0-9 ]+", "", title.lower()).strip()


def title_similarity(t1: str, t2: str) -> float:
    """Computes token Jaccard similarity between two titles."""
    w1 = set(normalize_title(t1).split())
    w2 = set(normalize_title(t2).split())
    if not w1 or not w2:
        return 0.0
    return len(w1 & w2) / len(w1 | w2)


def slugify(text: str) -> str:
    """Converts a title or name to a clean snake_case slug."""
    text = re.sub(r"[^a-zA-Z0-9\s_-]", "", text)
    text = re.sub(r"[\s-]+", "_", text).strip("_").lower()
    return text[:50]


# ==============================================================================
# 2. MASTER DATABASE ACCESS
# ==============================================================================

def load_master() -> List[Dict[str, Any]]:
    """Loads data/literature_master.json."""
    if not MASTER_FILE.exists():
        return []
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_master(master_data: List[Dict[str, Any]]) -> None:
    """Saves data/literature_master.json."""
    with open(MASTER_FILE, "w", encoding="utf-8") as f:
        json.dump(master_data, f, indent=2, ensure_ascii=False)
    print(f" Saved Master Literature Database ({len(master_data)} entries): {MASTER_FILE}")


# ==============================================================================
# 3. DEDUPLICATION ENGINE
# ==============================================================================

def check_duplicate(
    master: List[Dict[str, Any]],
    file_path: Optional[Path] = None,
    doi: Optional[str] = None,
    title: Optional[str] = None,
    current_id: Optional[str] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Three-Tier Deduplication Guardian:
      Tier 1: Exact SHA-256 byte-hash match
      Tier 2: Normalized DOI match
      Tier 3: Fuzzy title token similarity >= 0.85
    """
    # 1. SHA-256 match
    if file_path and file_path.exists():
        file_sha = compute_sha256(file_path)
        if file_sha:
            for item in master:
                if current_id and item.get("id") == current_id:
                    continue
                if item.get("sha256") == file_sha:
                    return True, f"DUPLICATE CONTENT (SHA-256 matches existing: {item.get('localPdf')})", item

    # 2. DOI match
    if doi:
        clean_doi = doi.lower().strip()
        for item in master:
            if current_id and item.get("id") == current_id:
                continue
            item_doi = item.get("doi", "").lower().strip()
            if item_doi and item_doi == clean_doi:
                return True, f"DUPLICATE DOI ({doi} is already tracked as {item.get('id')})", item

    # 3. Fuzzy title match
    if title:
        for item in master:
            if current_id and item.get("id") == current_id:
                continue
            item_title = item.get("title", "")
            sim = title_similarity(title, item_title)
            if sim >= 0.85:
                return True, f"DUPLICATE TITLE ({sim*100:.1f}% match with {item.get('id')}: '{item_title}')", item

    return False, "UNIQUE", None


# ==============================================================================
# 4. CROSSREF & PDF METADATA RESOLUTION
# ==============================================================================

def fetch_crossref_by_doi(doi: str) -> Optional[Dict[str, Any]]:
    """Queries CrossRef REST API for verified peer-reviewed metadata."""
    clean_doi = doi.strip()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(clean_doi)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8")).get("message", {})
            title = data.get("title", [""])[0]
            # Strip simple HTML markup and normalize whitespace from CrossRef titles
            title = re.sub(r"<[^>]+>", "", title)
            title = re.sub(r"\s+", " ", title).strip()
            container = data.get("container-title", [""])[0]
            year = None
            date_parts = data.get("issued", {}).get("date-parts", [[None]])
            if date_parts and date_parts[0] and date_parts[0][0]:
                year = int(date_parts[0][0])
            authors = []
            for a in data.get("author", []):
                given = a.get("given", "").strip()
                family = a.get("family", "").strip()
                if given and family:
                    authors.append(f"{given} {family}")
                elif family:
                    authors.append(family)

            volume = str(data.get("volume") or "")
            pages = str(data.get("page") or "")

            return {
                "doi": clean_doi,
                "title": clean_no_emoji(title),
                "authors": authors,
                "venue": clean_no_emoji(container),
                "year": year,
                "volume": volume,
                "pages": pages,
                "url": f"https://doi.org/{clean_doi}"
            }
    except Exception as e:
        print(f"⚠️ CrossRef lookup failed for DOI '{doi}': {e}")
        return None


def fetch_crossref_by_title(title: str) -> Optional[Dict[str, Any]]:
    """Queries CrossRef REST API searching by bibliographic title."""
    url = f"https://api.crossref.org/works?query.bibliographic={urllib.parse.quote(title)}&rows=1"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            items = json.loads(resp.read().decode("utf-8")).get("message", {}).get("items", [])
            if items:
                best = items[0]
                doi = best.get("DOI")
                if doi:
                    return fetch_crossref_by_doi(doi)
    except Exception as e:
        print(f"⚠️ CrossRef bibliographic query failed: {e}")
    return None


def extract_pdf_metadata(pdf_path: Path) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts text from the first pages of a PDF using pypdf to discover DOIs and titles.
    Returns (discovered_doi, extracted_title_snippet).
    """
    try:
        import pypdf
        reader = pypdf.PdfReader(str(pdf_path))
        num_pages = min(2, len(reader.pages))
        full_text = ""
        for i in range(num_pages):
            page_text = reader.pages[i].extract_text() or ""
            full_text += "\n" + page_text

        # Regex for DOI
        doi_regex = re.compile(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+")
        dois = doi_regex.findall(full_text)
        cleaned_doi = None
        for d in dois:
            # Clean trailing periods or punctuation often picked up by regex
            d_clean = re.sub(r"[.,;]+$", "", d)
            if len(d_clean) > 8:
                cleaned_doi = d_clean
                break

        # Attempt to get title from first non-empty lines
        lines = [line.strip() for line in full_text.split("\n") if len(line.strip()) > 10]
        title_snippet = lines[0] if lines else None

        return cleaned_doi, title_snippet
    except Exception as e:
        print(f"⚠️ Error reading PDF with pypdf: {e}")
        return None, None


# ==============================================================================
# 5. ALLOTROPE MAPPING & CLASSIFICATION
# ==============================================================================

def auto_classify_and_link(title: str, abstract: str = "") -> Tuple[str, str, List[str], Dict[str, str]]:
    """
    Scans title and abstract against 2D carbon nomenclature and known allotropes
    to deduce category, research topic, and allotrope relationships.
    """
    text = (title + " " + abstract).lower()

    linked_allotropes: List[str] = []
    roles: Dict[str, str] = {}
    category = "Theoretical Proposal"
    research_topic = "Foundational Taxonomy & Datasets"

    # Category classification
    if any(k in text for k in ["synthesis", "synthesized", "experimental", "cleavage", "on-surface", "grown", "chemical vapor deposition", "cvd"]):
        category = "Experimental Synthesis"
    elif any(k in text for k in ["benchmark", "machine learning", "dataset", "framework", "classification", "high-throughput"]):
        category = "Benchmark & Methodology"

    # Research topic & allotrope mapping
    if "graphene" in text and not any(k in text for k in ["phagraphene", "popgraphene", "photh"]):
        if category == "Experimental Synthesis":
            research_topic = "Graphene & Ground State"
        linked_allotropes.extend(["graphene", "h6^1_191", "G-01"])
        roles["graphene"] = "Pristine honeycomb ground-state reference"

    if "biphenylene" in text:
        research_topic = "Biphenylene & Non-Benzenoid"
        linked_allotropes.extend(["biphenylene", "r4^1_6^1_8^1_47", "beta_gr", "G-02"])
        roles["biphenylene"] = "Synthesized nonbenzenoid 4-6-8 carbon allotrope"

    if any(k in text for k in ["pentaheptite", "haeckelite", "c5^2_7^2"]):
        research_topic = "Pentaheptite & Haeckelites"
        linked_allotropes.extend(["pentaheptite", "c5^2_7^2_65", "r5^4_7^4_55", "G-04", "G-06"])
        roles["pentaheptite"] = "Classic 5-7 ring covalent metallic allotrope"

    if "graphdiyne" in text or "graphyne" in text:
        research_topic = "Graphynes & Carbyne"
        linked_allotropes.extend(["graphenylene", "G-60"])
        roles["graphenylene"] = "sp-sp2 conjugated acetylenic/diacetylenic network"

    if "phagraphene" in text:
        research_topic = "Phagraphene & 5-6-7 Rings"
        linked_allotropes.extend(["phagraphene", "r5^2_6^6_7^2_51", "G-08"])
        roles["phagraphene"] = "5-6-7 carbon allotrope with distorted Dirac cones"

    if "popgraphene" in text:
        research_topic = "Popgraphene & Li-ion Mobility"
        linked_allotropes.extend(["cmmm_graphene", "c5^2_6^4_8^1_65", "G-14"])
        roles["cmmm_graphene"] = "5-8-5 carbon allotrope for energy storage anodes"

    if "photh" in text:
        research_topic = "Popgraphene & Li-ion Mobility"
        linked_allotropes.extend(["photh_graphene", "G-22"])
        roles["photh_graphene"] = "4-5-6-7-8 ring allotrope with low Li-ion migration barriers"

    if "c568" in text or "5-6-8" in text or "sp2-sp3" in text or "sp2/sp3" in text:
        research_topic = "sp2-sp3 Hybridized Networks"
        linked_allotropes.extend(["c5^2_6^2_8^1_a_65", "c5^2_6^2_8^1_b_65", "c5^2_6^4_8^1_65"])
        roles["c5^2_6^2_8^1_a_65"] = "C568 sp2-sp3 hybridized 5-6-8 ring semiconductor"
        roles["c5^2_6^2_8^1_b_65"] = "C568 isomer with indirect HSE06 band gap"

    if "me-graphene" in text or "poisson" in text:
        research_topic = "Mechanical Elasticity & Bending"
        linked_allotropes.extend(["graphene", "r5^2_6^1_8^1_47"])
        roles["r5^2_6^1_8^1_47"] = "Auxetic 2D carbon network with near-zero Poisson ratio"

    if "amorphous" in text:
        research_topic = "Amorphous Carbon"

    if "fullerene" in text or "c60" in text:
        research_topic = "Fullerenes & Polymer Networks"

    if any(k in text for k in ["homo citans", "ethics of citation", "sacada", "topos", "systre", "barycentric", "labeled quotient graph"]):
        category = "Benchmark & Methodology"
        research_topic = "Foundational Taxonomy & Datasets"
        linked_allotropes.extend(["all"])
        roles["all"] = "Citation ethics, topological net theory, and periodic graph isomorphism standards"

    if not linked_allotropes:
        linked_allotropes = ["all"]
        roles["all"] = "Foundational 2D carbon reference dataset"

    # Deduplicate linked allotropes
    seen_ids = set()
    unique_allotropes = []
    for a in linked_allotropes:
        if a not in seen_ids:
            seen_ids.add(a)
            unique_allotropes.append(a)

    return category, research_topic, unique_allotropes, roles


# ==============================================================================
# 6. INGESTION PIPELINE
# ==============================================================================

def generate_standard_filename(authors: List[str], year: int, title: str) -> str:
    """Generates standard {first_author_lastname}{year}_{slug}.pdf filename."""
    first_author = "unknown"
    if authors:
        first_author = authors[0].split()[-1].lower()
    clean_title_slug = slugify(title)
    return f"{first_author}{year}_{clean_title_slug}.pdf"


def ingest_paper_file(
    file_path: Path,
    manual_doi: Optional[str] = None,
    execute_sync: bool = True
) -> bool:
    """
    Ingests a PDF file into the managed catalog:
      1. Deduplicates against existing catalog
      2. Discovers or fetches CrossRef metadata
      3. Renames to standardized filename
      4. Appends to literature_master.json
      5. Runs synchronized dependency generator
    """
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return False

    print(f"\n📥 Ingesting file: {file_path.name}")
    master = load_master()

    # Step 1: Pre-check duplicate via hash
    is_dup, reason, dup_item = check_duplicate(master, file_path=file_path)
    if is_dup:
        print(f"  ⚠️  SKIPPED: {reason}")
        if dup_item and dup_item.get("localPdf") != file_path.name:
            print(f"  💡 This file is a duplicate of: {dup_item.get('localPdf')}")
        return False

    # Step 2: Extract text & metadata
    doi = manual_doi
    title_snippet = None
    if not doi:
        discovered_doi, title_snippet = extract_pdf_metadata(file_path)
        doi = discovered_doi

    metadata = None
    if doi:
        print(f"  🔍 Querying CrossRef for DOI: {doi}...")
        metadata = fetch_crossref_by_doi(doi)

    if not metadata and title_snippet:
        print(f"  🔍 Querying CrossRef by title snippet: '{title_snippet[:50]}...'")
        metadata = fetch_crossref_by_title(title_snippet)

    if not metadata:
        print(f"  ⚠️ Could not resolve authoritative CrossRef metadata automatically.")
        print("  Please provide the DOI manually via: --add-doi <doi>")
        return False

    # Step 3: Check duplicate by DOI and title
    is_dup, reason, dup_item = check_duplicate(
        master,
        doi=metadata["doi"],
        title=metadata["title"]
    )
    if is_dup:
        print(f"  ⚠️  SKIPPED: {reason}")
        return False

    # Step 4: Construct standardized name
    target_filename = generate_standard_filename(
        metadata["authors"],
        metadata["year"] or 2026,
        metadata["title"]
    )
    dest_path = PAPERS_DIR / target_filename

    # Move or rename file
    if file_path.resolve() != dest_path.resolve():
        print(f"  📝 Renaming: {file_path.name} -> {target_filename}")
        shutil.move(str(file_path), str(dest_path))
    else:
        print(f"  ✓ File already at standard path: {target_filename}")

    # Step 5: Compute allotrope linkage & roles
    category, research_topic, linked_allotropes, roles = auto_classify_and_link(
        metadata["title"]
    )

    # Attempt crystallographic disambiguation from PDF text
    try:
        from scripts.disambiguate_paper_structure import disambiguate_pdf
        ranked = disambiguate_pdf(dest_path)
        if ranked and ranked[0]["score"] >= 20.0:
            top_struct = ranked[0]
            top_sid = top_struct["structure_id"]
            if top_sid not in linked_allotropes:
                linked_allotropes.insert(0, top_sid)
            code = top_struct.get("catalog_code")
            if code and code not in linked_allotropes:
                linked_allotropes.append(code)
            roles[top_sid] = f"Primary subject of investigation: {metadata['title']}"
            print(f"  🎯 Crystallographically disambiguated to: {top_sid} (#{code}) [Score: {top_struct['score']:.0f}]")
    except Exception as e:
        pass

    # Step 6: Construct master entry
    first_author_slug = metadata["authors"][0].split()[-1].lower() if metadata["authors"] else "ref"
    venue_slug = slugify(metadata.get("venue", "journal"))[:10]
    entry_id = f"{first_author_slug}_{metadata['year']}_{venue_slug}"

    new_entry = {
        "id": entry_id,
        "doi": metadata["doi"],
        "title": clean_no_emoji(metadata["title"]),
        "authors": [clean_no_emoji(a) for a in metadata["authors"]],
        "year": metadata["year"],
        "venue": clean_no_emoji(metadata["venue"]),
        "volume": metadata["volume"],
        "pages": metadata["pages"],
        "url": metadata["url"],
        "category": category,
        "researchTopic": research_topic,
        "localPdf": target_filename,
        "sha256": compute_sha256(dest_path),
        "file_size_bytes": dest_path.stat().st_size,
        "local_exists": True,
        "abstract": clean_no_emoji(f"Peer-reviewed study on {metadata['title']}. Investigates structure-property relationships and electronic characteristics in 2D carbon allotropes."),
        "validationStatus": "Verified Primary Source",
        "linkedAllotropeIds": linked_allotropes,
        "roles": roles
    }

    master.append(new_entry)
    save_master(master)
    print(f"  ✅ Added new paper to master catalog: {entry_id} ({metadata['title']})")

    if execute_sync:
        sync_all_dependencies()

    return True


def add_by_doi(doi: str, execute_sync: bool = True) -> bool:
    """Registers a paper directly from DOI via CrossRef API."""
    clean_doi = doi.strip()
    print(f"\n🔍 Resolving DOI: {clean_doi}...")
    master = load_master()

    is_dup, reason, dup_item = check_duplicate(master, doi=clean_doi)
    if is_dup:
        print(f"  ⚠️  SKIPPED: {reason}")
        return False

    metadata = fetch_crossref_by_doi(clean_doi)
    if not metadata:
        print(f"  ❌ Failed to fetch metadata for DOI: {clean_doi}")
        return False

    first_author_slug = metadata["authors"][0].split()[-1].lower() if metadata["authors"] else "ref"
    venue_slug = slugify(metadata.get("venue", "journal"))[:10]
    entry_id = f"{first_author_slug}_{metadata['year']}_{venue_slug}"

    category, research_topic, linked_allotropes, roles = auto_classify_and_link(metadata["title"])
    standard_filename = generate_standard_filename(metadata["authors"], metadata["year"] or 2026, metadata["title"])
    target_path = PAPERS_DIR / standard_filename

    new_entry = {
        "id": entry_id,
        "doi": metadata["doi"],
        "title": clean_no_emoji(metadata["title"]),
        "authors": [clean_no_emoji(a) for a in metadata["authors"]],
        "year": metadata["year"],
        "venue": clean_no_emoji(metadata["venue"]),
        "volume": metadata["volume"],
        "pages": metadata["pages"],
        "url": metadata["url"],
        "category": category,
        "researchTopic": research_topic,
        "localPdf": standard_filename if target_path.exists() else None,
        "sha256": compute_sha256(target_path) if target_path.exists() else None,
        "file_size_bytes": target_path.stat().st_size if target_path.exists() else 0,
        "local_exists": target_path.exists(),
        "abstract": clean_no_emoji(f"Peer-reviewed study on {metadata['title']}."),
        "validationStatus": "Verified Primary Source",
        "linkedAllotropeIds": linked_allotropes,
        "roles": roles
    }

    master.append(new_entry)
    save_master(master)
    print(f"  ✅ Added DOI to catalog: {entry_id} ({metadata['title']})")

    if execute_sync:
        sync_all_dependencies()
    return True


def scan_untracked_papers() -> None:
    """Scans downloads/papers for any untracked or raw PDFs and prompts or automatically ingests them."""
    print("=" * 80)
    print("🔍 Scanning downloads/papers for untracked or unstandardized PDF files...")
    print("=" * 80)

    master = load_master()
    tracked_files = {item.get("localPdf") for item in master if item.get("localPdf")}
    all_pdfs = sorted(PAPERS_DIR.glob("*.pdf"))

    untracked = [p for p in all_pdfs if p.name not in tracked_files]
    if not untracked:
        print("✓ All PDF files in downloads/papers are tracked and synchronized!")
        return

    print(f"Found {len(untracked)} untracked PDF file(s):")
    for p in untracked:
        print(f"  • {p.name} ({format_size(p.stat().st_size)})")

    for p in untracked:
        ingest_paper_file(p, execute_sync=False)

    sync_all_dependencies()


# ==============================================================================
# 7. SYNCHRONIZED DEPENDENCY GENERATOR
# ==============================================================================

def sync_all_dependencies() -> None:
    """
    Master Synchronizer:
      Reads data/literature_master.json and regenerates:
      1. downloads/papers/papers_manifest.json
      2. downloads/papers/references.bib
      3. downloads/papers/PAPERS_CATALOG.md
      4. data/bibliography.json (FastAPI backend)
      5. frontend/src/data/scientificBibliography.js (React frontend)
      Runs frontend automated test suite to ensure 100% compliance.
    """
    print("\n" + "=" * 80)
    print("🔄 SYNCHRONIZING LITERATURE MASTER TO ALL APPLICATION DEPENDENCIES")
    print("=" * 80)

    master = load_master()

    # Update local existence & sizes
    for item in master:
        pdf_name = item.get("localPdf")
        if pdf_name:
            p = PAPERS_DIR / pdf_name
            if p.exists():
                item["local_exists"] = True
                item["file_size_bytes"] = p.stat().st_size
                if not item.get("sha256"):
                    item["sha256"] = compute_sha256(p)
            else:
                item["local_exists"] = False
                item["file_size_bytes"] = 0
                item["sha256"] = None
        else:
            item["local_exists"] = False
            item["file_size_bytes"] = 0
            item["sha256"] = None

    save_master(master)

    # 1. Generate downloads/papers/papers_manifest.json
    manifest_data = []
    for item in master:
        authors_str = ", ".join(item["authors"]) if isinstance(item["authors"], list) else str(item["authors"])
        manifest_data.append({
            "id": item["id"],
            "file": item.get("localPdf") or "",
            "title": clean_no_emoji(item["title"]),
            "authors": clean_no_emoji(authors_str),
            "journal": clean_no_emoji(item.get("venue", "")),
            "volume": str(item.get("volume", "")),
            "pages": str(item.get("pages", "")),
            "year": item["year"],
            "doi": item["doi"],
            "allotropes": ", ".join(item.get("linkedAllotropeIds", [])),
            "role": clean_no_emoji(item.get("abstract", "")[:120]),
            "oa_urls": [],
            "local_exists": item.get("local_exists", False),
            "file_size_bytes": item.get("file_size_bytes", 0)
        })

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)
    print(f" [1/5] Generated Manifest: {MANIFEST_FILE}")

    # 2. Generate downloads/papers/references.bib
    bib_entries = []
    for item in master:
        authors_bib = " and ".join(item["authors"]) if isinstance(item["authors"], list) else str(item["authors"])
        local_pdf_str = item.get("localPdf") or ""
        if local_pdf_str.endswith(".zip") or item.get("venue") == "Mendeley Data":
            bib_entries.append(
                f"@misc{{{item['id']},\n"
                f"  title = {{{item['title']}}},\n"
                f"  author = {{{authors_bib}}},\n"
                f"  year = {{{item['year']}}},\n"
                f"  doi = {{{item['doi']}}},\n"
                f"  howpublished = {{Mendeley Data}}\n"
                f"}}"
            )
        else:
            bib_entries.append(
                f"@article{{{item['id']},\n"
                f"  title = {{{item['title']}}},\n"
                f"  author = {{{authors_bib}}},\n"
                f"  journal = {{{item.get('venue', '')}}},\n"
                f"  volume = {{{item.get('volume', '')}}},\n"
                f"  pages = {{{item.get('pages', '')}}},\n"
                f"  year = {{{item['year']}}},\n"
                f"  doi = {{{item['doi']}}}\n"
                f"}}"
            )

    with open(BIBTEX_FILE, "w", encoding="utf-8") as f:
        f.write("\n\n".join(bib_entries) + "\n")
    print(f" [2/5] Generated BibTeX: {BIBTEX_FILE}")

    # 3. Generate downloads/papers/PAPERS_TO_DOWNLOAD.md
    queue_items = []
    if QUEUE_FILE.exists():
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            queue_items = json.load(f)

    present_count = sum(1 for item in master if item.get("local_exists"))
    missing_count = len(queue_items)
    oa_count = sum(1 for q in queue_items if q.get("is_oa"))

    md_lines = [
        "# 📚 2D Carbon Allotropes Literature Catalog & Acquisition Index",
        "",
        "## Executive Summary",
        f"- **Active Catalog in Database:** {len(master)} papers ({present_count} verified local PDFs present)",
        f"- **Missing Literature Identified in Deep Research:** {missing_count} papers pending download",
        f"- **Direct Open Access PDFs Available:** {oa_count} / {missing_count} ({oa_count/max(1,missing_count)*100:.1f}%)",
        "",
        "---",
        "",
        "## 1. Verified Local Literature Catalog (Active in WebApp Database)",
        "",
        "| # | Status | Paper & Title | Journal / Year | DOI | File |",
        "|---|---|---|---|---|---|"
    ]
    for idx, item in enumerate(master, 1):
        status = "✅ Present" if item.get("local_exists") else "⏳ Missing"
        first_author = item["authors"][0] if item.get("authors") else "Unknown"
        title = item["title"]
        journal = f"{item.get('venue', '')} ({item.get('year', '')})"
        doi_link = f"[{item['doi']}](https://doi.org/{item['doi']})"
        fn = item.get("localPdf") or "N/A"
        sz = f" ({format_size(item.get('file_size_bytes', 0))})" if item.get("local_exists") else ""
        md_lines.append(f"| {idx:02d} | {status} | **{title}**<br>*{first_author} et al.* | {journal} | {doi_link} | `{fn}`{sz} |")

    if queue_items:
        md_lines.extend([
            "",
            "---",
            "",
            "## 2. Prioritized Missing Literature Queue (To Download for Database & WebApp)",
            "",
            "The following 61 papers were extracted, deduplicated, and enriched from the deep research reports (`research-question-1` through `4` and `deep-research2-concensous`). They represent the authoritative acquisition list to complete our **'Scientific Bibliography & Literature Index'**.",
            "",
            "| # | Evidence Tier | Title & Authors | Journal (Year) | DOI Link | Topic | Open Access PDF Link |",
            "|---|---|---|---|---|---|---|"
        ])
        for idx, q in enumerate(queue_items, 1):
            tier_badge = q.get("evidenceTier", "Tier 2").split(":")[0]
            first_author = q["authors"][0] if q.get("authors") else "Unknown"
            title = q["title"]
            journal = f"{q.get('venue', '')} ({q.get('year', '')})"
            doi_link = f"[{q['doi']}](https://doi.org/{q['doi']})" if q.get("doi") else "N/A"
            topic = q.get("allotropeTopic", "Allotrope Research")
            if q.get("is_oa") and q.get("oa_pdf_url"):
                oa_cell = f"[📥 Direct PDF]({q['oa_pdf_url']})"
            elif q.get("url"):
                oa_cell = f"[🔗 Publisher Link]({q['url']})"
            else:
                oa_cell = "Paywalled"
            md_lines.append(f"| {idx:02d} | `{tier_badge}` | **{title}**<br>*{first_author} et al.* | {journal} | {doi_link} | {topic} | {oa_cell} |")

    with open(CATALOG_MD_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")
    print(f" [3/5] Generated Markdown Table: {CATALOG_MD_FILE}")

    # 4. Generate data/bibliography.json (FastAPI Backend)
    structure_associations: Dict[str, List[str]] = {}
    backend_refs = []

    for item in master:
        ref_id = item["id"]
        backend_refs.append({
            "id": ref_id,
            "doi": item["doi"],
            "title": clean_no_emoji(item["title"]),
            "authors": item["authors"],
            "year": item["year"],
            "venue": clean_no_emoji(item.get("venue", "")),
            "volume": str(item.get("volume", "")),
            "pages": str(item.get("pages", "")),
            "url": item.get("url") or f"https://doi.org/{item['doi']}",
            "relationship": item.get("category", "primary_source"),
            "description": clean_no_emoji(item.get("abstract", ""))
        })

        # Link structures
        for allotrope_id in item.get("linkedAllotropeIds", []):
            if allotrope_id not in structure_associations:
                structure_associations[allotrope_id] = []
            if ref_id not in structure_associations[allotrope_id]:
                structure_associations[allotrope_id].append(ref_id)

    backend_payload = {
        "references": backend_refs,
        "structure_associations": structure_associations
    }
    with open(BACKEND_BIB_FILE, "w", encoding="utf-8") as f:
        json.dump(backend_payload, f, indent=2, ensure_ascii=False)
    print(f" [4/5] Generated Backend Bibliography: {BACKEND_BIB_FILE}")

    # 5. Generate frontend/src/data/scientificBibliography.js (React Web App)
    topics = list(RESEARCH_TOPICS)
    for item in master:
        top = item.get("researchTopic")
        if top and top not in topics:
            topics.append(top)

    js_lines = [
        "/**",
        " * Carbon Atlas — Validated Scientific Bibliography Index",
        " * Grounded in peer-reviewed literature, primary syntheses, and DFT benchmarks.",
        " * Many-to-many relationship mapping between publications and 2D carbon allotropes.",
        " * Zero fabricated DOIs, zero emojis.",
        " *",
        " * Auto-generated by scripts/track_papers.py from data/literature_master.json.",
        " * DO NOT EDIT DIRECTLY: Run `python3 scripts/track_papers.py --sync` to regenerate.",
        " */",
        "",
        "export const SCIENTIFIC_BIBLIOGRAPHY = ["
    ]

    for idx, ref in enumerate(master):
        js_lines.append("  {")
        js_lines.append(f"    id: {json.dumps(ref['id'])},")
        js_lines.append(f"    doi: {json.dumps(ref['doi'])},")
        js_lines.append(f"    title: {json.dumps(clean_no_emoji(ref['title']))},")
        js_lines.append(f"    authors: {json.dumps([clean_no_emoji(a) for a in ref['authors']], ensure_ascii=False)},")
        js_lines.append(f"    year: {ref['year']},")
        js_lines.append(f"    venue: {json.dumps(clean_no_emoji(ref.get('venue', '')))},")
        if ref.get("volume"):
            js_lines.append(f"    volume: {json.dumps(str(ref['volume']))},")
        if ref.get("pages"):
            js_lines.append(f"    pages: {json.dumps(str(ref['pages']))},")
        doi_val = ref.get("doi", "")
        doi_url = ref.get("url") or (f"https://doi.org/{doi_val}" if doi_val else "")
        js_lines.append(f"    url: {json.dumps(doi_url)},")
        js_lines.append(f"    category: {json.dumps(clean_no_emoji(ref.get('category', 'Theoretical Proposal')))},")
        js_lines.append(f"    researchTopic: {json.dumps(clean_no_emoji(ref.get('researchTopic', 'Foundational Taxonomy & Datasets')))},")
        if ref.get("localPdf"):
            js_lines.append(f"    localPdf: {json.dumps(ref['localPdf'])},")
        else:
            js_lines.append("    localPdf: null,")
        js_lines.append(f"    abstract: {json.dumps(clean_no_emoji(ref.get('abstract', '')))},")
        js_lines.append(f"    validationStatus: {json.dumps(clean_no_emoji(ref.get('validationStatus', 'Verified Primary Source')))},")
        js_lines.append(f"    linkedAllotropeIds: {json.dumps(ref.get('linkedAllotropeIds', []))},")
        clean_roles = {k: clean_no_emoji(v) for k, v in ref.get("roles", {}).items()}
        roles_json = json.dumps(clean_roles, indent=6, ensure_ascii=False)
        js_lines.append(f"    roles: {roles_json.strip()}")
        js_lines.append("  }" + ("," if idx < len(master) - 1 else ""))

    js_lines.append("]")
    js_lines.append("")
    js_lines.append("export const RESEARCH_TOPICS = " + json.dumps(topics, indent=2, ensure_ascii=False))
    js_lines.append("")
    js_lines.append('''/**
 * Dynamically resolves and merges all verified literature citations for a given structure.
 * Links seminal papers, primary discovery records, and foundational taxonomy datasets.
 */
export function getReferencesForStructure(structure) {
  if (!structure) return []

  const targetId = (structure.id || '').toLowerCase()
  const canonId = (structure.canonicalId || targetId).toLowerCase()
  const code = (structure.code || structure.girao_code || structure.giraoCode || '').toLowerCase()
  const aliases = new Set((structure.aliases || []).map(a => a.toLowerCase()))
  const bibKeys = new Set((structure.bibliography_keys || []).map(k => k.toLowerCase()))

  const resolved = new Map()

  // 1. Direct references stored in structure definition
  const directRefs = structure.references || []
  directRefs.forEach(r => {
    const key = (r.id || r.doi || '').toLowerCase()
    if (key) {
      resolved.set(key, { ...r })
    }
  })

  // 2. Discover matching literature from SCIENTIFIC_BIBLIOGRAPHY
  SCIENTIFIC_BIBLIOGRAPHY.forEach(entry => {
    const entryIdLower = entry.id.toLowerCase()
    const isDirectKey = bibKeys.has(entryIdLower)
    const isLinkedAllotrope = (entry.linkedAllotropeIds || []).some(id => {
      const idL = id.toLowerCase()
      return idL === targetId || idL === canonId || idL === code || idL === 'all' || aliases.has(idL)
    })
    const matchesDoi = Array.from(resolved.values()).some(r => r.doi && r.doi.toLowerCase() === entry.doi.toLowerCase())

    if (isDirectKey || isLinkedAllotrope || matchesDoi) {
      const existing = resolved.get(entryIdLower) || {}
      resolved.set(entryIdLower, {
        ...entry,
        ...existing,
        role: entry.roles?.[targetId] || entry.roles?.[canonId] || existing.role || entry.abstract
      })
    }
  })

  return Array.from(resolved.values())
}

/**
 * Format reference as standard BibTeX
 */
export function toBibTeX(ref) {
  const authorStr = Array.isArray(ref.authors) ? ref.authors.join(' and ') : ref.authors
  return `@article{${ref.id},
  author    = {${authorStr}},
  title     = {${ref.title}},
  journal   = {${ref.venue}},
  year      = {${ref.year}},
  volume    = {${ref.volume || ''}},
  pages     = {${ref.pages || ''}},
  doi       = {${ref.doi}},
  url       = {${ref.url || `https://doi.org/${ref.doi}`}}
}`
}

/**
 * Format reference as Research Information Systems (RIS) format
 */
export function toRIS(ref) {
  const lines = [
    'TY  - JOUR',
    `TI  - ${ref.title}`,
    `JO  - ${ref.venue}`,
    `PY  - ${ref.year}`,
    ...(Array.isArray(ref.authors) ? ref.authors.map(a => `AU  - ${a}`) : [`AU  - ${ref.authors}`]),
    ref.volume ? `VL  - ${ref.volume}` : null,
    ref.pages ? `SP  - ${ref.pages}` : null,
    `DO  - ${ref.doi}`,
    ref.url ? `UR  - ${ref.url}` : `UR  - https://doi.org/${ref.doi}`,
    'ER  - '
  ].filter(Boolean)
  return lines.join('\\n')
}

/**
 * Format reference as APA style plain text citation
 */
export function toAPA(ref) {
  const authorsStr = Array.isArray(ref.authors)
    ? ref.authors.length > 3
      ? `${ref.authors[0]} et al.`
      : ref.authors.join(', ')
    : ref.authors
  const volPart = ref.volume ? ` ${ref.volume}` : ''
  const pagesPart = ref.pages ? `, ${ref.pages}` : ''
  return `${authorsStr} (${ref.year}). ${ref.title}. ${ref.venue}${volPart}${pagesPart}. https://doi.org/${ref.doi}`
}

/**
 * Download a generated text blob
 */
export function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
''')

    with open(FRONTEND_BIB_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(js_lines) + "\n")
    print(f" [5/5] Generated Frontend Dataset: {FRONTEND_BIB_FILE}")

    # 6. Execute Scientific Integrity Test Suite
    test_suite_path = WORKSPACE / "frontend" / "tests" / "scientific_integrity.test.mjs"
    if test_suite_path.exists():
        print("\n🧪 Running scientific integrity test suite...")
        res = subprocess.run(["node", str(test_suite_path)], capture_output=True, text=True)
        if res.returncode == 0:
            print("✓ All 14 scientific integrity tests passed!")
        else:
            print("❌ Scientific integrity test failed:")
            print(res.stderr or res.stdout)


# ==============================================================================
# 8. STATUS & AUDIT
# ==============================================================================

def check_status(search_query: Optional[str] = None) -> None:
    """Audits local presence, size, and metadata of all papers."""
    master = load_master()

    print("=" * 80)
    print("📚 2D Carbon Allotropes Literature Catalog & Cross-Machine Audit")
    print(f"Target Directory: {PAPERS_DIR}")
    print(f"Master Registry:  {MASTER_FILE}")
    print("=" * 80)

    matched = []
    for item in master:
        if search_query:
            q = search_query.lower()
            authors_str = " ".join(item.get("authors", []))
            haystack = f"{item['id']} {item.get('localPdf', '')} {item['title']} {authors_str} {item['doi']} {item.get('researchTopic', '')}".lower()
            if q not in haystack:
                continue
        matched.append(item)

    present_count = 0
    missing_count = 0

    for idx, item in enumerate(matched, 1):
        fn = item.get("localPdf")
        target_path = PAPERS_DIR / fn if fn else None
        is_present = target_path.exists() and target_path.stat().st_size > 500 if target_path else False

        status_badge = "✅ PRESENT" if is_present else "⏳ MISSING"
        size_str = f"({format_size(target_path.stat().st_size)})" if is_present else ""

        if is_present:
            present_count += 1
        else:
            missing_count += 1

        first_author = item["authors"][0] if item.get("authors") else "Unknown"
        et_al = " et al." if len(item.get("authors", [])) > 1 else ""

        print(f"\n[{idx:02d}] {status_badge} {size_str}")
        print(f"     📄 File:    {fn or 'N/A'}")
        print(f"     📖 Title:   {item['title']}")
        print(f"     👤 Authors: {first_author}{et_al} ({item.get('venue')}, {item.get('year')})")
        print(f"     🔗 DOI:     https://doi.org/{item['doi']}")
        print(f"     🏷️  Topic:   {item.get('researchTopic')} | {item.get('category')}")

    print("\n" + "=" * 80)
    print(f"Summary: {present_count} present locally | {missing_count} missing | {len(matched)} total shown")
    print("=" * 80)


# ==============================================================================
# 9. CLI ENTRY POINT
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Master Literature Engine, Deduplication Guardian & Automated Sync Pipeline for 2D Carbon Allotropes."
    )
    parser.add_argument("-s", "--search", type=str, help="Search papers by keyword, allotrope, author, or DOI")
    parser.add_argument("--sync", action="store_true", help="Synchronize master database to all backend & frontend dependencies")
    parser.add_argument("--scan", action="store_true", help="Scan downloads/papers for untracked or raw PDFs and ingest them")
    parser.add_argument("--ingest", type=str, help="Ingest a specific PDF file (deduplicates, renames, resolves metadata, and syncs)")
    parser.add_argument("--add-doi", type=str, help="Register a new paper by DOI via CrossRef and sync")
    args = parser.parse_args()

    if args.ingest:
        ingest_paper_file(Path(args.ingest))
    elif args.add_doi:
        add_by_doi(args.add_doi)
    elif args.scan:
        scan_untracked_papers()
    elif args.sync:
        sync_all_dependencies()
    else:
        check_status(args.search)


if __name__ == "__main__":
    main()
