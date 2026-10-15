#!/usr/bin/env python3
"""
scripts/download_papers.py
Automated retrieval and status checker for 2D Carbon Allotrope literature papers.
Verifies existing Open Access PDFs and standardized author_year_title.pdf archives.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
PAPERS_DIR = WORKSPACE / "downloads" / "papers"
PAPERS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_PAPERS = [
    {
        "id": "novoselov2004_graphene",
        "title": "Electric Field Effect in Atomically Thin Carbon Films",
        "doi": "10.1126/science.1102896",
        "pdf_name": "novoselov2004_electric_field_effect_atomically_thin_carbon_films.pdf",
        "oa_urls": []
    },
    {
        "id": "crespi1996_pentaheptite",
        "title": "Prediction of a pure-carbon planar covalent metal",
        "doi": "10.1103/PhysRevB.53.R13303",
        "pdf_name": "crespi1996_prediction_pure_carbon_planar_covalent_metal.pdf",
        "oa_urls": []
    },
    {
        "id": "terrones2000_haeckelites",
        "title": "New metallic allotropes of planar and tubular carbon",
        "doi": "10.1103/PhysRevLett.84.1716",
        "pdf_name": "terrones2000_new_metallic_allotropes_planar_tubular_carbon.pdf",
        "oa_urls": []
    },
    {
        "id": "li2010_graphdiyne",
        "title": "Architecture of graphdiyne nanoscale films",
        "doi": "10.1039/B922733D",
        "pdf_name": "li2010_architecture_graphdiyne_nanoscale_films.pdf",
        "oa_urls": []
    },
    {
        "id": "malko2012_graphynes",
        "title": "Competition for Graphene: Graphynes with Direction-Dependent Dirac Cones",
        "doi": "10.1103/PhysRevLett.108.086804",
        "pdf_name": "malko2012_competition_for_graphene_graphynes_dirac_cones.pdf",
        "oa_urls": []
    },
    {
        "id": "wei2013_bending",
        "title": "Bending Rigidity and Gaussian Bending Stiffness of Single-Layered Graphene",
        "doi": "10.1021/nl303168w",
        "pdf_name": "wei2013_bending_rigidity_gaussian_bending_stiffness_graphene.pdf",
        "oa_urls": []
    },
    {
        "id": "song2013_graphenylene",
        "title": "Graphenylene, a unique two-dimensional carbon network with nondelocalized cyclohexatriene units",
        "doi": "10.1039/C2TC00006G",
        "pdf_name": "song2013_graphenylene_unique_2d_carbon_network.pdf",
        "oa_urls": []
    },
    {
        "id": "sharma2014_pentahexoctite",
        "title": "Pentahexoctite: A new two-dimensional allotrope of carbon",
        "doi": "10.1038/srep07164",
        "pdf_name": "sharma2014_pentahexoctite_new_2d_allotrope_carbon.pdf",
        "oa_urls": [
            "https://www.nature.com/articles/srep07164.pdf"
        ]
    },
    {
        "id": "long2015_c312",
        "title": "Theoretical investigation on two-dimensional non-traditional carbon materials employing three-membered ring...",
        "doi": "10.1016/j.carbon.2015.09.030",
        "pdf_name": "long2015_theoretical_investigation_2d_non_traditional_carbon_materials.pdf",
        "oa_urls": []
    },
    {
        "id": "wang2015_phagraphene",
        "title": "Phagraphene: A low-energy graphene allotrope composed of 5-6-7 carbon rings with distorted Dirac cones",
        "doi": "10.1021/acs.nanolett.5b02512",
        "pdf_name": "wang2015_phagraphene_low_energy_graphene_allotrope_distorted_dirac_cones.pdf",
        "oa_urls": [
            "https://arxiv.org/pdf/1506.04824.pdf"
        ]
    },
    {
        "id": "fan2017_phographene",
        "title": "New carbon allotropes with metallic conducting properties: a first-principles prediction",
        "doi": "10.1039/C7RA01762F",
        "pdf_name": "fan2017_new_carbon_allotropes_metallic_conducting_properties.pdf",
        "oa_urls": [
            "https://pubs.rsc.org/en/content/articlepdf/2017/ra/c7ra01762f"
        ]
    },
    {
        "id": "wang2018_popgraphene",
        "title": "Popgraphene: a new 2D planar carbon allotrope composed of 5-8-5 carbon rings...",
        "doi": "10.1039/C8TA00438B",
        "pdf_name": "wang2018_popgraphene_new_2d_planar_carbon_allotrope_585_rings.pdf",
        "oa_urls": []
    },
    {
        "id": "yi2018_microporosity",
        "title": "Microporosity as a new property control factor in graphene-like 2D allotropes",
        "doi": "10.1039/C8TA02606H",
        "pdf_name": "yi2018_microporosity_new_property_control_factor_graphene_like_allotropes.pdf",
        "oa_urls": []
    },
    {
        "id": "toh2020_amorphous",
        "title": "Synthesis and properties of free-standing monolayer amorphous carbon",
        "doi": "10.1038/s41586-019-1871-2",
        "pdf_name": "toh2020_synthesis_properties_free_standing_monolayer_amorphous_carbon.pdf",
        "oa_urls": []
    },
    {
        "id": "fan2021_biphenylene",
        "title": "Biphenylene network: A nonbenzenoid carbon allotrope",
        "doi": "10.1126/science.abg4509",
        "pdf_name": "fan2021_biphenylene_network_nonbenzenoid_carbon_allotrope.pdf",
        "oa_urls": []
    },
    {
        "id": "luo2021_biphenylene_dft",
        "title": "A first principles investigation on the structural, mechanical, electronic, and catalytic properties of biphenylene",
        "doi": "10.1038/s41598-021-98261-9",
        "pdf_name": "luo2021_first_principles_investigation_biphenylene.pdf",
        "oa_urls": [
            "https://www.nature.com/articles/s41598-021-98261-9.pdf"
        ]
    },
    {
        "id": "desyatkin2022_graphyne",
        "title": "Scalable Synthesis and Characterization of Multilayer gamma-Graphyne",
        "doi": "10.1021/jacs.2c06583",
        "pdf_name": "desyatkin2022_scalable_synthesis_multilayer_gamma_graphyne.pdf",
        "oa_urls": []
    },
    {
        "id": "hou2022_fullerene",
        "title": "Synthesis of a monolayer fullerene network",
        "doi": "10.1038/s41586-022-04771-5",
        "pdf_name": "hou2022_synthesis_monolayer_fullerene_network.pdf",
        "oa_urls": []
    },
    {
        "id": "xie2022_biphenylene_reg",
        "title": "Effective regulation of the electronic properties of a biphenylene network",
        "doi": "10.1039/D2RA03673H",
        "pdf_name": "xie2022_effective_regulation_electronic_properties_biphenylene_network.pdf",
        "oa_urls": []
    },
    {
        "id": "girao2023_classification",
        "title": "Classification of sp2-bonded carbon allotropes in two dimensions",
        "doi": "10.1016/j.carbon.2022.12.001",
        "pdf_name": "girao2023_classification_sp2_bonded_carbon_allotropes_2d.pdf",
        "oa_urls": []
    },
    {
        "id": "kolokathis2024_nanotube",
        "title": "NanoTube Construct: A web tool for digital construction of nanotubes...",
        "doi": "10.1016/j.csbj.2024.09.023",
        "pdf_name": "kolokathis2024_nanotube_construct_web_tool_digital_construction.pdf",
        "oa_urls": []
    },
    {
        "id": "santos2024_photh",
        "title": "PHOTH-graphene: a new 2D carbon allotrope with low barriers for Li-ion mobility",
        "doi": "10.1038/s41598-024-59858-y",
        "pdf_name": "santos2024_photh_graphene_new_2d_carbon_allotrope_li_ion.pdf",
        "oa_urls": [
            "https://www.nature.com/articles/s41598-024-59858-y.pdf"
        ]
    },
    {
        "id": "araujo2025_bilayers",
        "title": "A high-throughput framework and database for twisted 2D van der Waals bilayers",
        "doi": "10.1038/s41524-025-01892-z",
        "pdf_name": "araujo2025_high_throughput_framework_twisted_2d_bilayers.pdf",
        "oa_urls": []
    },
    {
        "id": "macmillan2025_embedding",
        "title": "Graph embedding tensor: unifying topological description, symmetry detection, and structure generation...",
        "doi": "10.1038/s41524-025-01932-8",
        "pdf_name": "macmillan2025_graph_embedding_tensor_2d_carbon_allotropes.pdf",
        "oa_urls": []
    },
    {
        "id": "paupitz2026_review",
        "title": "A Concise Review of Recently Synthesized 2D Carbon Allotropes: Amorphous Carbon, Graphynes, Biphenylene and Fullerene Networks",
        "doi": "10.1016/j.carbon.2026.121320",
        "pdf_name": "paupitz2026_concise_review_recently_synthesized_2d_carbon_allotropes.pdf",
        "oa_urls": [
            "https://arxiv.org/pdf/2509.01877.pdf"
        ]
    }
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def check_and_download():
    print("=== 2D Carbon Explorer Literature Downloader & Audit ===")
    print(f"Directory: {PAPERS_DIR}\n")
    
    downloaded_count = 0
    missing_count = 0

    for item in TARGET_PAPERS:
        target_path = PAPERS_DIR / item["pdf_name"]
        
        # Check if already present
        if target_path.exists() and target_path.stat().st_size > 1000:
            print(f"✅ [EXISTS] {item['pdf_name']} ({target_path.stat().st_size:,} bytes)")
            downloaded_count += 1
            continue
            
        # Try to download if OA URL exists
        downloaded = False
        for url in item.get("oa_urls", []):
            print(f"🔄 Attempting download for {item['id']} from {url}...")
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=25) as resp, open(target_path, "wb") as f:
                    content = resp.read()
                    if len(content) > 10000:
                        f.write(content)
                        print(f"   🎉 Successfully downloaded {item['pdf_name']} ({len(content):,} bytes)")
                        downloaded = True
                        downloaded_count += 1
                        break
                    else:
                        print(f"   ⚠️ Content too small ({len(content)} bytes), likely bot block.")
            except Exception as e:
                print(f"   ❌ Download failed: {e}")
                
        if not downloaded:
            print(f"⏳ [PENDING] {item['pdf_name']} (DOI: {item['doi']}) - Requires institutional proxy/manual retrieval.")
            missing_count += 1

    print(f"\nSummary: {downloaded_count}/{len(TARGET_PAPERS)} papers verified in downloads/papers/, {missing_count} pending.")

if __name__ == "__main__":
    check_and_download()
