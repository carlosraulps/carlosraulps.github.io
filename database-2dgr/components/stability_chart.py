"""
Thermodynamic Stability Landscape Chart for 2D Carbon Explorer.

Renders relative energetics ΔE anchored to pristine graphene (0.000 eV/atom)
and the biphenylene network synthesis benchmark (0.456 eV/atom) with collision-free
Times New Roman typography.
"""

from __future__ import annotations
import pandas as pd
import plotly.graph_objects as go


def make_enhanced_stability_chart(
    allotropes: list[dict],
    selected_id: str = "graphene",
    filter_mode: str = "accessible",
    theme: str = "dark",
) -> go.Figure:
    """
    Generate an interactive Plotly bar chart displaying the thermodynamic
    stability landscape of 2D carbon allotropes with dynamic light/dark theming.

    Parameters:
    -----------
    allotropes : list[dict]
        List of allotrope catalog dictionaries.
    selected_id : str
        ID of currently selected allotrope for dynamic highlighting.
    filter_mode : str
        'accessible' (ΔE <= 0.456 eV/atom), 'featured', or 'all'.
    theme : str
        'dark' or 'light'
    """
    df = pd.DataFrame(allotropes)
    df["delta_e_ev"] = pd.to_numeric(df["delta_e_ev"], errors="coerce").fillna(0.0)

    # Filter according to mode
    if filter_mode == "accessible":
        df = df[df["delta_e_ev"] <= 0.460].copy()
    elif filter_mode == "featured":
        df = df[df.get("featured", True)].copy()

    df = df.sort_values("delta_e_ev", ascending=True).reset_index(drop=True)

    biphenylene_ref = 0.456
    is_light = (theme == "light")

    colors = []
    for _, row in df.iterrows():
        rid = row["id"]
        val = row["delta_e_ev"]
        if rid == selected_id:
            colors.append("#0d9488" if is_light else "#00d2be")  # Selected highlight
        elif rid == "graphene" or val <= 0.001:
            colors.append("#059669" if is_light else "#2ecc71")  # Pristine graphene ground state
        elif val <= biphenylene_ref:
            colors.append("#0284c7" if is_light else "#4a90e2")  # Synthetically accessible window
        else:
            colors.append("#dc2626" if is_light else "#e17055")  # Non-equilibrium regime

    max_energy = df["delta_e_ev"].max() if len(df) > 0 else 0.5
    y_upper = max(0.60, max_energy * 1.15)

    n_bars = len(df)
    show_outside_text = n_bars <= 25

    bar_text = [
        f"{val:.3f}" if show_outside_text else ""
        for val in df["delta_e_ev"]
    ]

    x_labels = df["chart_label"] if "chart_label" in df.columns else df["name"]

    hover_text = [
        (
            f"<b>{row.get('display_name', row['name'])}</b> ({row.get('display_symbol', row.get('symbol', 'N/A'))})<br>"
            f"2D Wallpaper Group: <b>{row.get('wallpaper_group', 'p1')} (#{row.get('wallpaper_number', 1)})</b><br>"
            f"3D Space Group: {row.get('space_group', 'P1')}<br>"
            f"Relative Energy Δ<i>E</i>: <b>{row['delta_e_ev']:.3f} eV/atom</b><br>"
            f"Offset Δ<i>E</i> − Δ<i>E</i><sub>biph</sub>: <b>{row['delta_e_ev'] - biphenylene_ref:+.3f} eV/atom</b><br>"
            f"Density ρ: {row.get('density', 0.0):.3f} g/cm³"
        )
        for _, row in df.iterrows()
    ]

    text_color = "#1d1d1f" if is_light else "#f5f6fa"
    title_color = "#0d9488" if is_light else "#00d2be"
    grid_color = "rgba(0, 0, 0, 0.08)" if is_light else "rgba(255, 255, 255, 0.08)"
    border_color = "rgba(0, 0, 0, 0.15)" if is_light else "rgba(255, 255, 255, 0.2)"
    ref_graphene_color = "#059669" if is_light else "#2ecc71"
    ref_biph_color = "#e11d48" if is_light else "#ff7675"

    fig = go.Figure(
        data=[
            go.Bar(
                x=x_labels,
                y=df["delta_e_ev"],
                marker=dict(
                    color=colors,
                    line=dict(color=border_color, width=1),
                ),
                text=bar_text,
                textposition="outside" if show_outside_text else "none",
                textfont=dict(family="'STIX Two Text', 'Times New Roman', serif", size=10, color=text_color),
                hovertext=hover_text,
                hoverinfo="text",
                name="2D Carbon Allotrope",
            )
        ]
    )

    # Pristine Graphene Reference Line (0.000 eV)
    fig.add_hline(
        y=0.000,
        line_dash="solid",
        line_color=ref_graphene_color,
        line_width=2.0,
        annotation_text="Graphene (<i>h</i>6<sub>1</sub>) Ground State: 0.000 eV/atom",
        annotation_position="top left",
        annotation_font=dict(family="'STIX Two Text', 'Times New Roman', serif", size=11, color=ref_graphene_color),
    )

    # Biphenylene Network Synthesized Benchmark (0.456 eV)
    fig.add_hline(
        y=biphenylene_ref,
        line_dash="dash",
        line_color=ref_biph_color,
        line_width=2.0,
        annotation_text="Biphenylene Synth. Benchmark: Δ<i>E</i> = 0.456 eV/atom (Science 372, 852)",
        annotation_position="bottom right",
        annotation_font=dict(family="'STIX Two Text', 'Times New Roman', serif", size=11, color=ref_biph_color),
    )

    fig.update_layout(
        template="plotly_white" if is_light else "plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(
            family="'STIX Two Text', 'Times New Roman', serif",
            size=12,
            color=text_color,
        ),
        title=dict(
            text="<b>Relative DFT Energetics Δ<i>E</i> vs. Pristine Graphene Ground State (0.000 eV/atom)</b>",
            font=dict(family="'STIX Two Text', 'Times New Roman', serif", size=13, color=title_color),
            x=0.02,
            y=0.98,
        ),
        xaxis=dict(
            title=dict(text="2D Carbon Allotropes (Standardized Girão Taxonomy)", font=dict(family="Inter, sans-serif", size=12, color=text_color)),
            tickangle=-45,
            tickfont=dict(family="'STIX Two Text', 'Times New Roman', serif", size=10 if n_bars > 25 else 11, color=text_color),
            showgrid=False,
            categoryorder="total ascending",
        ),
        yaxis=dict(
            title=dict(text="Relative Energy Δ<i>E</i> (eV/atom vs. Graphene)", font=dict(family="Inter, sans-serif", size=12, color=text_color)),
            range=[-0.02, y_upper],
            showgrid=True,
            gridcolor=grid_color,
            tickfont=dict(family="'STIX Two Text', 'Times New Roman', serif", size=11, color=text_color),
        ),
        margin=dict(l=55, r=30, t=35, b=110 if n_bars > 12 else 55),
        height=390,
    )

    return fig
