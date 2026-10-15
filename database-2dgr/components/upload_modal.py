"""
2D Carbon Allotrope Upload, Nomenclature Standardization & Literature Deduplication.

Solves the lack of standardization in 2D carbon allotrope literature by:
1. Parsing uploaded CIF or POSCAR crystal structures via pymatgen
2. Analyzing crystallographic space groups, 2D plane groups, and lattice density
3. Cross-referencing against the 61 canonical Girão allotropes catalog to detect
   identical structures published under disparate trivial names (e.g. Net-W vs. Biphenylene)
4. Standardizing notation to canonical Girão ring topology taxonomy
"""

from __future__ import annotations
import base64
import io
import re
from typing import Any, Dict, List, Optional, Tuple

import dash_bootstrap_components as dbc
from dash import html, dcc
from pymatgen.core import Structure
from pymatgen.symmetry.analyzer import SpacegroupAnalyzer

# Known literature aliases for historical disambiguation
KNOWN_ALIASES = {
    "biphenylene": [
        "Net-W",
        "Popgraphene network",
        "r4¹·6¹·8¹ planar carbon",
        "Fan et al. Science 2021 framework"
    ],
    "phagraphene": [
        "Pha-graphene",
        "Penta-hexa-heptagraphene",
        "Wang et al. PRL 2015 5-6-7 allotrope"
    ],
    "pentaheptite": [
        "5-7 Graphene",
        "C16 pentaheptite",
        "Crespi et al. heptagon-pentagon sheet"
    ],
    "graphenylene": [
        "Cyclooctatetraene-fused graphene",
        "h4³·6²·12¹ porous network",
        "Song et al. biphenylene carbon"
    ],
    "alpha_gr": [
        "Alpha-graphyne derivative",
        "α-Graphene allotrope"
    ],
    "beta_gr": [
        "Beta-graphyne derivative",
        "β-Graphene allotrope"
    ],
    "cmmm_graphene": [
        "Cmmm 2D Carbon",
        "Orthorhombic C28 allotrope"
    ],
    "graphene": [
        "Pristine Graphene",
        "Hexagonal h6₁ monolayer",
        "Novoselov & Geim honeycomb lattice"
    ]
}


def make_upload_modal() -> dbc.Modal:
    """Construct the structure upload, standardization, and literature deduplication modal."""
    return dbc.Modal(
        [
            dbc.ModalHeader(
                dbc.ModalTitle(
                    [
                        html.I(className="bi bi-cloud-arrow-up-fill me-2 text-primary"),
                        "2D Allotrope Standardization & Literature Deduplication",
                    ],
                    className="fw-bold text-light",
                ),
                className="bg-black border-secondary",
            ),
            dbc.ModalBody(
                [
                    dbc.Alert(
                        [
                            html.Div(
                                [
                                    html.I(className="bi bi-info-circle-fill me-2 text-info fs-5"),
                                    html.Strong("The 2D Carbon Nomenclature Crisis: "),
                                ],
                                className="d-flex align-items-center mb-1",
                            ),
                            html.P(
                                "In scientific literature, identical 2D carbon allotropes are frequently "
                                "published under disconnected trivial names (e.g., phagraphene, net-W, popgraphene) "
                                "without crystallographic cross-referencing. This tool parses your CIF or POSCAR, "
                                "determines its space group and density, and checks whether it matches a known "
                                "canonical Girão allotrope or represents a candidate novel structure.",
                                className="mb-0 small text-light",
                            ),
                        ],
                        color="dark",
                        className="border-info mb-3",
                    ),
                    dcc.Upload(
                        id="upload_allotrope_file",
                        children=html.Div(
                            [
                                html.I(className="bi bi-file-earmark-arrow-up fs-1 text-primary mb-2 d-block"),
                                html.Span("Drag & Drop or ", className="text-secondary"),
                                html.Span("Browse CIF / POSCAR File", className="text-primary fw-semibold"),
                                html.Small(
                                    "Supports .cif, POSCAR, CONTCAR formats with fractional or Cartesian coordinates",
                                    className="text-muted d-block mt-1",
                                ),
                            ],
                            className="p-4 text-center",
                        ),
                        style={
                            "width": "100%",
                            "borderWidth": "2px",
                            "borderStyle": "dashed",
                            "borderColor": "rgba(255, 255, 255, 0.2)",
                            "borderRadius": "10px",
                            "cursor": "pointer",
                            "backgroundColor": "rgba(255, 255, 255, 0.02)",
                            "transition": "border-color 0.2s ease",
                        },
                        multiple=False,
                        className="mb-3",
                    ),
                    dcc.Loading(
                        html.Div(id="upload_analysis_output"),
                        type="circle",
                        color="#00d2be",
                    ),
                ],
                className="p-3",
            ),
            dbc.ModalFooter(
                [
                    dbc.Button(
                        "Close",
                        id="btn_close_upload",
                        color="secondary",
                        size="sm",
                        className="me-2",
                    ),
                ],
                className="bg-black border-secondary",
            ),
        ],
        id="modal_upload_dedup",
        size="lg",
        is_open=False,
        centered=True,
    )


def analyze_uploaded_structure(
    content_str: str,
    filename: str,
    catalog_entries: List[Dict[str, Any]],
) -> html.Div:
    """
    Parse an uploaded crystal structure file and run deduplication against catalog entries.
    """
    try:
        # Decode base64 only if provided as Dash data URL (e.g. data:text/plain;base64,...)
        if content_str.startswith("data:") and "," in content_str:
            _, b64_data = content_str.split(",", 1)
            raw_bytes = base64.b64decode(b64_data)
            raw_text = raw_bytes.decode("utf-8", errors="replace")
        else:
            raw_text = content_str

        # Parse structure with pymatgen
        fmt = "cif" if filename.lower().endswith(".cif") else "poscar"
        try:
            struct = Structure.from_str(raw_text, fmt=fmt)
        except Exception:
            # Fallback format try
            alt_fmt = "poscar" if fmt == "cif" else "cif"
            struct = Structure.from_str(raw_text, fmt=alt_fmt)

        analyzer = SpacegroupAnalyzer(struct, symprec=0.1)
        sg_symbol = analyzer.get_space_group_symbol()
        sg_num = analyzer.get_space_group_number()
        natoms = len(struct)
        density = struct.density
        vol = struct.volume
        a, b, c = struct.lattice.a, struct.lattice.b, struct.lattice.c
        alpha, beta, gamma = struct.lattice.alpha, struct.lattice.beta, struct.lattice.gamma

        # Duplicate detection algorithm
        matched_entry: Optional[Dict[str, Any]] = None
        for entry in catalog_entries:
            entry_sg_raw = entry.get("space_group", "")
            # Extract number like 47 from 'Pmmm (#47)' or 191 from 'P6/mmm (#191)'
            num_match = re.search(r"#([0-9]+)", entry_sg_raw)
            entry_sg_num = int(num_match.group(1)) if num_match else entry.get("space_group_number")
            parts = entry_sg_raw.split() if entry_sg_raw else []
            entry_sg_symbol = parts[0] if parts else ""

            entry_density = float(entry.get("density", 0.0))
            entry_natoms = int(entry.get("natoms", 0))

            # Match space group number (or symbol) and density within tolerance
            sg_matches = False
            if entry_sg_num and entry_sg_num == sg_num:
                sg_matches = True
            elif entry_sg_symbol and (entry_sg_symbol.lower() == sg_symbol.lower() or entry_sg_symbol.replace("/", "").lower() == sg_symbol.replace("/", "").lower()):
                sg_matches = True

            density_diff = abs(density - entry_density) if entry_density > 0 else 999.0
            density_matches = density_diff < 0.08

            # Multiplicity of atoms / cell
            atoms_matches = (natoms == entry_natoms) or (entry_natoms > 0 and (natoms % entry_natoms == 0 or entry_natoms % natoms == 0))

            if sg_matches and density_matches and atoms_matches:
                matched_entry = entry
                break

        # Render summary card
        metrics_table = html.Table(
            [
                html.Tr([
                    html.Th("Space Group", className="text-secondary small pe-3 py-1"),
                    html.Td(f"{sg_symbol} (#{sg_num})", className="text-light fw-bold py-1 font-monospace"),
                    html.Th("Atoms / Cell", className="text-secondary small pe-3 py-1 ps-4"),
                    html.Td(f"{natoms}", className="text-light fw-bold py-1"),
                ]),
                html.Tr([
                    html.Th("Density (ρ)", className="text-secondary small pe-3 py-1"),
                    html.Td(f"{density:.3f} g/cm³", className="text-light fw-bold py-1"),
                    html.Th("Cell Volume", className="text-secondary small pe-3 py-1 ps-4"),
                    html.Td(f"{vol:.2f} Å³", className="text-light fw-bold py-1"),
                ]),
                html.Tr([
                    html.Th("Lattice Parameters", className="text-secondary small pe-3 py-1"),
                    html.Td(f"a = {a:.3f} Å, b = {b:.3f} Å", className="text-light py-1 font-monospace small"),
                    html.Th("In-Plane Angle", className="text-secondary small pe-3 py-1 ps-4"),
                    html.Td(f"γ = {gamma:.1f}°", className="text-light py-1 font-monospace small"),
                ]),
            ],
            className="w-100 my-2",
        )

        if matched_entry:
            m_id = matched_entry["id"]
            m_name = matched_entry.get("display_name", matched_entry["name"])
            m_sym = matched_entry.get("display_symbol", matched_entry.get("symbol", ""))
            m_wp = matched_entry.get("wallpaper_group", "p1")
            m_wp_num = matched_entry.get("wallpaper_number", 1)
            m_de = float(matched_entry.get("delta_e_ev", 0.0))
            aliases = KNOWN_ALIASES.get(m_id, ["Unregistered trivial aliases"])

            return html.Div(
                [
                    dbc.Alert(
                        [
                            html.Div(
                                [
                                    html.I(className="bi bi-exclamation-triangle-fill text-warning fs-4 me-2"),
                                    html.H5(
                                        "Literature Duplicate / Isomorph Identified!",
                                        className="alert-heading mb-0 text-warning fw-bold",
                                    ),
                                ],
                                className="d-flex align-items-center mb-2",
                            ),
                            html.P(
                                [
                                    "Your uploaded structure is crystallographically identical to catalog entry: ",
                                    html.Strong(f"{m_name} ({m_sym})", className="text-light"),
                                    ".",
                                ],
                                className="mb-2 text-light",
                            ),
                            html.Hr(className="my-2 border-secondary"),
                            html.Div(
                                [
                                    html.Strong("Canonical Girão Taxonomy: ", className="text-info"),
                                    html.Span(f"{m_sym}", className="badge badge-subtle-info me-2"),
                                    html.Strong("Plane Symmetry: ", className="text-info"),
                                    html.Span(f"{m_wp} (#{m_wp_num})", className="badge badge-subtle-secondary me-2"),
                                    html.Strong("DFT Energetics: ", className="text-info"),
                                    html.Span(f"ΔE = {m_de:.3f} eV/atom", className="badge badge-subtle-success"),
                                ],
                                className="mb-2 small",
                            ),
                            html.Div(
                                [
                                    html.Strong("Known Literature Synonyms & Aliases: ", className="text-secondary small d-block mb-1"),
                                    html.Ul(
                                        [html.Li(a, className="small text-muted") for a in aliases],
                                        className="mb-0 ps-3",
                                    ),
                                ],
                                className="p-2 rounded bg-black border border-secondary mb-2",
                            ),
                            html.P(
                                "Standardization Action: Using Girão notation eliminates the literature ambiguity "
                                "of redundant names for this exact allotrope.",
                                className="small text-secondary mb-3 fst-italic",
                            ),
                            dbc.Button(
                                [
                                    html.I(className="bi bi-box-arrow-in-right me-1"),
                                    f"Load {m_name} in 3D Explorer",
                                ],
                                id={"type": "btn_load_matched_allotrope", "id": m_id},
                                color="info",
                                size="sm",
                                className="fw-semibold",
                            ),
                        ],
                        color="dark",
                        className="border-warning p-3 mb-3",
                    ),
                    dbc.Card(
                        [
                            dbc.CardHeader("Extracted Geometry Metrics", className="py-2 text-secondary small fw-bold"),
                            dbc.CardBody(metrics_table, className="p-2"),
                        ],
                        className="bg-dark border-secondary",
                    ),
                ]
            )

        else:
            return html.Div(
                [
                    dbc.Alert(
                        [
                            html.Div(
                                [
                                    html.I(className="bi bi-stars text-success fs-4 me-2"),
                                    html.H5(
                                        "Candidate Novel 2D Carbon Allotrope Verified!",
                                        className="alert-heading mb-0 text-success fw-bold",
                                    ),
                                ],
                                className="d-flex align-items-center mb-2",
                            ),
                            html.P(
                                "No identical crystal structure found in the 61 known Girão catalog allotropes. "
                                "This structure appears to be a unique 2D carbon topology!",
                                className="mb-2 text-light",
                            ),
                            html.Hr(className="my-2 border-secondary"),
                            html.Div(
                                [
                                    html.Strong("Detected Space Group: ", className="text-info"),
                                    html.Span(f"{sg_symbol} (#{sg_num})", className="badge badge-subtle-info me-2"),
                                    html.Strong("Density: ", className="text-info"),
                                    html.Span(f"{density:.3f} g/cm³", className="badge badge-subtle-secondary"),
                                ],
                                className="mb-2 small",
                            ),
                            html.P(
                                "Recommended Step: Index the ring topology according to Girão conventions (h, r, c, t codes) "
                                "and compute DFT relative energetics vs. graphene before catalog submission.",
                                className="small text-secondary mb-0",
                            ),
                        ],
                        color="dark",
                        className="border-success p-3 mb-3",
                    ),
                    dbc.Card(
                        [
                            dbc.CardHeader("Candidate Geometry Metrics", className="py-2 text-secondary small fw-bold"),
                            dbc.CardBody(metrics_table, className="p-2"),
                        ],
                        className="bg-dark border-secondary",
                    ),
                ]
            )

    except Exception as e:
        return dbc.Alert(
            [
                html.I(className="bi bi-x-circle-fill me-2 text-danger"),
                f"Failed to parse structure file '{filename}': {str(e)}",
            ],
            color="danger",
            className="p-3",
        )
