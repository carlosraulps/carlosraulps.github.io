"""
2D Carbon Explorer: Interactive Crystallographic & Thermodynamic Intelligence
for Two-Dimensional Carbon Allotropes, Quantum Defect Phases & Moiré Heterostructures.

Optimized UI/UX & Scientific Architecture:
- 2D Wallpaper Space Group & Plane Symmetry Visualization
- Interactive 3D Crystal Viewer with Free-Moving Axes (Lattice Origin Attached)
- Optimized 2D In-Plane Framing without Excessive Vacuum or Manual Scroll Zoom
- Seamless CIF Export (Primitive, Supercell, Conventional)
- Integrated MIDb Cloud Catalog (Graphane Vacancy Quantum Phases & TMD Heterostructures)
- Sankey Flow Crystallographic System Distribution
- Secure Researcher Authentication & Settings Modal (No Exposed API Keys)
- Taste-Skill Refined Aesthetics with Times New Roman & STIX Typography
"""

from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import dash
from dash import html, dcc, dash_table
from dash.dependencies import Input, Output, State
import dash_bootstrap_components as dbc
from flask_caching import Cache

from pymatgen.core import Structure
from pymatgen.analysis.graphs import StructureGraph
from pymatgen.symmetry.analyzer import SpacegroupAnalyzer
from pymatgen.io.cif import CifWriter

# Backward-compatibility bridge for pymatgen >= 2026.9 with crystal-toolkit
if not hasattr(StructureGraph, "with_local_env_strategy") and hasattr(StructureGraph, "from_local_env_strategy"):
    StructureGraph.with_local_env_strategy = StructureGraph.from_local_env_strategy
if not hasattr(StructureGraph, "with_empty_graph") and hasattr(StructureGraph, "from_empty_graph"):
    StructureGraph.with_empty_graph = StructureGraph.from_empty_graph

import crystal_toolkit.components as ctc
from crystal_toolkit.settings import SETTINGS

# Automated upstream asset sync: ensure crystal-toolkit runtime styles/fonts exist in local assets folder
def _sync_vendor_assets():
    local_assets = Path("assets")
    local_assets.mkdir(parents=True, exist_ok=True)
    if hasattr(SETTINGS, "ASSETS_PATH") and Path(SETTINGS.ASSETS_PATH).is_dir():
        import shutil
        src_dir = Path(SETTINGS.ASSETS_PATH)
        for item in src_dir.iterdir():
            dest = local_assets / item.name
            if not dest.exists():
                try:
                    if item.is_dir():
                        shutil.copytree(item, dest)
                    else:
                        shutil.copy2(item, dest)
                except Exception:
                    pass

_sync_vendor_assets()

def _patch_controls_sensitivity():
    """Ensure OrbitControls sensitivity is calibrated for smooth rotation (0.55)."""
    try:
        import dash_mp_components
        js_file = Path(dash_mp_components.__file__).parent / "dash_mp_components.min.js"
        if js_file.exists():
            content = js_file.read_text(encoding="utf-8")
            if "e.rotateSpeed=2" in content or "t.rotateSpeed=2" in content:
                content = content.replace("e.rotateSpeed=2,e.zoomSpeed=1.2,e.panSpeed=.8", "e.rotateSpeed=.55,e.zoomSpeed=.7,e.panSpeed=.45")
                content = content.replace("t.rotateSpeed=2,t.zoomSpeed=1.2,t.panSpeed=.8", "t.rotateSpeed=.55,t.zoomSpeed=.7,t.panSpeed=.45")
                js_file.write_text(content, encoding="utf-8")
    except Exception:
        pass

_patch_controls_sensitivity()

from database.catalog import AllotropesCatalog
from database.midb import MIDbCatalog
from database.mendeley import MendeleyCatalog
from database.loader import StructureLoader
from components.symmetry_visualizer import make_wallpaper_symmetry_figure
from components.crystallographic_cards import render_properties_dashboard
from components.stability_chart import make_enhanced_stability_chart
from components.settings_modal import make_settings_modal, make_auth_modal
from components.upload_modal import make_upload_modal, analyze_uploaded_structure
from components.midb_view import render_midb_dashboard

# 1. Initialize Databases & Loaders
catalog_db = AllotropesCatalog()
allotropes = catalog_db.get_all()

mendeley_db = MendeleyCatalog()
mendeley_records = mendeley_db.get_all()

midb_db = MIDbCatalog()
midb_records = midb_db.get_all()
midb_distribution = midb_db.get_sankey_distribution()

loader = StructureLoader()

default_allotrope = catalog_db.get_by_id("graphene") or allotropes[0]
initial_structure = loader.get_structure(default_allotrope["filename"])
initial_symmetry_fig = make_wallpaper_symmetry_figure(initial_structure, default_allotrope, theme="dark")


# 2. Initialize Dash Application
app = dash.Dash(
    __name__,
    assets_folder="assets",
    external_stylesheets=[dbc.themes.DARKLY, dbc.icons.BOOTSTRAP],
    title="2D Carbon Explorer • Crystallographic Symmetry & Energetics",
    suppress_callback_exceptions=True,
)

# Enforce Times New Roman typography and MathJax rendering
app.index_string = """<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>{%title%}</title>
        {%favicon%}
        {%css%}
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true
          },
          svg: {
            fontCache: 'global'
          },
          options: {
            enableMenu: false,
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
          }
        };
        // Dynamic re-typesetting targeting ONLY allotrope_properties_container and 3D canvas resize
        document.addEventListener("DOMContentLoaded", function() {
            let mathJaxTimer = null;
            let isTypesetting = false;

            function typesetTarget() {
                const target = document.getElementById("allotrope_properties_container");
                if (!target || !window.MathJax || !window.MathJax.typesetPromise || isTypesetting) return;

                isTypesetting = true;
                clearTimeout(mathJaxTimer);
                mathJaxTimer = setTimeout(function() {
                    window.MathJax.typesetPromise([target])
                        .catch(function() {})
                        .finally(function() {
                            isTypesetting = false;
                        });
                }, 40);
            }

            let targetObserver = null;
            function attachObserver() {
                const target = document.getElementById("allotrope_properties_container");
                if (target && !targetObserver) {
                    targetObserver = new MutationObserver(function(mutations) {
                        if (isTypesetting) return;
                        const hasDashUpdate = mutations.some(function(m) {
                            for (let i = 0; i < m.addedNodes.length; i++) {
                                const node = m.addedNodes[i];
                                if (node.nodeType === 1 && !node.tagName.toLowerCase().startsWith("mjx-")) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        if (hasDashUpdate) {
                            typesetTarget();
                        }
                    });
                    targetObserver.observe(target, { childList: true, subtree: true });
                    typesetTarget();
                }
            }

            attachObserver();
            const initInterval = setInterval(function() {
                if (document.getElementById("allotrope_properties_container")) {
                    attachObserver();
                    clearInterval(initInterval);
                }
            }, 100);

            document.addEventListener("click", function(e) {
                if (e.target && (e.target.closest("#visualizer_tabs") || e.target.closest(".nav-link"))) {
                    setTimeout(function() {
                        window.dispatchEvent(new Event("resize"));
                        typesetTarget();
                    }, 80);
                }
            });
        });
        </script>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
    </body>
</html>
"""

# 3. Crystal Toolkit 3D Structure Molecule Component
# Configured with OrbitControls (drag to rotate freely in 3D), continuous render loop (staticScene=False),
# corner compass (SW), and periodic image atoms for seamless boundary representation
structure_component = ctc.StructureMoleculeComponent(
    initial_structure,
    id="allotrope_structure_viewer",
    className="bg-transparent border-0 p-0 shadow-none",
    draw_image_atoms=True,
    bonded_sites_outside_unit_cell=True,
    scene_settings={
        "controls": "orbit",         # Smooth Three.js OrbitControls: left-drag ROTATES freely in 3D!
        "staticScene": False,        # Continuous render loop enables fluid 3D movement and rotation
        "extractAxis": True,         # Extracts axes to corner compass - prevents unit cell clipping
        "renderer": "webgl",
        "background": "#0e1117",     # Dark canvas matching theme
        "transparentBackground": False,
        "defaultZoom": 1.22,         # Prominent crystal framing showing full unit cell + bonding
        "secondaryObjectView": False,
    },
    scene_kwargs={
        "axisView": "SW",           # South-West corner orientation compass
    },
    unit_cell_choice="input",
    show_compass=True,
)

# 4. Selector Options Generators
def build_native_options():
    return [
        {
            "label": item.get(
                "selector_label",
                f"{item.get('display_name', item['name'])} ({item.get('display_symbol', item.get('symbol', 'N/A'))}) · "
                f"ΔE = {item['delta_e_ev']:.3f} eV/atom · "
                f"Plane Group: {item.get('wallpaper_group', 'p1')} (#{item.get('wallpaper_number', 1)})"
            ),
            "value": item["id"],
        }
        for item in allotropes
    ]

def build_midb_options():
    return [
        {
            "label": (
                f"{item['name']} • "
                f"Space Group: {item.get('space_group', 'P1')} • "
                f"E/atom: {item.get('final_energy_per_atom', 0.0):.3f} eV"
            ),
            "value": item["id"],
        }
        for item in midb_records
    ]

def build_mendeley_options():
    return [
        {
            "label": item.get("selector_label", f"{item['display_name']} · ΔE = {item['delta_e_ev']:.3f} eV/atom · {item['crystal_system']}"),
            "value": item["id"],
        }
        for item in mendeley_records
    ]

# 5. App Layout
layout = html.Div(
    [
        # The Apple Look: Clean Mono-Strip Top Banner (Integrated Pro Navigation)
        html.Div(
            dbc.Container(
                html.Div(
                    [
                        html.Span("RESEARCH RELEASE", className="apple-mono-badge me-2"),
                        html.Span(
                            "61 Girão–Meunier sp² Carbon Allotropes & MIDb Cloud Vacancy Database",
                            className="apple-mono-text me-3",
                        ),
                        html.Div(
                            [
                                html.A(
                                    [
                                        "Penn State Pure Publication ",
                                        html.Span("→", className="apple-mono-arrow"),
                                    ],
                                    href="https://pure.psu.edu/en/publications/classification-of-spsup2sup-bonded-carbon-allotropes-in-two-dimen/",
                                    target="_blank",
                                    className="apple-mono-link me-3",
                                ),
                                html.A(
                                    [
                                        "MIDb Cloud Carbon Dataset ",
                                        html.Span("→", className="apple-mono-arrow"),
                                    ],
                                    href="https://midb.cloud/search?show_pt=no&query=(elements==all([%27C%27]))",
                                    target="_blank",
                                    className="apple-mono-link",
                                ),
                            ],
                            className="apple-mono-links-group d-inline-flex align-items-center",
                        ),
                    ],
                    className="apple-mono-content d-flex align-items-center justify-content-center flex-wrap",
                ),
                fluid=True,
                className="px-3",
            ),
            id="apple_mono_strip",
            className="apple-mono-strip",
        ),

        dbc.Container(
            [
                # Settings, Auth, and Upload Standardization Modals
                make_settings_modal(),
                make_auth_modal(),
                make_upload_modal(),

                # Stores for theme, session settings, and auth
                dcc.Store(id="theme_store", storage_type="local", data="dark"),
                dcc.Store(id="session_user_store", storage_type="local", data={"logged_in": True, "username": "dr.carlos", "role": "Researcher"}),
                dcc.Store(id="session_settings_store", storage_type="local", data={"mp_configured": bool(os.getenv("MP_API_KEY")), "zoom": 1.5}),

                # Top Navigation & Header (Apple Minimalist Pro Taste)
                dbc.Navbar(
                    dbc.Container(
                        [
                            html.A(
                                dbc.Row(
                                    [
                                        dbc.Col(
                                            html.Div(
                                                "2D",
                                                className="brand-logo-badge",
                                            ),
                                            width="auto",
                                        ),
                                        dbc.Col(
                                            [
                                                html.H3(
                                                    "2D Carbon Explorer",
                                                    className="navbar-brand text-light fw-semibold mb-0 fs-5",
                                                    style={"letterSpacing": "-0.02em"},
                                                ),
                                                html.Span(
                                                    "Crystallographic Symmetry • First-Principles DFT • MIDb Cloud",
                                                    className="text-secondary small d-block",
                                                    style={"letterSpacing": "0.02em", "fontSize": "11px"},
                                                ),
                                            ],
                                            width="auto",
                                        ),
                                    ],
                                    align="center",
                                    className="g-2",
                                ),
                                href="#",
                                style={"textDecoration": "none"},
                            ),
                            dbc.Nav(
                                [
                                    # Upload & Deduplicate Button
                                    dbc.NavItem(
                                        dbc.Button(
                                            [
                                                html.I(className="bi bi-cloud-arrow-up-fill me-1 text-primary"),
                                                html.Span("Upload & Deduplicate"),
                                            ],
                                            id="btn_open_upload",
                                            size="sm",
                                            className="btn-ghost-dark me-2",
                                        )
                                    ),
                                    # Theme Switcher button (Light / Dark Mode)
                                    dbc.NavItem(
                                        dbc.Button(
                                            [
                                                html.I(id="theme_toggle_icon", className="bi bi-sun-fill me-1 text-warning"),
                                                html.Span("Light Mode", id="theme_toggle_text"),
                                            ],
                                            id="btn_theme_toggle",
                                            size="sm",
                                            className="btn-ghost-dark me-2",
                                        )
                                    ),
                                    # Settings button
                                    dbc.NavItem(
                                        dbc.Button(
                                            [
                                                html.I(className="bi bi-sliders me-1"),
                                                "Settings",
                                            ],
                                            id="btn_open_settings",
                                            size="sm",
                                            className="btn-ghost-dark me-2",
                                        )
                                    ),
                                    # User Account button
                                    dbc.NavItem(
                                        dbc.Button(
                                            [
                                                html.I(className="bi bi-person-circle me-1 text-info"),
                                                html.Span("dr.carlos (Researcher)", id="navbar_user_label"),
                                            ],
                                            id="btn_open_auth",
                                            size="sm",
                                            className="btn-ghost-dark me-2",
                                        )
                                    ),
                                    # GitHub Repository link
                                    dbc.NavItem(
                                        dbc.NavLink(
                                            [html.I(className="bi bi-github me-1"), "GitHub"],
                                            href="https://github.com/carlosraulps/2d-carbon-explorer",
                                            target="_blank",
                                            className="text-secondary small py-1",
                                        )
                                    ),
                                ],
                                className="ms-auto align-items-center",
                                navbar=True,
                            ),
                        ],
                        fluid=True,
                    ),
                    color="dark",
                    dark=True,
                    className="mb-4 app-navbar px-3 py-2 shadow-sm",
                ),

                # Control Bar: Dataset Switcher & Allotrope Selector
                dbc.Card(
                    dbc.CardBody(
                        [
                            dbc.Row(
                                [
                                    dbc.Col(
                                        [
                                            html.Div(
                                                [
                                                    html.Span(
                                                        "Database:",
                                                        className="fw-semibold text-secondary small text-uppercase me-3",
                                                        style={"letterSpacing": "0.05em"},
                                                    ),
                                                    dbc.RadioItems(
                                                        id="dataset_source_selector",
                                                        options=[
                                                            {"label": "61 Girão sp² Carbon Allotropes", "value": "native"},
                                                            {"label": "52 Mendeley Data (by Crystal System)", "value": "mendeley"},
                                                            {"label": "10 MIDb Cloud Quantum & Moiré Systems", "value": "midb"},
                                                        ],
                                                        value="native",
                                                        inline=True,
                                                        className="small fw-medium",
                                                    ),
                                                ],
                                                className="d-flex align-items-center mb-2",
                                            ),
                                            dcc.Dropdown(
                                                id="allotrope_selector",
                                                options=build_native_options(),
                                                value="graphene",
                                                clearable=False,
                                                className="allotrope-dropdown-control",
                                            ),
                                        ],
                                        md=7,
                                        className="filter-dropdown-col",
                                        style={"overflow": "visible", "zIndex": 1051},
                                    ),
                                    dbc.Col(
                                        [
                                            html.Div(
                                                "Thermodynamic Ground Anchors",
                                                className="fw-semibold text-secondary mb-2 small text-uppercase",
                                                style={"letterSpacing": "0.05em"},
                                            ),
                                            html.Div(
                                                [
                                                    html.Span(
                                                        "Graphene: 0.000 eV (h6₁)",
                                                        className="badge badge-subtle-success me-2 py-1",
                                                    ),
                                                    html.Span(
                                                        "Biphenylene: 0.456 eV (Synth.)",
                                                        className="badge badge-subtle-warning me-2 py-1",
                                                    ),
                                                    html.Span(
                                                        f"{len(allotropes)} Allotropes • {len(midb_records)} MIDb",
                                                        className="badge badge-subtle-info py-1",
                                                    ),
                                                ],
                                                className="d-flex flex-wrap gap-1 align-items-center",
                                            ),
                                        ],
                                        md=5,
                                        className="ps-md-4 mt-3 mt-md-0",
                                    ),
                                ],
                                align="center",
                            )
                        ],
                        className="py-3 px-3 overflow-visible",
                        style={"overflow": "visible"},
                    ),
                    className="mb-4 filter-control-card",
                    style={"overflow": "visible", "position": "relative", "zIndex": 1050},
                ),

                # Main Dashboard: Interactive Visualizers (Left) & Crystallographic Cards (Right)
                dbc.Row(
                    [
                        # Left Column: Dual Interactive Visualizer (2D Wallpaper Symmetry vs 3D Crystal Toolkit)
                        dbc.Col(
                            dbc.Card(
                                [
                                    dbc.CardHeader(
                                        html.Div(
                                            [
                                                html.I(className="bi bi-box me-2 text-info"),
                                        html.Span(
                                            "Crystallographic Structure & Symmetry Visualizer",
                                            className="fw-bold text-light",
                                        ),
                                    ],
                                    className="d-flex align-items-center",
                                ),
                                className="py-2",
                            ),
                            dbc.CardBody(
                                [
                                    dbc.Tabs(
                                        [
                                            dbc.Tab(
                                                [
                                                    html.Div(
                                                        [
                                                                dcc.Graph(
                                                                id="wallpaper_symmetry_graph",
                                                                figure=initial_symmetry_fig,
                                                                config={
                                                                    "displayModeBar": True,
                                                                    "scrollZoom": True,
                                                                    "toImageButtonOptions": {
                                                                        "format": "png",
                                                                        "filename": "2d_wallpaper_symmetry",
                                                                        "height": 700,
                                                                        "width": 800,
                                                                        "scale": 3,
                                                                    },
                                                                },
                                                            ),
                                                        ],
                                                        className="pt-2",
                                                    ),
                                                    html.Small(
                                                        "Tip: Click items in the legend above to toggle rotation centers (C₆, C₄, C₃, C₂), mirror lines (m), or glide lines (g).",
                                                        className="text-muted small d-block text-center mt-1",
                                                    ),
                                                ],
                                                label="2D Ball-and-Stick + Wallpaper Symmetry Overlay",
                                                tab_id="tab_2d_symmetry",
                                            ),
                                            dbc.Tab(
                                                [
                                                    html.Div(
                                                        structure_component.layout(size="520px"),
                                                        className="pt-2 crystal-3d-wrapper d-flex justify-content-center align-items-center",
                                                        style={"minHeight": "520px", "width": "100%"},
                                                    ),
                                                    html.Small(
                                                        "Tip: Drag left mouse button to rotate freely in 3D. Right-click to pan. Scroll wheel or pinch to zoom.",
                                                        className="text-muted small d-block text-center mt-1",
                                                    ),
                                                ],
                                                label="3D Crystal Viewer (Orientation Compass)",
                                                tab_id="tab_3d_viewer",
                                            ),
                                        ],
                                        id="visualizer_tabs",
                                        active_tab="tab_2d_symmetry",
                                    ),
                                ],
                                className="p-3",
                            ),
                        ],
                        className="h-100 visualizer-card",
                        style={"position": "relative", "zIndex": 10},
                    ),
                    md=7,
                    className="mb-4 mb-md-0",
                ),

                # Right Column: Crystallographic Properties & Energetics Dashboard
                dbc.Col(
                    html.Div(
                        id="allotrope_properties_container",
                        children=render_properties_dashboard(default_allotrope),
                    ),
                    md=5,
                ),
            ],
            className="mb-4 g-3",
        ),

        # SECTION: Thermodynamic Stability Landscape Bar Chart
        dbc.Card(
            [
                dbc.CardHeader(
                    dbc.Row(
                        [
                            dbc.Col(
                                html.Div(
                                    [
                                        html.I(className="bi bi-bar-chart-line me-2 text-warning"),
                                        html.Span(
                                            "Thermodynamic Stability Landscape (Relative DFT Energetics ΔE vs. Graphene)",
                                            className="fw-bold text-light",
                                        ),
                                    ],
                                    className="d-flex align-items-center",
                                ),
                                md=7,
                            ),
                            dbc.Col(
                                html.Div(
                                    [
                                        html.Span("Display Filter: ", className="text-secondary small me-2"),
                                        dbc.RadioItems(
                                            id="stability_filter_mode",
                                            options=[
                                                {
                                                    "label": "Synthetically Feasible (ΔE ≤ 0.456 eV)",
                                                    "value": "accessible",
                                                },
                                                {"label": "Featured Flagships", "value": "featured"},
                                                {"label": "Complete Catalog (All 61)", "value": "all"},
                                            ],
                                            value="accessible",
                                            inline=True,
                                            className="small text-light",
                                        ),
                                    ],
                                    className="d-flex align-items-center justify-content-md-end",
                                ),
                                md=5,
                            ),
                        ],
                        align="center",
                    ),
                    className="py-2",
                ),
                dbc.CardBody(
                    [
                        dcc.Graph(
                            id="stability_landscape_chart",
                            figure=make_enhanced_stability_chart(allotropes, "graphene", "accessible", theme="dark"),
                            config={"displayModeBar": False},
                        )
                    ],
                    className="p-2",
                ),
            ],
            className="mb-4",
        ),

        # SECTION: Bottom Intelligence Center (Master Catalog Table vs MIDb Cloud Intelligence)
        dbc.Tabs(
            [
                dbc.Tab(
                    dbc.Card(
                        [
                            dbc.CardHeader(
                                html.Div(
                                    [
                                        html.I(className="bi bi-table me-2 text-info"),
                                        html.Span(
                                            "Girão Allotropes Master Catalog & Crystallographic Taxonomy Table",
                                            className="fw-bold text-light",
                                        ),
                                    ],
                                    className="d-flex align-items-center",
                                ),
                                className="py-2",
                            ),
                            dbc.CardBody(
                                [
                                    dash_table.DataTable(
                                        id="catalog_datatable",
                                        columns=[
                                            {"name": "Allotrope Name", "id": "display_name"},
                                            {"name": "Taxonomy Symbol (Girão)", "id": "display_symbol"},
                                            {"name": "2D Wallpaper Group", "id": "wallpaper_group"},
                                            {"name": "Plane Group #", "id": "wallpaper_number"},
                                            {"name": "3D Space Group", "id": "space_group"},
                                            {"name": "Atoms/Cell", "id": "natoms"},
                                            {
                                                "name": "Relative Energy ΔE (eV/atom)",
                                                "id": "delta_e_ev",
                                                "type": "numeric",
                                                "format": {"specifier": ".3f"},
                                            },
                                            {
                                                "name": "Offset ΔE − ΔEbiph (eV/atom)",
                                                "id": "offset_biphenylene",
                                                "type": "numeric",
                                                "format": {"specifier": "+.3f"},
                                            },
                                            {"name": "Density ρ (g/cm³)", "id": "density", "type": "numeric", "format": {"specifier": ".3f"}},
                                            {"name": "Literature Source", "id": "reference"},
                                        ],
                                        data=allotropes,
                                        page_size=10,
                                        sort_action="native",
                                        filter_action="native",
                                        style_table={"overflowX": "auto"},
                                        style_header={
                                            "backgroundColor": "#161922",
                                            "color": "#00d2be",
                                            "fontWeight": "600",
                                            "border": "1px solid rgba(255, 255, 255, 0.08)",
                                            "fontFamily": "var(--font-ui)",
                                            "fontSize": "13px",
                                            "padding": "10px",
                                        },
                                        style_cell={
                                            "backgroundColor": "#11141a",
                                            "color": "#f1f5f9",
                                            "border": "1px solid rgba(255, 255, 255, 0.06)",
                                            "padding": "8px 12px",
                                            "fontFamily": "var(--font-ui)",
                                            "fontSize": "13px",
                                        },
                                        style_data_conditional=[
                                            {
                                                "if": {"column_id": "delta_e_ev"},
                                                "color": "#f1c40f",
                                                "fontWeight": "bold",
                                            },
                                            {
                                                "if": {"column_id": "offset_biphenylene"},
                                                "color": "#00d2be",
                                                "fontWeight": "bold",
                                            },
                                            {
                                                "if": {"column_id": "wallpaper_group"},
                                                "color": "#74b9ff",
                                                "fontWeight": "bold",
                                            },
                                        ],
                                    )
                                ],
                                className="p-3",
                            ),
                        ],
                        className="mb-4",
                    ),
                    label="Girão Allotropes Master Catalog (61 Structures)",
                    tab_id="tab_table_girao",
                ),
                dbc.Tab(
                    render_midb_dashboard(midb_records, midb_distribution),
                    label="MIDb Cloud 2D Materials & Symmetry Distribution (10 Records)",
                    tab_id="tab_table_midb",
                ),
            ],
            id="bottom_tabs",
            active_tab="tab_table_girao",
            className="mb-5",
        ),

        # Footer
        html.Footer(
            dbc.Container(
                [
                    html.Hr(className="border-secondary"),
                    html.P(
                        [
                            "2D Carbon Explorer • sp² Allotrope Taxonomy (Girão, Macmillan & Meunier, Carbon 203, 2023) • Biphenylene Synthesis Benchmark (Fan et al., Science 372, 2021) • MIDb Cloud Vacancy Quantum Phases (arXiv:2603.17122) • Powered by ",
                            html.A("Crystal Toolkit", href="https://github.com/materialsproject/crystaltoolkit", target="_blank", className="text-info"),
                            " & ",
                            html.A("Pymatgen", href="https://github.com/materialsproject/pymatgen", target="_blank", className="text-info"),
                            ".",
                        ],
                        className="text-center text-muted small pb-3",
                    ),
                ]
            )
        ),
            ],
            fluid=True,
            className="py-3 px-4 min-vh-100",
        ),
    ],
    id="app_root",
    **{"data-theme": "dark"},
)

# 6. Register Crystal Toolkit Component with App Layout
cache = Cache(config={"CACHE_TYPE": "SimpleCache"})
ctc.register_crystal_toolkit(app=app, layout=layout, cache=cache)


# 7. Dataset Source Switching Callback
@app.callback(
    Output("allotrope_selector", "options"),
    Output("allotrope_selector", "value"),
    Input("dataset_source_selector", "value"),
)
def switch_dataset_source(source: str):
    """Switch active dataset between Girão 61 allotropes, Mendeley Data, and MIDb Cloud records."""
    if source == "midb":
        return build_midb_options(), midb_records[0]["id"]
    if source == "mendeley":
        return build_mendeley_options(), mendeley_records[0]["id"]
    return build_native_options(), "graphene"


# 8. Main Interactivity Callback
@app.callback(
    Output(structure_component.id(), "data"),
    Output("wallpaper_symmetry_graph", "figure"),
    Output("allotrope_properties_container", "children"),
    Output("stability_landscape_chart", "figure"),
    Input("allotrope_selector", "value"),
    Input("stability_filter_mode", "value"),
    Input("theme_store", "data"),
)
def update_selected_allotrope(selected_id: str, filter_mode: str, current_theme: str):
    """Update 3D crystal structure, 2D wallpaper symmetry overlay, properties cards, and chart with theme."""
    theme = current_theme or "dark"
    item = (
        catalog_db.get_by_id(selected_id)
        or mendeley_db.get_by_id(selected_id)
        or midb_db.get_by_id(selected_id)
        or default_allotrope
    )
    structure = loader.get_structure(item.get("relative_path") or item.get("filename"))
    symmetry_fig = make_wallpaper_symmetry_figure(structure, item, theme=theme)
    properties_view = render_properties_dashboard(item)
    chart = make_enhanced_stability_chart(allotropes, selected_id, filter_mode or "accessible", theme=theme)
    return structure, symmetry_fig, properties_view, chart


# 9. Light / Dark Theme Switching Callback
@app.callback(
    Output("theme_store", "data"),
    Output("app_root", "data-theme"),
    Output("theme_toggle_icon", "className"),
    Output("theme_toggle_text", "children"),
    Input("btn_theme_toggle", "n_clicks"),
    State("theme_store", "data"),
    prevent_initial_call=True,
)
def toggle_app_theme(n_clicks, current_theme):
    if not n_clicks:
        return dash.no_update, dash.no_update, dash.no_update, dash.no_update
    new_theme = "light" if current_theme == "dark" else "dark"
    if new_theme == "light":
        return "light", "light", "bi bi-moon-stars-fill me-1 text-info", "Dark Mode"
    return "dark", "dark", "bi bi-sun-fill me-1 text-warning", "Light Mode"



# 9. Settings & Authentication Modal Callbacks
@app.callback(
    Output("modal_settings", "is_open"),
    Output("settings_save_feedback", "children"),
    Input("btn_open_settings", "n_clicks"),
    Input("btn_close_settings", "n_clicks"),
    Input("btn_save_settings", "n_clicks"),
    State("modal_settings", "is_open"),
    State("input_mp_api_key", "value"),
    State("input_github_user", "value"),
    prevent_initial_call=True,
)
def handle_settings_modal(n_open, n_close, n_save, is_open, mp_key, gh_user):
    ctx = dash.callback_context
    if not ctx.triggered:
        return dash.no_update, dash.no_update
    trig = ctx.triggered[0]["prop_id"].split(".")[0]

    if trig == "btn_open_settings":
        return True, ""
    elif trig == "btn_close_settings":
        return False, ""
    elif trig == "btn_save_settings":
        feedback = dbc.Alert(
            f"Preferences updated successfully. GitHub linked as @{gh_user or 'carlosraulps'}.",
            color="success",
            dismissable=True,
            className="py-2 small",
        )
        return False, feedback
    return is_open, ""


@app.callback(
    Output("input_mp_api_key", "type"),
    Input("btn_toggle_key_visibility", "n_clicks"),
    State("input_mp_api_key", "type"),
    prevent_initial_call=True,
)
def toggle_key_visibility(n_clicks, current_type):
    if not n_clicks:
        return dash.no_update
    return "text" if current_type == "password" else "password"


@app.callback(
    Output("modal_auth", "is_open"),
    Output("navbar_user_label", "children"),
    Input("btn_open_auth", "n_clicks"),
    Input("btn_close_auth", "n_clicks"),
    Input("btn_submit_login", "n_clicks"),
    Input("btn_login_github_oauth", "n_clicks"),
    State("modal_auth", "is_open"),
    State("input_login_username", "value"),
    prevent_initial_call=True,
)
def handle_auth_modal(n_open, n_close, n_submit, n_oauth, is_open, username):
    ctx = dash.callback_context
    if not ctx.triggered:
        return dash.no_update, dash.no_update
    trig = ctx.triggered[0]["prop_id"].split(".")[0]

    if trig == "btn_open_auth":
        return True, dash.no_update
    elif trig == "btn_close_auth":
        return False, dash.no_update
    elif trig in ("btn_submit_login", "btn_login_github_oauth"):
        clean_user = username.split("@")[0] if "@" in username else (username or "Researcher")
        return False, f"{clean_user} (Researcher)"
    return is_open, dash.no_update


# 10. Seamless Native Single-Click CIF Export Callbacks
@app.callback(
    Output("download_cif_primitive", "data"),
    Input("btn_download_primitive", "n_clicks"),
    State("allotrope_selector", "value"),
    prevent_initial_call=True,
)
def export_primitive_cif(n_clicks: int, selected_id: str):
    """Generate and trigger download of primitive unit cell CIF."""
    if not n_clicks:
        return dash.no_update
    item = (
        catalog_db.get_by_id(selected_id)
        or mendeley_db.get_by_id(selected_id)
        or midb_db.get_by_id(selected_id)
        or default_allotrope
    )
    structure = loader.get_structure(item.get("relative_path") or item.get("filename"))
    try:
        sga = SpacegroupAnalyzer(structure, symprec=1e-3)
        prim_struct = sga.get_primitive_standard_structure()
    except Exception:
        prim_struct = structure
    writer = CifWriter(prim_struct, symprec=1e-3)
    cif_text = str(writer)
    return dict(content=cif_text, filename=f"{selected_id}_primitive.cif")


@app.callback(
    Output("download_cif_supercell", "data"),
    Input("btn_download_supercell", "n_clicks"),
    State("allotrope_selector", "value"),
    prevent_initial_call=True,
)
def export_supercell_cif(n_clicks: int, selected_id: str):
    """Generate and trigger download of 2x2 supercell CIF."""
    if not n_clicks:
        return dash.no_update
    item = (
        catalog_db.get_by_id(selected_id)
        or mendeley_db.get_by_id(selected_id)
        or midb_db.get_by_id(selected_id)
        or default_allotrope
    )
    structure = loader.get_structure(item.get("relative_path") or item.get("filename"))
    sc = structure.copy()
    sc.make_supercell([2, 2, 1])
    writer = CifWriter(sc, symprec=None)
    cif_text = str(writer)
    return dict(content=cif_text, filename=f"{selected_id}_supercell_2x2.cif")


@app.callback(
    Output("download_cif_conventional", "data"),
    Input("btn_download_conventional", "n_clicks"),
    State("allotrope_selector", "value"),
    prevent_initial_call=True,
)
def export_conventional_cif(n_clicks: int, selected_id: str):
    """Generate and trigger download of conventional standard CIF."""
    if not n_clicks:
        return dash.no_update
    item = (
        catalog_db.get_by_id(selected_id)
        or mendeley_db.get_by_id(selected_id)
        or midb_db.get_by_id(selected_id)
        or default_allotrope
    )
    structure = loader.get_structure(item.get("relative_path") or item.get("filename"))
    try:
        sga = SpacegroupAnalyzer(structure, symprec=1e-3)
        conv_struct = sga.get_conventional_standard_structure()
    except Exception:
        conv_struct = structure
    writer = CifWriter(conv_struct, symprec=1e-3)
    cif_text = str(writer)
    return dict(content=cif_text, filename=f"{selected_id}_conventional.cif")


# 11. Allotrope Upload, Nomenclature Standardization & Deduplication Callbacks
@app.callback(
    Output("modal_upload_dedup", "is_open"),
    [Input("btn_open_upload", "n_clicks"), Input("btn_close_upload", "n_clicks")],
    [State("modal_upload_dedup", "is_open")],
    prevent_initial_call=True,
)
def toggle_upload_modal(n_open, n_close, is_open):
    return not is_open


@app.callback(
    Output("upload_analysis_output", "children"),
    Input("upload_allotrope_file", "contents"),
    State("upload_allotrope_file", "filename"),
    prevent_initial_call=True,
)
def handle_uploaded_structure_file(contents, filename):
    if not contents or not filename:
        return html.Div()
    return analyze_uploaded_structure(contents, filename, catalog_db.get_all())


@app.callback(
    Output("allotrope_selector", "value", allow_duplicate=True),
    Output("modal_upload_dedup", "is_open", allow_duplicate=True),
    Input({"type": "btn_load_matched_allotrope", "id": dash.ALL}, "n_clicks"),
    State({"type": "btn_load_matched_allotrope", "id": dash.ALL}, "id"),
    prevent_initial_call=True,
)
def load_matched_allotrope_to_explorer(n_clicks_list, id_list):
    ctx = dash.callback_context
    if not ctx.triggered or not any(n_clicks_list):
        return dash.no_update, dash.no_update
    import json
    trig_prop = ctx.triggered[0]["prop_id"]
    trig_data = json.loads(trig_prop.split(".")[0])
    target_id = trig_data.get("id")
    if target_id:
        return target_id, False
    return dash.no_update, dash.no_update


if __name__ == "__main__":
    app.run(debug=True, dev_tools_ui=False, host="0.0.0.0", port=8050)

