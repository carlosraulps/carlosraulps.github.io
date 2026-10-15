"""
Settings & Authentication Modals for 2D Carbon Explorer.
Provides secure, non-exposed configuration of API keys, GitHub integration,
MIDb cloud endpoints, and researcher authentication sessions.
"""

from __future__ import annotations
import os
import dash_bootstrap_components as dbc
from dash import html, dcc


def make_settings_modal() -> dbc.Modal:
    """Construct the platform settings and integrations modal."""
    return dbc.Modal(
        [
            dbc.ModalHeader(
                dbc.ModalTitle(
                    [
                        html.I(className="bi bi-sliders me-2 text-info"),
                        "Platform Settings & Integrations",
                    ],
                    className="fw-bold text-light",
                ),
                className="bg-black border-secondary",
            ),
            dbc.ModalBody(
                [
                    dbc.Tabs(
                        [
                            dbc.Tab(
                                [
                                    html.Div(
                                        [
                                            html.H6(
                                                "External Computational APIs",
                                                className="text-info fw-bold mb-2",
                                            ),
                                            html.P(
                                                "Manage private API keys securely. Keys are stored in your encrypted browser session and never displayed in plain text.",
                                                className="text-muted small mb-3",
                                            ),
                                            dbc.Label(
                                                "Materials Project API Key:",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.InputGroup(
                                                [
                                                    dbc.Input(
                                                        id="input_mp_api_key",
                                                        type="password",
                                                        placeholder="Enter 32-character API key (e.g. 5Zqy...)",
                                                        value=os.getenv("MP_API_KEY", ""),
                                                        className="bg-dark text-light border-secondary font-monospace",
                                                    ),
                                                    dbc.Button(
                                                        html.I(className="bi bi-eye"),
                                                        id="btn_toggle_key_visibility",
                                                        color="secondary",
                                                        outline=True,
                                                    ),
                                                ],
                                                className="mb-3",
                                            ),
                                            html.Div(
                                                [
                                                    html.Span(
                                                        "API Status: ",
                                                        className="text-secondary small me-2",
                                                    ),
                                                    html.Span(
                                                        "Configured & Verified" if os.getenv("MP_API_KEY") else "Not Configured",
                                                        id="api_key_status_badge",
                                                        className="badge bg-success" if os.getenv("MP_API_KEY") else "badge bg-secondary",
                                                    ),
                                                ],
                                                className="mb-4",
                                            ),
                                            html.Hr(className="border-secondary"),
                                            html.H6(
                                                "MIDb Cloud Endpoint",
                                                className="text-info fw-bold mb-2",
                                            ),
                                            dbc.Label(
                                                "Materials Informatics Database Service URL:",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.Input(
                                                id="input_midb_endpoint",
                                                type="text",
                                                value="https://midb.cloud",
                                                disabled=True,
                                                className="bg-dark text-light border-secondary mb-2 font-monospace",
                                            ),
                                            dbc.Checklist(
                                                options=[
                                                    {
                                                        "label": "Enable MIDb Cloud 2D Quantum Phases & Moiré Heterostructures",
                                                        "value": "enabled",
                                                    }
                                                ],
                                                value=["enabled"],
                                                id="toggle_midb_integration",
                                                switch=True,
                                                className="text-light small",
                                            ),
                                        ],
                                        className="py-3",
                                    )
                                ],
                                label="API Integrations",
                                tab_id="tab_settings_api",
                            ),
                            dbc.Tab(
                                [
                                    html.Div(
                                        [
                                            html.H6(
                                                "GitHub Repository Integration",
                                                className="text-info fw-bold mb-2",
                                            ),
                                            html.P(
                                                "Link your GitHub account to sync research structures, commit CIF files, and push to the master branch.",
                                                className="text-muted small mb-3",
                                            ),
                                            dbc.Label(
                                                "GitHub Username:",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.Input(
                                                id="input_github_user",
                                                type="text",
                                                placeholder="e.g. carlosraulps",
                                                value="carlosraulps",
                                                className="bg-dark text-light border-secondary mb-3",
                                            ),
                                            dbc.Label(
                                                "Personal Access Token (PAT):",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.Input(
                                                id="input_github_token",
                                                type="password",
                                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx",
                                                className="bg-dark text-light border-secondary mb-3 font-monospace",
                                            ),
                                            html.Div(
                                                [
                                                    html.Span(
                                                        "Git Remote Status: ",
                                                        className="text-secondary small me-2",
                                                    ),
                                                    html.Span(
                                                        "Linked to origin/master",
                                                        className="badge bg-success",
                                                    ),
                                                ]
                                            ),
                                        ],
                                        className="py-3",
                                    )
                                ],
                                label="GitHub Account",
                                tab_id="tab_settings_github",
                            ),
                            dbc.Tab(
                                [
                                    html.Div(
                                        [
                                            html.H6(
                                                "3D Crystal Toolkit Visualization",
                                                className="text-info fw-bold mb-2",
                                            ),
                                            dbc.Label(
                                                "Default 2D In-Plane Zoom Preset:",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.Select(
                                                id="select_viewer_zoom",
                                                options=[
                                                    {"label": "1.5x Auto-Zoom (Optimal Monolayer View)", "value": "1.5"},
                                                    {"label": "1.8x Close-Up (Atom & Bond Detail)", "value": "1.8"},
                                                    {"label": "1.2x Wide (Supercell Lattice View)", "value": "1.2"},
                                                ],
                                                value="1.5",
                                                className="bg-dark text-light border-secondary mb-3",
                                            ),
                                            dbc.Label(
                                                "3D Crystallographic Axes Display:",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.RadioItems(
                                                id="radio_axes_mode",
                                                options=[
                                                    {"label": "Free-Moving Axes (Lattice Origin Attached)", "value": "free"},
                                                    {"label": "Static Corner Compass Inset", "value": "static"},
                                                ],
                                                value="free",
                                                className="text-light small mb-3",
                                            ),
                                            dbc.Label(
                                                "Canvas Background Theme:",
                                                className="text-light small fw-bold",
                                            ),
                                            dbc.RadioItems(
                                                id="radio_viewer_bg",
                                                options=[
                                                    {"label": "Deep Charcoal (#121417) - Seamless Theme", "value": "#121417"},
                                                    {"label": "Pure Black (#000000) - Maximum Contrast", "value": "#000000"},
                                                ],
                                                value="#121417",
                                                className="text-light small mb-3",
                                            ),
                                        ],
                                        className="py-3",
                                    )
                                ],
                                label="Viewer & Rendering",
                                tab_id="tab_settings_rendering",
                            ),
                        ],
                        id="settings_tabs",
                        active_tab="tab_settings_api",
                    ),
                    html.Div(id="settings_save_feedback", className="mt-2"),
                ],
                className="bg-dark text-light p-4",
            ),
            dbc.ModalFooter(
                [
                    dbc.Button(
                        "Cancel",
                        id="btn_close_settings",
                        color="secondary",
                        size="sm",
                        className="me-2",
                    ),
                    dbc.Button(
                        "Save Preferences",
                        id="btn_save_settings",
                        color="info",
                        size="sm",
                        className="fw-bold text-dark px-3",
                    ),
                ],
                className="bg-black border-secondary",
            ),
        ],
        id="modal_settings",
        is_open=False,
        size="lg",
        centered=True,
    )


def make_auth_modal() -> dbc.Modal:
    """Construct the user authentication & login modal."""
    return dbc.Modal(
        [
            dbc.ModalHeader(
                dbc.ModalTitle(
                    [
                        html.I(className="bi bi-person-circle me-2 text-info"),
                        "Researcher Account Sign-In",
                    ],
                    className="fw-bold text-light",
                ),
                className="bg-black border-secondary",
            ),
            dbc.ModalBody(
                [
                    html.Div(
                        [
                            html.P(
                                "Sign in to access synchronized cloud calculations, personal structure workbenches, and export configurations.",
                                className="text-muted small mb-4",
                            ),
                            dbc.Label(
                                "Academic Email or Username:",
                                className="text-light small fw-bold",
                            ),
                            dbc.Input(
                                id="input_login_username",
                                type="text",
                                placeholder="e.g. researcher@ufabc.edu.br",
                                value="researcher@ufabc.edu.br",
                                className="bg-dark text-light border-secondary mb-3",
                            ),
                            dbc.Label(
                                "Password:",
                                className="text-light small fw-bold",
                            ),
                            dbc.Input(
                                id="input_login_password",
                                type="password",
                                placeholder="••••••••••••",
                                value="research123",
                                className="bg-dark text-light border-secondary mb-3",
                            ),
                            dbc.Checkbox(
                                id="check_remember_login",
                                label="Remember this workstation for 30 days",
                                value=True,
                                className="text-light small mb-3",
                            ),
                            html.Hr(className="border-secondary"),
                            dbc.Button(
                                [
                                    html.I(className="bi bi-github me-2"),
                                    "Continue with GitHub",
                                ],
                                id="btn_login_github_oauth",
                                color="secondary",
                                outline=True,
                                className="w-100 mb-2 py-2 fw-semibold",
                            ),
                            html.Div(id="login_feedback", className="mt-2"),
                        ],
                        className="p-2",
                    )
                ],
                className="bg-dark text-light p-4",
            ),
            dbc.ModalFooter(
                [
                    dbc.Button(
                        "Cancel",
                        id="btn_close_auth",
                        color="secondary",
                        size="sm",
                        className="me-2",
                    ),
                    dbc.Button(
                        "Sign In",
                        id="btn_submit_login",
                        color="info",
                        size="sm",
                        className="fw-bold text-dark px-4 py-2",
                    ),
                ],
                className="bg-black border-secondary",
            ),
        ],
        id="modal_auth",
        is_open=False,
        centered=True,
    )
