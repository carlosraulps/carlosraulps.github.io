"""
MIDb (Materials Informatics Database) 2D Carbon & Heterostructures View.
Visualizes the Sankey symmetry distribution across 2D carbon materials and provides
an interactive catalog of harvested quantum vacancy phases and moiré heterostructures.
"""

from __future__ import annotations
import plotly.graph_objects as go
import dash_bootstrap_components as dbc
from dash import html, dcc, dash_table
from typing import Any, Dict, List


def make_midb_sankey_figure(distribution: Dict[str, float]) -> go.Figure:
    """
    Construct an authentic, publication-styled Plotly Sankey diagram displaying
    the crystallographic system and 2D monolayer distribution from MIDb.
    """
    labels = [
        "MIDb 2D Carbon Materials",    # 0
        "Hexagonal (59.2%)",            # 1
        "Triclinic (23.5%)",            # 2
        "Monoclinic (8.6%)",            # 3
        "Orthorhombic (8.7%)",          # 4
        "Graphane Vacancy Phases",      # 5
        "Moiré TMD Heterostructures",   # 6
    ]

    source = [0, 0, 0, 0, 1, 1, 2]
    target = [1, 2, 3, 4, 5, 6, 6]
    values = [59.2, 23.5, 8.6, 8.7, 20.0, 39.2, 23.5]

    colors_node = [
        "#00d2be",  # Root: Cyan
        "#0984e3",  # Hexagonal: Blue
        "#e17055",  # Triclinic: Terracotta
        "#fdcb6e",  # Monoclinic: Amber
        "#6c5ce7",  # Orthorhombic: Purple
        "#00b894",  # Graphane: Mint Green
        "#e84393",  # Heterostructures: Rose
    ]

    fig = go.Figure(
        data=[
            go.Sankey(
                node=dict(
                    pad=18,
                    thickness=24,
                    line=dict(color="#1a1e24", width=1),
                    label=labels,
                    color=colors_node,
                    hovertemplate="<b>%{label}</b><br>Share: %{value:.1f}%<extra></extra>",
                ),
                link=dict(
                    source=source,
                    target=target,
                    value=values,
                    color=[
                        "rgba(9, 132, 227, 0.35)",
                        "rgba(225, 112, 85, 0.35)",
                        "rgba(253, 203, 110, 0.35)",
                        "rgba(108, 92, 231, 0.35)",
                        "rgba(0, 184, 148, 0.35)",
                        "rgba(232, 67, 147, 0.35)",
                        "rgba(232, 67, 147, 0.35)",
                    ],
                ),
            )
        ]
    )

    fig.update_layout(
        title=dict(
            text="<b>2D Carbon Crystallographic Symmetry Flow (MIDb Cloud Taxonomy)</b>",
            x=0.03,
            y=0.96,
            font=dict(family="Inter, -apple-system, sans-serif", size=14, color="#f8fafc"),
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, -apple-system, sans-serif", size=12, color="#94a3b8"),
        height=320,
        margin=dict(l=20, r=20, t=45, b=20),
    )
    return fig


def render_midb_dashboard(midb_records: List[Dict[str, Any]], distribution: Dict[str, float]) -> html.Div:
    """Render the full MIDb 2D intelligence panel."""
    sankey_fig = make_midb_sankey_figure(distribution)

    return html.Div(
        [
            # Header card
            dbc.Card(
                dbc.CardBody(
                    [
                        dbc.Row(
                            [
                                dbc.Col(
                                    [
                                        html.H5(
                                            [
                                                html.I(className="bi bi-globe2 me-2 text-info"),
                                                "MIDb Cloud 2D Carbon & Heterostructure Intelligence",
                                            ],
                                            className="fw-bold text-light mb-1",
                                        ),
                                        html.P(
                                            "Harvested from Materials Informatics Database (https://midb.cloud). "
                                            "Features vacancy-induced topological quantum phases in graphane and "
                                            "twisted moiré graphene heterostructures with transition metal dichalcogenides (WS₂, TiS₂, TaS₂, MoSe₂, ReS₂, NbS₂).",
                                            className="text-secondary small mb-0",
                                        ),
                                    ],
                                    md=9,
                                ),
                                dbc.Col(
                                    html.Div(
                                        [
                                            html.A(
                                                [
                                                    html.I(className="bi bi-box-arrow-up-right me-1"),
                                                    "Visit MIDb Cloud",
                                                ],
                                                href="https://midb.cloud/search?show_pt=no&query=(elements==all([%27C%27]))",
                                                target="_blank",
                                                className="btn btn-ghost-dark btn-sm fw-semibold",
                                            ),
                                        ],
                                        className="text-md-end mt-2 mt-md-0",
                                    ),
                                    md=3,
                                ),
                            ],
                            align="center",
                        )
                    ]
                ),
                className="mb-4",
            ),
            # Sankey Diagram + Key Stats
            dbc.Row(
                [
                    dbc.Col(
                        dbc.Card(
                            [
                                dbc.CardHeader(
                                    html.Div(
                                        [
                                            html.I(className="bi bi-diagram-3 me-2 text-info"),
                                            html.Span(
                                                "2D Crystal System Distribution (Sankey Flow)",
                                                className="fw-bold text-light",
                                            ),
                                        ],
                                        className="d-flex align-items-center",
                                    ),
                                    className="py-2",
                                ),
                                dbc.CardBody(
                                    [
                                        dcc.Graph(
                                            id="midb_sankey_graph",
                                            figure=sankey_fig,
                                            config={"displayModeBar": False},
                                        ),
                                    ],
                                    className="p-2",
                                ),
                            ],
                            className="h-100",
                        ),
                        md=7,
                    ),
                    dbc.Col(
                        dbc.Card(
                            [
                                dbc.CardHeader(
                                    html.Div(
                                        [
                                            html.I(className="bi bi-journal-bookmark me-2 text-warning"),
                                            html.Span(
                                                "Benchmark Datasets in MIDb",
                                                className="fw-bold text-light",
                                            ),
                                        ],
                                        className="d-flex align-items-center",
                                    ),
                                    className="py-2",
                                ),
                                dbc.CardBody(
                                    [
                                        html.Div(
                                            [
                                                html.H6(
                                                    "1. Vacancy-Induced Quantum Phases",
                                                    className="text-info fw-bold mb-1",
                                                ),
                                                html.P(
                                                    "E. Victor Caires Lopes, F. Crasto de Lima, C. Lewenkopf, A. Fazzio (arXiv:2603.17122). "
                                                    "Fully relaxed graphane monolayers with single and double sub-lattice vacancies exhibiting topological quantum boundary states.",
                                                    className="text-secondary small mb-2",
                                                ),
                                                html.Div(
                                                    [
                                                        html.Span("C₃₂H₃₁ (v0)", className="badge badge-subtle-secondary me-1"),
                                                        html.Span("C₃₁H₃₂ (v2)", className="badge badge-subtle-secondary me-1"),
                                                        html.Span("Space Group: P3m1", className="badge badge-subtle-info"),
                                                    ]
                                                ),
                                            ],
                                            className="metric-tile mb-3",
                                        ),
                                        html.Div(
                                            [
                                                html.H6(
                                                    "2. Twisted Moiré Graphene / TMD Heterostructures",
                                                    className="text-warning fw-bold mb-1",
                                                ),
                                                html.P(
                                                    "Commensurate moiré supercells pairing graphene with 2D semiconductors "
                                                    "and superconductors (WS₂, TiS₂, TaS₂, MoSe₂, ReS₂, NbS₂).",
                                                    className="text-secondary small mb-2",
                                                ),
                                                html.Div(
                                                    [
                                                        html.Span("W₇C₂₄S₁₄", className="badge badge-subtle-primary me-1"),
                                                        html.Span("Ti₇C₂₆S₁₄", className="badge badge-subtle-primary me-1"),
                                                        html.Span("Ta₇C₂₆S₁₄", className="badge badge-subtle-primary me-1"),
                                                        html.Span("Mo₇C₂₄Se₁₄", className="badge badge-subtle-primary me-1"),
                                                    ]
                                                ),
                                            ],
                                            className="metric-tile",
                                        ),
                                    ],
                                    className="p-3",
                                ),
                            ],
                            className="h-100",
                        ),
                        md=5,
                    ),
                ],
                className="mb-4 g-3",
            ),
            # MIDb Table
            dbc.Card(
                [
                    dbc.CardHeader(
                        html.Div(
                            [
                                html.I(className="bi bi-table me-2 text-info"),
                                html.Span(
                                    "Harvested MIDb 2D Structures Catalog",
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
                                id="midb_datatable",
                                columns=[
                                    {"name": "Structure Name", "id": "name"},
                                    {"name": "Formula", "id": "formula"},
                                    {"name": "Space Group", "id": "space_group"},
                                    {"name": "Lattice Type", "id": "lattice_type"},
                                    {"name": "Sites", "id": "sites", "type": "numeric"},
                                    {
                                        "name": "E / atom (eV)",
                                        "id": "final_energy_per_atom",
                                        "type": "numeric",
                                        "format": {"specifier": ".3f"},
                                    },
                                    {
                                        "name": "Fermi (eV)",
                                        "id": "fermi_level",
                                        "type": "numeric",
                                        "format": {"specifier": ".3f"},
                                    },
                                    {"name": "Category", "id": "category"},
                                    {"name": "MIDb Entry Link", "id": "midb_url"},
                                ],
                                data=midb_records,
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
                                        "if": {"column_id": "final_energy_per_atom"},
                                        "color": "#f1c40f",
                                        "fontWeight": "bold",
                                    },
                                    {
                                        "if": {"column_id": "space_group"},
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
        ]
    )
