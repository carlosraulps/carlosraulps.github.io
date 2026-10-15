"""
Interactive 2D Ball-and-Stick Lattice & Wallpaper Symmetry Overlay Visualizer.

Provides crystallographic symmetry overlays for 2D carbon monolayers
directly onto periodic ball-and-stick networks with Times New Roman typography.
"""

from __future__ import annotations
import numpy as np
import plotly.graph_objects as go
from pymatgen.core import Structure


def make_wallpaper_symmetry_figure(
    struct: Structure,
    item: dict,
    supercell: tuple[int, int] = (2, 2),
    theme: str = "dark",
) -> go.Figure:
    """
    Construct an interactive Plotly figure projecting the 2D allotrope onto
    the xy-plane with carbon atoms, covalent C-C bonds, unit cell boundary,
    and overlaid wallpaper space group symmetry elements (rotation centers,
    reflection lines, glide reflection planes) with dynamic light/dark theming.
    """
    wp_group = item.get("wallpaper_group", "p1")
    wp_num = item.get("wallpaper_number", 1)
    wp_pg = item.get("wallpaper_point_group", "1 (C1)")
    allotrope_name = item.get("name", "Carbon Allotrope")

    lat = struct.lattice
    a_vec = lat.matrix[0][:2]
    b_vec = lat.matrix[1][:2]

    # Create supercell for continuous periodic tiling
    sc = struct.copy()
    sc.make_supercell([supercell[0], supercell[1], 1])

    is_light = (theme == "light")
    fig = go.Figure()

    # 1. Chemical Bonds (C–C, C–H, M–S/Se)
    nl = sc.get_all_neighbors(r=2.65)
    bx, by = [], []
    seen_bonds = set()
    for i, neighbors in enumerate(nl):
        for n in neighbors:
            j = n.index
            pair = tuple(sorted([i, j]))
            dist = n.nn_distance
            if pair not in seen_bonds and 1.05 <= dist <= 2.60:
                seen_bonds.add(pair)
                p1 = sc[i].coords[:2]
                p2 = n.coords[:2]
                bx.extend([p1[0], p2[0], None])
                by.extend([p1[1], p2[1], None])

    fig.add_trace(
        go.Scatter(
            x=bx,
            y=by,
            mode="lines",
            line=dict(color="#57606f" if is_light else "#718093", width=2.2),
            name="Chemical Bonds",
            hoverinfo="skip",
        )
    )

    # 2. Atomic Sites (Grouped by Chemical Element)
    coords = np.array([site.coords[:2] for site in sc.sites])
    element_styles = {
        "C": {"color": "#2f3640" if is_light else "#1e272e", "line": "#0d9488" if is_light else "#00d2be", "size": 13, "label": "Carbon (C)"},
        "H": {"color": "#636e72" if is_light else "#e2e8f0", "line": "#b2bec3" if is_light else "#718093", "size": 8, "label": "Hydrogen (H)"},
        "W": {"color": "#2980b9" if is_light else "#3498db", "line": "#ffffff", "size": 16, "label": "Tungsten (W)"},
        "Ti": {"color": "#8e44ad" if is_light else "#9b59b6", "line": "#ffffff", "size": 15, "label": "Titanium (Ti)"},
        "Ta": {"color": "#d35400" if is_light else "#e67e22", "line": "#ffffff", "size": 16, "label": "Tantalum (Ta)"},
        "Mo": {"color": "#16a085" if is_light else "#1abc9c", "line": "#ffffff", "size": 15, "label": "Molybdenum (Mo)"},
        "Re": {"color": "#c0392b" if is_light else "#d35400", "line": "#ffffff", "size": 15, "label": "Rhenium (Re)"},
        "Nb": {"color": "#8e44ad", "line": "#ffffff", "size": 15, "label": "Niobium (Nb)"},
        "S": {"color": "#f39c12" if is_light else "#f1c40f", "line": "#d35400", "size": 13, "label": "Sulfur (S)"},
        "Se": {"color": "#c0392b" if is_light else "#e74c3c", "line": "#962d22" if is_light else "#c0392b", "size": 14, "label": "Selenium (Se)"},
    }

    species_list = sorted(list({site.specie.symbol for site in sc.sites}))
    for sp in species_list:
        sub_indices = [i for i, s in enumerate(sc.sites) if s.specie.symbol == sp]
        sub_coords = np.array([sc[i].coords[:2] for i in sub_indices])
        sub_fracs = np.array([sc[i].frac_coords[:2] for i in sub_indices])
        style = element_styles.get(sp, {"color": "#95a5a6", "line": "#ffffff", "size": 12, "label": sp})
        hover_texts = [
            f"<b>{style['label']} #{idx+1}</b><br>Cartesian: ({r[0]:.3f}, {r[1]:.3f}) Å<br>Lattice Frac: ({f[0]:.3f}, {f[1]:.3f})"
            for idx, (r, f) in zip(sub_indices, zip(sub_coords, sub_fracs))
        ]
        fig.add_trace(
            go.Scatter(
                x=sub_coords[:, 0],
                y=sub_coords[:, 1],
                mode="markers",
                marker=dict(
                    size=style["size"],
                    color=style["color"],
                    line=dict(color=style["line"], width=1.8),
                ),
                name=style["label"],
                hoverinfo="text",
                hovertext=hover_texts,
            )
        )

    # 3. Primitive 1x1 Unit Cell Boundary
    poly_x = [0, a_vec[0], a_vec[0] + b_vec[0], b_vec[0], 0]
    poly_y = [0, a_vec[1], a_vec[1] + b_vec[1], b_vec[1], 0]
    fig.add_trace(
        go.Scatter(
            x=poly_x,
            y=poly_y,
            mode="lines",
            line=dict(color="#00d2be", width=3.0, dash="solid"),
            name="Primitive 1×1 Unit Cell",
            hoverinfo="name",
        )
    )

    # 4. Symmetry Elements Overlays (calculated in fractional coordinates across supercell)
    def frac_to_cart(u: float, v: float) -> np.ndarray:
        return u * a_vec + v * b_vec

    c6_pts: list[np.ndarray] = []
    c4_pts: list[np.ndarray] = []
    c3_pts: list[np.ndarray] = []
    c2_pts: list[np.ndarray] = []
    mirror_lines_x: list[float | None] = []
    mirror_lines_y: list[float | None] = []
    glide_lines_x: list[float | None] = []
    glide_lines_y: list[float | None] = []

    nx, ny = supercell

    if wp_group == "p6mm":
        # 6-fold rotation centers at cell vertices and hexagon centers
        for i in range(nx + 1):
            for j in range(ny + 1):
                c6_pts.append(frac_to_cart(i, j))
        # 3-fold rotation centers
        for i in range(nx):
            for j in range(ny):
                c3_pts.append(frac_to_cart(i + 1 / 3, j + 2 / 3))
                c3_pts.append(frac_to_cart(i + 2 / 3, j + 1 / 3))
        # 2-fold rotation centers at bond midpoints
        for i in range(nx):
            for j in range(ny):
                c2_pts.append(frac_to_cart(i + 0.5, j))
                c2_pts.append(frac_to_cart(i, j + 0.5))
                c2_pts.append(frac_to_cart(i + 0.5, j + 0.5))
        # Mirror lines along a, b, and diagonals
        for i in range(nx + 1):
            p1 = frac_to_cart(i, 0)
            p2 = frac_to_cart(i, ny)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])
        for j in range(ny + 1):
            p1 = frac_to_cart(0, j)
            p2 = frac_to_cart(nx, j)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])
        for d in range(-ny, nx + 1):
            p1 = frac_to_cart(max(0, d), max(0, -d))
            p2 = frac_to_cart(min(nx, nx + d), min(ny, ny - d))
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])

    elif wp_group in ["pmm", "cmm"]:
        # Rectangular / Centered Rectangular mirrors along axes and half-steps
        u_steps = [k * 0.5 for k in range(int(nx * 2) + 1)]
        v_steps = [k * 0.5 for k in range(int(ny * 2) + 1)]
        for u in u_steps:
            p1 = frac_to_cart(u, 0)
            p2 = frac_to_cart(u, ny)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])
        for v in v_steps:
            p1 = frac_to_cart(0, v)
            p2 = frac_to_cart(nx, v)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])
        for u in u_steps:
            for v in v_steps:
                c2_pts.append(frac_to_cart(u, v))
        if wp_group == "cmm":
            # Diagonal glide reflection lines
            for offset in [-1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0]:
                p1 = frac_to_cart(max(0.0, offset), max(0.0, -offset))
                p2 = frac_to_cart(min(float(nx), float(nx) + offset), min(float(ny), float(ny) - offset))
                glide_lines_x.extend([p1[0], p2[0], None])
                glide_lines_y.extend([p1[1], p2[1], None])

    elif wp_group == "pmg":
        # Mirror lines along u = 0, 0.5, 1.0, 1.5, 2.0
        u_steps = [k * 0.5 for k in range(int(nx * 2) + 1)]
        for u in u_steps:
            p1 = frac_to_cart(u, 0)
            p2 = frac_to_cart(u, ny)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])
        # Glide lines along v = 0.25, 0.75, 1.25, 1.75
        v_glides = [0.25 + k * 0.5 for k in range(int(ny * 2))]
        for v in v_glides:
            p1 = frac_to_cart(0, v)
            p2 = frac_to_cart(nx, v)
            glide_lines_x.extend([p1[0], p2[0], None])
            glide_lines_y.extend([p1[1], p2[1], None])
        for u in [0.25 + k * 0.5 for k in range(int(nx * 2))]:
            for v in v_glides:
                c2_pts.append(frac_to_cart(u, v))

    elif wp_group in ["p4mm", "p4gm"]:
        # 4-fold rotations at cell vertices and cell centers
        for i in range(nx + 1):
            for j in range(ny + 1):
                c4_pts.append(frac_to_cart(i, j))
        for i in range(nx):
            for j in range(ny):
                c4_pts.append(frac_to_cart(i + 0.5, j + 0.5))
                c2_pts.append(frac_to_cart(i + 0.5, j))
                c2_pts.append(frac_to_cart(i, j + 0.5))
        u_steps = [k * 0.5 for k in range(int(nx * 2) + 1)]
        for u in u_steps:
            p1 = frac_to_cart(u, 0)
            p2 = frac_to_cart(u, ny)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])
            p1 = frac_to_cart(0, u)
            p2 = frac_to_cart(nx, u)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])

    elif wp_group in ["p3m1", "p31m"]:
        # 3-fold rotations
        for i in range(nx + 1):
            for j in range(ny + 1):
                c3_pts.append(frac_to_cart(i, j))
        for i in range(nx):
            for j in range(ny):
                c3_pts.append(frac_to_cart(i + 1 / 3, j + 2 / 3))
                c3_pts.append(frac_to_cart(i + 2 / 3, j + 1 / 3))
        # Mirror lines
        for i in range(nx + 1):
            p1 = frac_to_cart(i, 0)
            p2 = frac_to_cart(i, ny)
            mirror_lines_x.extend([p1[0], p2[0], None])
            mirror_lines_y.extend([p1[1], p2[1], None])

    elif wp_group == "p2":
        # 2-fold rotations only
        for u in [k * 0.5 for k in range(int(nx * 2) + 1)]:
            for v in [k * 0.5 for k in range(int(ny * 2) + 1)]:
                c2_pts.append(frac_to_cart(u, v))

    # Add Mirror Lines
    if mirror_lines_x:
        fig.add_trace(
            go.Scatter(
                x=mirror_lines_x,
                y=mirror_lines_y,
                mode="lines",
                line=dict(color="#00cec9", width=1.8, dash="dash"),
                name="Mirror Reflection Lines (m)",
                hoverinfo="name",
            )
        )

    # Add Glide Lines
    if glide_lines_x:
        fig.add_trace(
            go.Scatter(
                x=glide_lines_x,
                y=glide_lines_y,
                mode="lines",
                line=dict(color="#fdcb6e", width=1.8, dash="dot"),
                name="Glide Reflection Lines (g)",
                hoverinfo="name",
            )
        )

    # Add C6 Rotation Centers
    if c6_pts:
        c6_arr = np.array(c6_pts)
        fig.add_trace(
            go.Scatter(
                x=c6_arr[:, 0],
                y=c6_arr[:, 1],
                mode="markers",
                marker=dict(
                    symbol="hexagon",
                    size=13,
                    color="#e056fd",
                    line=dict(color="#ffffff", width=1.2),
                ),
                name="C₆ 6-Fold Rotation (6)",
                hoverinfo="name",
            )
        )

    # Add C4 Rotation Centers
    if c4_pts:
        c4_arr = np.array(c4_pts)
        fig.add_trace(
            go.Scatter(
                x=c4_arr[:, 0],
                y=c4_arr[:, 1],
                mode="markers",
                marker=dict(
                    symbol="square",
                    size=11,
                    color="#ff4757",
                    line=dict(color="#ffffff", width=1.2),
                ),
                name="C₄ 4-Fold Rotation (4)",
                hoverinfo="name",
            )
        )

    # Add C3 Rotation Centers
    if c3_pts:
        c3_arr = np.array(c3_pts)
        fig.add_trace(
            go.Scatter(
                x=c3_arr[:, 0],
                y=c3_arr[:, 1],
                mode="markers",
                marker=dict(
                    symbol="triangle-up",
                    size=12,
                    color="#2ed573",
                    line=dict(color="#ffffff", width=1.2),
                ),
                name="C₃ 3-Fold Rotation (3)",
                hoverinfo="name",
            )
        )

    # Add C2 Rotation Centers
    if c2_pts:
        c2_arr = np.array(c2_pts)
        fig.add_trace(
            go.Scatter(
                x=c2_arr[:, 0],
                y=c2_arr[:, 1],
                mode="markers",
                marker=dict(
                    symbol="diamond",
                    size=10,
                    color="#e67e22",
                    line=dict(color="#ffffff", width=1.0),
                ),
                name="C₂ 2-Fold Rotation (2)",
                hoverinfo="name",
            )
        )

    # Calculate tight bounding box with margin
    all_x = list(coords[:, 0]) + [0, a_vec[0], a_vec[0] + b_vec[0], b_vec[0]]
    all_y = list(coords[:, 1]) + [0, a_vec[1], a_vec[1] + b_vec[1], b_vec[1]]
    min_x, max_x = min(all_x) - 1.0, max(all_x) + 1.0
    min_y, max_y = min(all_y) - 1.0, max(all_y) + 1.0

    text_color = "#1d1d1f" if is_light else "#f0f0f0"
    title_color = "#0d9488" if is_light else "#00d2be"
    grid_color = "rgba(0, 0, 0, 0.08)" if is_light else "rgba(255, 255, 255, 0.08)"
    legend_bg = "rgba(255, 255, 255, 0.92)" if is_light else "rgba(20, 20, 20, 0.90)"
    legend_border = "#e5e5ea" if is_light else "#3d3d3d"

    fig.update_layout(
        template="plotly_white" if is_light else "plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(
            family="Times New Roman",
            size=13,
            color=text_color,
        ),
        title=dict(
            text=f"<b>2D Ball-and-Stick Model & Wallpaper Symmetry Overlay: {wp_group} (Plane Group #{wp_num})</b>",
            font=dict(family="Times New Roman", size=15, color=title_color),
            x=0.03,
            y=0.97,
        ),
        xaxis=dict(
            title=dict(text="Crystallographic x (Å)", font=dict(family="Times New Roman", size=13, color=text_color)),
            showgrid=True,
            gridcolor=grid_color,
            zeroline=False,
            range=[min_x, max_x],
            scaleanchor="y",
            scaleratio=1,
            tickfont=dict(family="Times New Roman", size=12, color=text_color),
        ),
        yaxis=dict(
            title=dict(text="Crystallographic y (Å)", font=dict(family="Times New Roman", size=13, color=text_color)),
            showgrid=True,
            gridcolor=grid_color,
            zeroline=False,
            range=[min_y, max_y],
            tickfont=dict(family="Times New Roman", size=12, color=text_color),
        ),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="center",
            x=0.5,
            bgcolor=legend_bg,
            bordercolor=legend_border,
            borderwidth=1,
            font=dict(family="Times New Roman", size=11, color=text_color),
        ),
        margin=dict(l=45, r=25, t=85, b=45),
        height=485,
    )

    return fig
