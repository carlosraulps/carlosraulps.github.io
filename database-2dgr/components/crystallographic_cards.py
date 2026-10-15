"""
Crystallographic & Thermodynamic Properties Cards for 2D Carbon Explorer.

Material 3 & shadcn Design Architecture:
- Strict academic typography with Times New Roman & STIX Two Text
- Elegant mathematical grid for lattice basis and angles with zero wrapping
- Clean typography-first hierarchy without emoji clutter
- Seamless native CIF exports
"""

from __future__ import annotations
import re
import dash_bootstrap_components as dbc
from dash import html, dcc


def format_latex_taxonomy(symbol: str) -> str:
    """Format taxonomy codes like 'h6_1' -> '$h6_{1}$', 'r4^1_6^1_8^1' -> '$r4^{1} \cdot 6^{1} \cdot 8^{1}$', 'alpha_gr' -> '$\\alpha\\text{-Gr}$'."""
    if not symbol or symbol == "N/A":
        return "N/A"
    special = {
        "alpha_gr": r"\alpha\text{-Gr}",
        "beta_gr": r"\beta\text{-Gr}",
        "cmmm_graphene": r"\text{Cmmm-Gr}",
        "photh_graphene": r"\text{PHOTH-Gr}",
        "graphene": r"h6_{1}",
        "h6_1": r"h6_{1}",
    }
    if str(symbol).lower() in special:
        return f"${special[str(symbol).lower()]}$"

    parts = str(symbol).split("_")
    idx = None
    if len(parts) > 1 and parts[-1].isdigit():
        idx = parts.pop()

    clean_parts = []
    for p in parts:
        p_clean = re.sub(r"\^([0-9]+)", r"^{\1}", p)
        p_clean = p_clean.replace("-", r"\text{--}")
        clean_parts.append(p_clean)

    tex = r" \cdot ".join(clean_parts)
    if idx:
        tex += f"_{{({idx})}}"
    return f"${tex}$"


def format_symmetry_latex(val: str) -> str:
    """Format symmetry element strings like 'C6, C3, C2' -> '$C_6, C_3, C_2$'."""
    if not val or val == "None":
        return "None"
    formatted = re.sub(r'C([0-9])', r'C_{\1}', str(val))
    return f"${formatted}$"


def render_properties_dashboard(item: dict) -> html.Div:
    """
    Render comprehensive crystallographic dashboard combining 2D wallpaper symmetry,
    thermodynamic stability vs. graphene and biphenylene, and lattice metrics.
    """
    delta_e = float(item.get("delta_e_ev", 0.0))
    biphenylene_ref = 0.456  # Fan et al., Science 372, 852 (2021)
    diff_from_biph = delta_e - biphenylene_ref

    # Synthesis regime evaluation (shadcn subtle pill badge style)
    if delta_e <= 0.001:
        regime_badge = html.Span(
            dcc.Markdown("Ground-State Reference ($h6_{1}$)", mathjax=True, className="d-inline"),
            className="badge badge-subtle-success px-2 py-1 fw-semibold",
        )
        regime_desc = "Thermodynamic global minimum for two-dimensional $\\mathrm{sp}^2$ carbon."
        gauge_percent = 0.0
    elif delta_e <= biphenylene_ref:
        regime_badge = html.Span(
            "Synthetically Feasible Window",
            className="badge badge-subtle-info px-2 py-1 fw-semibold",
        )
        regime_desc = (
            f"More stable than synthesized biphenylene network by "
            f"$\\Delta E = {abs(diff_from_biph):.3f}\\text{{ eV/atom}}$ (within experimental frontier)."
        )
        gauge_percent = min(100.0, (delta_e / biphenylene_ref) * 100.0)
    else:
        regime_badge = html.Span(
            "High-Energy Non-Equilibrium Regime",
            className="badge badge-subtle-warning px-2 py-1 fw-semibold",
        )
        regime_desc = (
            f"Exceeds biphenylene benchmark by $+{diff_from_biph:.3f}\\text{{ eV/atom}}$. "
            f"Requires kinetic trapping or template-assisted bottom-up synthesis."
        )
        gauge_percent = 100.0

    wp_group = item.get("wallpaper_group", "p1")
    wp_num = item.get("wallpaper_number", 1)
    wp_system = item.get("wallpaper_system", item.get("lattice_type", "Oblique")).capitalize()
    wp_pg = item.get("wallpaper_point_group", "1 (C1)")
    wp_rot = item.get("wallpaper_rotations", "None")
    wp_mir = item.get("wallpaper_mirrors", "None")
    wp_gli = item.get("wallpaper_glides", "None")

    a_val = float(item.get("a", item.get("lattice_a", 0.0)))
    b_val = float(item.get("b", item.get("lattice_b", 0.0)))
    c_val = float(item.get("c", item.get("lattice_c", 0.0)))
    alpha_val = float(item.get("alpha", 90.0))
    beta_val = float(item.get("beta", 90.0))
    gamma_val = float(item.get("gamma", item.get("lattice_gamma", 90.0)))
    natoms_val = item.get("natoms", item.get("sites", 0))

    return html.Div(
        [
            # Header with Name and Taxonomy / Origin
            html.Div(
                [
                    html.H3(
                        item["name"],
                        className="text-info fw-bold mb-1",
                        style={"fontFamily": "'Times New Roman', Times, serif"},
                    ),
                    html.Div(
                        [
                            (
                                html.Span(
                                    [
                                        html.Span("MIDb Cloud Record: ", className="text-secondary small"),
                                        html.A(
                                            item.get("formula", item["name"]),
                                            href=item.get("midb_url", "#"),
                                            target="_blank",
                                            className="badge badge-subtle-info fs-6 px-2 py-1 text-decoration-none me-2",
                                        ),
                                        html.Span(
                                            f"• {item.get('category', '2D Heterostructure')} • Ref: {item.get('reference', 'MIDb (2026)')}",
                                            className="text-muted small",
                                        ),
                                    ]
                                )
                                if item.get("midb_url")
                                else html.Span(
                                    [
                                        html.Span(
                                            "Girão–Meunier Taxonomy: ",
                                            className="text-secondary small",
                                        ),
                                        html.Span(
                                            dcc.Markdown(
                                                format_latex_taxonomy(item.get("symbol", "N/A")),
                                                mathjax=True,
                                                className="d-inline",
                                            ),
                                            className="badge badge-subtle-info fs-6 px-2 py-1",
                                        ),
                                        html.Span(
                                            f" • Ref: {item.get('reference', 'Carbon 203 (2023)')}",
                                            className="text-muted small ms-2",
                                        ),
                                    ]
                                )
                            ),
                        ],
                        className="mb-3",
                    ),
                ]
            ),

            # SECTION 1: 2D Wallpaper Space Group & Plane Symmetry
            dbc.Card(
                [
                    dbc.CardHeader(
                        html.Div(
                            [
                                html.I(className="bi bi-grid-3x3 me-2 text-info"),
                                html.Span(
                                    "2D Wallpaper Space Group & Plane Symmetry",
                                    className="fw-bold text-heading",
                                ),
                            ],
                            className="d-flex align-items-center",
                        ),
                    ),
                    dbc.CardBody(
                        [
                            dbc.Row(
                                [
                                    dbc.Col(
                                        [
                                            html.Small(
                                                "2D Wallpaper Group",
                                                className="text-secondary d-block mb-1",
                                            ),
                                            html.Div(
                                                [
                                                    html.Span(
                                                        wp_group,
                                                        className="badge badge-subtle-info fs-5 fw-bold me-2 px-3 py-1 font-monospace",
                                                    ),
                                                    html.Span(
                                                        f"Plane Group #{wp_num}",
                                                        className="badge badge-subtle-secondary px-2 py-1",
                                                    ),
                                                ],
                                                className="mb-2",
                                            ),
                                            html.Small(
                                                f"2D Crystal System: {wp_system}",
                                                className="text-secondary d-block small",
                                            ),
                                        ],
                                        md=6,
                                        className="border-end border-secondary pe-3",
                                    ),
                                    dbc.Col(
                                        [
                                            html.Small(
                                                "In-Plane Point Group",
                                                className="text-secondary d-block mb-1",
                                            ),
                                            html.Div(
                                                html.Span(
                                                    wp_pg,
                                                    className="badge badge-subtle-primary fs-6 px-2 py-1",
                                                ),
                                                className="mb-2",
                                            ),
                                            html.Small(
                                                f"3D Space Group: {item.get('space_group', 'P1')}",
                                                className="text-light d-block small",
                                            ),
                                        ],
                                        md=6,
                                        className="ps-3",
                                    ),
                                ],
                                className="mb-3 g-2",
                            ),
                            # Symmetry Elements Table
                            html.Div(
                                [
                                    html.Small(
                                        "Overlaid Symmetry Elements",
                                        className="text-secondary text-uppercase fw-semibold d-block mb-1 small",
                                        style={"letterSpacing": "0.04em"},
                                    ),
                                    html.Table(
                                        [
                                            html.Tr(
                                                [
                                                    html.Td(
                                                        "Rotation Centers:",
                                                        className="text-muted pe-2 py-1 small",
                                                    ),
                                                    html.Td(
                                                        dcc.Markdown(
                                                            format_symmetry_latex(wp_rot),
                                                            mathjax=True,
                                                            className="d-inline",
                                                        ),
                                                        className="text-light py-1 small fw-semibold",
                                                    ),
                                                ]
                                            ),
                                            html.Tr(
                                                [
                                                    html.Td(
                                                        "Reflection Lines (m):",
                                                        className="text-muted pe-2 py-1 small",
                                                    ),
                                                    html.Td(
                                                        dcc.Markdown(
                                                            wp_mir.replace("(m)", "($m$)") if wp_mir != "None" else "None",
                                                            mathjax=True,
                                                            className="d-inline",
                                                        ),
                                                        className="text-info py-1 small fw-semibold",
                                                    ),
                                                ]
                                            ),
                                            html.Tr(
                                                [
                                                    html.Td(
                                                        "Glide Lines (g):",
                                                        className="text-muted pe-2 py-1 small",
                                                    ),
                                                    html.Td(
                                                        dcc.Markdown(
                                                            wp_gli.replace("(g)", "($g$)") if wp_gli != "None" else "None",
                                                            mathjax=True,
                                                            className="d-inline",
                                                        ),
                                                        className="text-warning py-1 small fw-semibold",
                                                    ),
                                                ]
                                            ),
                                        ],
                                        className="w-100",
                                    ),
                                ],
                                className="metric-tile",
                            ),
                        ],
                        className="p-3",
                    ),
                ],
                className="mb-3",
            ),

            # SECTION 2: Thermodynamic Energetics (ΔE)
            dbc.Card(
                [
                    dbc.CardHeader(
                        html.Div(
                            [
                                html.I(className="bi bi-activity me-2 text-warning"),
                                html.Span(
                                    "Thermodynamic Energetics (Anchored vs. Graphene & Biphenylene)",
                                    className="fw-bold text-light",
                                ),
                            ],
                            className="d-flex align-items-center",
                        ),
                    ),
                    dbc.CardBody(
                        [
                            dbc.Row(
                                [
                                    dbc.Col(
                                        [
                                            html.Small(
                                                dcc.Markdown(
                                                    "Relative Energy $\\Delta E$ (vs. $h6_{1}$)",
                                                    mathjax=True,
                                                    className="d-inline",
                                                ),
                                                className="text-secondary d-block mb-1 small text-nowrap",
                                            ),
                                            html.H4(
                                                dcc.Markdown(
                                                    f"${delta_e:.3f}\\text{{ eV/atom}}$",
                                                    mathjax=True,
                                                    className="d-inline",
                                                ),
                                                className="text-warning fw-bold mb-1 math-font",
                                            ),
                                            html.Small(
                                                dcc.Markdown(
                                                    "Baseline: $0.000\\text{ eV/atom}$",
                                                    mathjax=True,
                                                    className="d-inline",
                                                ),
                                                className="text-muted d-block small",
                                            ),
                                        ],
                                        md=6,
                                        className="border-end border-secondary pe-2",
                                    ),
                                    dbc.Col(
                                        [
                                            html.Small(
                                                dcc.Markdown(
                                                    "Offset $\\Delta E - \\Delta E_{\\mathrm{biph}}$",
                                                    mathjax=True,
                                                    className="d-inline",
                                                ),
                                                className="text-secondary d-block mb-1 small text-nowrap",
                                            ),
                                            html.H4(
                                                dcc.Markdown(
                                                    f"${diff_from_biph:+.3f}\\text{{ eV/atom}}$",
                                                    mathjax=True,
                                                    className="d-inline",
                                                ),
                                                className=(
                                                    "text-info fw-bold mb-1 math-font"
                                                    if diff_from_biph <= 0
                                                    else "text-danger fw-bold mb-1 math-font"
                                                ),
                                            ),
                                            html.Small(
                                                dcc.Markdown(
                                                    "Ref: *Science* **372**, 852",
                                                    mathjax=True,
                                                    className="d-inline",
                                                ),
                                                className="text-muted d-block small",
                                            ),
                                        ],
                                        md=6,
                                        className="ps-2",
                                    ),
                                ],
                                className="mb-3 g-2 align-items-center",
                            ),
                            # Stability Meter & Regime Badge
                            html.Div(
                                [
                                    html.Div(
                                        [regime_badge],
                                        className="mb-2",
                                    ),
                                    dcc.Markdown(
                                        regime_desc,
                                        mathjax=True,
                                        className="text-light small mb-2",
                                    ),
                                    # Visual Scale Bar
                                    html.Div(
                                        [
                                            dbc.Progress(
                                                [
                                                    dbc.Progress(
                                                        value=min(100.0, gauge_percent),
                                                        color="info" if delta_e <= biphenylene_ref else "warning",
                                                        striped=False,
                                                        animated=False,
                                                    ),
                                                ],
                                                style={"height": "6px"},
                                                className="mb-1 rounded bg-secondary",
                                            ),
                                            dbc.Row(
                                                [
                                                    dbc.Col(
                                                        html.Small(
                                                            dcc.Markdown(
                                                                "$0.000\\text{ eV}$ (Graphene $h6_{1}$)",
                                                                mathjax=True,
                                                                className="d-inline",
                                                            ),
                                                            className="text-success small fw-semibold",
                                                        ),
                                                        width=6,
                                                    ),
                                                    dbc.Col(
                                                        html.Small(
                                                            dcc.Markdown(
                                                                "$0.456\\text{ eV}$ (Biphenylene Synth.)",
                                                                mathjax=True,
                                                                className="d-inline",
                                                            ),
                                                            className="text-warning small fw-semibold text-end",
                                                        ),
                                                        width=6,
                                                    ),
                                                ]
                                            ),
                                        ],
                                        className="mt-2",
                                    ),
                                ],
                                className="metric-tile",
                            ),
                        ],
                        className="p-3",
                    ),
                ],
                className="mb-3",
            ),

            # SECTION 3: Crystallographic Lattice & 2D Verification (STIX Mathematical Grid, Zero Wrapping)
            dbc.Card(
                [
                    dbc.CardHeader(
                        html.Div(
                            [
                                html.I(className="bi bi-bounding-box me-2 text-info"),
                                html.Span(
                                    "Crystallographic Lattice & 2D Verification",
                                    className="fw-bold text-light",
                                ),
                            ],
                            className="d-flex align-items-center",
                        ),
                    ),
                    dbc.CardBody(
                        [
                            # Basis Lengths (3 distinct columns, white-space: nowrap guaranteed)
                            html.Small(
                                "Unit Cell Basis Lengths",
                                className="text-secondary text-uppercase fw-semibold d-block mb-2 small",
                                style={"letterSpacing": "0.04em"},
                            ),
                            dbc.Row(
                                [
                                    dbc.Col(
                                        html.Div(
                                            [
                                                dcc.Markdown(
                                                    f"$a = {a_val:.3f}\\text{{ Å}}$",
                                                    mathjax=True,
                                                    className="text-light fw-bold text-nowrap math-font fs-6",
                                                ),
                                            ],
                                            className="metric-tile text-center",
                                        ),
                                        width=4,
                                    ),
                                    dbc.Col(
                                        html.Div(
                                            [
                                                dcc.Markdown(
                                                    f"$b = {b_val:.3f}\\text{{ Å}}$",
                                                    mathjax=True,
                                                    className="text-light fw-bold text-nowrap math-font fs-6",
                                                ),
                                            ],
                                            className="metric-tile text-center",
                                        ),
                                        width=4,
                                    ),
                                    dbc.Col(
                                        html.Div(
                                            [
                                                dcc.Markdown(
                                                    f"$c = {c_val:.3f}\\text{{ Å}}$",
                                                    mathjax=True,
                                                    className="text-light fw-bold text-nowrap math-font fs-6",
                                                ),
                                            ],
                                            className="metric-tile text-center",
                                        ),
                                        width=4,
                                    ),
                                ],
                                className="g-2 mb-3",
                            ),

                            # Inter-Axial Angles (3 distinct columns, white-space: nowrap guaranteed)
                            html.Small(
                                "Inter-Axial Angles",
                                className="text-secondary text-uppercase fw-semibold d-block mb-2 small",
                                style={"letterSpacing": "0.04em"},
                            ),
                            dbc.Row(
                                [
                                    dbc.Col(
                                        html.Div(
                                            [
                                                dcc.Markdown(
                                                    f"$\\alpha = {alpha_val:.1f}^\\circ$",
                                                    mathjax=True,
                                                    className="text-light fw-bold text-nowrap math-font fs-6",
                                                ),
                                            ],
                                            className="metric-tile text-center",
                                        ),
                                        width=4,
                                    ),
                                    dbc.Col(
                                        html.Div(
                                            [
                                                dcc.Markdown(
                                                    f"$\\beta = {beta_val:.1f}^\\circ$",
                                                    mathjax=True,
                                                    className="text-light fw-bold text-nowrap math-font fs-6",
                                                ),
                                            ],
                                            className="metric-tile text-center",
                                        ),
                                        width=4,
                                    ),
                                    dbc.Col(
                                        html.Div(
                                            [
                                                dcc.Markdown(
                                                    f"$\\gamma = {gamma_val:.1f}^\\circ$",
                                                    mathjax=True,
                                                    className="text-info fw-bold text-nowrap math-font fs-6",
                                                ),
                                            ],
                                            className="metric-tile text-center",
                                        ),
                                        width=4,
                                    ),
                                ],
                                className="g-2 mb-3",
                            ),

                            # Atomic Count & Density Metrics
                            dbc.Row(
                                [
                                    dbc.Col(
                                        html.Div(
                                            [
                                                html.Small(
                                                    dcc.Markdown("$N_{\\mathrm{atoms}}$ / Cell", mathjax=True, className="d-inline"),
                                                    className="text-secondary d-block small mb-1",
                                                ),
                                                html.Div(
                                                    dcc.Markdown(f"$N = {natoms_val}$", mathjax=True, className="d-inline"),
                                                    className="fw-semibold text-light small",
                                                ),
                                            ],
                                            className="metric-tile text-center py-2 px-1",
                                        ),
                                        width=4,
                                    ),
                                    dbc.Col(
                                        html.Div(
                                            [
                                                html.Small(
                                                    dcc.Markdown("Density $\\rho$", mathjax=True, className="d-inline"),
                                                    className="text-secondary d-block small mb-1",
                                                ),
                                                html.Div(
                                                    dcc.Markdown(f"${item.get('density', 0.0):.2f}\\text{{ g/cm}}^3$", mathjax=True, className="d-inline"),
                                                    className="fw-semibold text-light small text-nowrap",
                                                ),
                                            ],
                                            className="metric-tile text-center py-2 px-1",
                                        ),
                                        width=4,
                                    ),
                                    dbc.Col(
                                        html.Div(
                                            [
                                                html.Small("2D Verification", className="text-secondary d-block small mb-1"),
                                                html.Span("Monolayer", className="badge badge-subtle-success py-1 mt-1"),
                                            ],
                                            className="metric-tile text-center py-2 px-1",
                                        ),
                                        width=4,
                                    ),
                                ],
                                className="g-2 pt-2 border-top border-secondary",
                            ),
                        ],
                        className="p-3",
                    ),
                ],
                className="mb-3",
            ),

            # SECTION 4: Seamless CIF Export
            dbc.Card(
                [
                    dbc.CardHeader(
                        html.Div(
                            [
                                html.I(className="bi bi-download me-2 text-success"),
                                html.Span(
                                    "Export Crystallographic Information Files (CIF)",
                                    className="fw-bold text-light",
                                ),
                            ],
                            className="d-flex align-items-center",
                        ),
                    ),
                    dbc.CardBody(
                        [
                            html.P(
                                "Download Crystallographic Information Files (CIF) formatted with International Tables symmetry headers:",
                                className="text-secondary small mb-3",
                            ),
                            dbc.Row(
                                [
                                    dbc.Col(
                                        dbc.Button(
                                            [html.I(className="bi bi-file-earmark-code me-1"), "Primitive CIF"],
                                            id="btn_download_primitive",
                                            size="sm",
                                            className="w-100 fw-semibold btn-ghost-dark py-2",
                                        ),
                                        md=4,
                                        className="mb-2",
                                    ),
                                    dbc.Col(
                                        dbc.Button(
                                            [html.I(className="bi bi-grid-3x3-gap me-1"), "2×2 Supercell"],
                                            id="btn_download_supercell",
                                            size="sm",
                                            className="w-100 fw-semibold btn-ghost-dark py-2",
                                        ),
                                        md=4,
                                        className="mb-2",
                                    ),
                                    dbc.Col(
                                        dbc.Button(
                                            [html.I(className="bi bi-boxes me-1"), "Conventional CIF"],
                                            id="btn_download_conventional",
                                            size="sm",
                                            className="w-100 fw-semibold btn-ghost-dark py-2",
                                        ),
                                        md=4,
                                        className="mb-2",
                                    ),
                                ],
                                className="g-2",
                            ),
                            dcc.Download(id="download_cif_primitive"),
                            dcc.Download(id="download_cif_supercell"),
                            dcc.Download(id="download_cif_conventional"),
                        ],
                        className="p-3",
                    ),
                ],
                className="mb-2",
            ),
        ]
    )
