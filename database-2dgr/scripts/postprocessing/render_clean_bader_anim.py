#!/usr/bin/env python3
"""
render_clean_bader_anim.py
==========================
Generates publication-grade smooth animated GIFs of the Net Bader Charge Redistribution
and Site-Resolved Charge Tuning for PHOTH-Graphene with clean titles (no redundant repetitive headers):
- Loop: 0% -> +1% -> +2% -> +3% -> +2% -> +1% -> 0% -> -1% -> -2% -> -3% -> -2% -> -1% -> 0%
- Modes:
  1. Biaxial Breathing Mode (eps_xx = eps_yy)
  2. Uniaxial X Mode (Armchair, eps_xx, eps_yy = 0)
  3. Uniaxial Y Mode (Zigzag, eps_yy, eps_xx = 0)
"""

import sys
import io
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.interpolate import CubicSpline

warnings.filterwarnings("ignore")

try:
    from pymatgen.core import Structure
except ImportError:
    print("pymatgen required. Please run with ~/venvs/research/bin/python3")
    sys.exit(1)

STRAIN_DIR = Path("/Volumes/KingstonSSD/Krojects/Kresearch/photh-gr/04_strain_analysis")
OUT_DIR = Path("/Volumes/KingstonSSD/Krojects/Kresearch/2d-carbon-explorer/frontend/public/calculations/photh")
CSV_PATH = STRAIN_DIR / "bader_strained_summary.csv"

SITE_NAMES = [
    r"$\mathrm{C}_1^{(1)}$", r"$\mathrm{C}_2^{(2)}$", r"$\mathrm{C}_2^{(3)}$",
    r"$\mathrm{C}_3^{(4)}$", r"$\mathrm{C}_3^{(5)}$", r"$\mathrm{C}_4^{(6)}$",
    r"$\mathrm{C}_4^{(7)}$", r"$\mathrm{C}_5^{(8)}$", r"$\mathrm{C}_5^{(9)}$",
    r"$\mathrm{C}_6^{(10)}$"
]

WYCKOFF_SITES = ["C1", "C2", "C3", "C4", "C5", "C6"]
WYCKOFF_LABELS = {
    "C1": r"$\mathrm{C}_1$ (5-8-8 junc)",
    "C2": r"$\mathrm{C}_2$ (5-6-8 junc)",
    "C3": r"$\mathrm{C}_3$ (5-6-7 junc)",
    "C4": r"$\mathrm{C}_4$ (4-6-7 junc)",
    "C5": r"$\mathrm{C}_5$ (4-7-8 junc, HER)",
    "C6": r"$\mathrm{C}_6$ (7-8-8 bridge)",
}
WYCKOFF_COLORS = {
    "C1": "#1f77b4",
    "C2": "#ff7f0e",
    "C3": "#2ca02c",
    "C4": "#9467bd",
    "C5": "#d62728",
    "C6": "#8c564b",
}


def load_all_bader_data():
    """Loads all 19 strain states, structures, atomic charges, and Wyckoff averages."""
    df = pd.read_csv(CSV_PATH)

    data = {}
    for case_name, grp in df.groupby("Case"):
        sorted_grp = grp.sort_values("Atom_Index")
        atomic_charges = sorted_grp["Bader_Net_Charge_e"].values
        wyckoff_avg = grp.groupby("Wyckoff_Site")["Bader_Net_Charge_e"].mean().to_dict()

        poscar_path = STRAIN_DIR / case_name / "POSCAR"
        struct = Structure.from_file(poscar_path)
        a_len = struct.lattice.a
        b_len = struct.lattice.b
        coords = struct.cart_coords[:, :2]

        data[case_name] = {
            "a": a_len,
            "b": b_len,
            "coords": coords,
            "charges": atomic_charges,
            "wyckoff": wyckoff_avg,
        }

    return data


def compute_2d_charge_field(X, Y, coords, charges, a, b, sigma=0.48):
    """Computes periodic 2D Gaussian net Bader charge density field."""
    rho = np.zeros_like(X)
    for (xc, yc), q in zip(coords, charges):
        for dx in [-a, 0.0, a]:
            for dy in [-b, 0.0, b]:
                dist_sq = (X - (xc + dx)) ** 2 + (Y - (yc + dy)) ** 2
                rho += q * np.exp(-dist_sq / (2.0 * sigma ** 2))
    return rho


def render_coupled_frame(a, b, coords, charges, mode_title, curr_eps,
                         splines, eps_grid, q0_dict, levels, cmap, dpi=130):
    """Renders dual-panel frame: 2D Real-Space map (Left) + Dynamic Tuning Curves (Right)."""
    plt.rcParams.update({
        "font.family": "serif",
        "font.serif": ["Times New Roman", "DejaVu Serif"],
        "mathtext.fontset": "stix",
        "font.size": 10,
        "axes.linewidth": 1.2,
        "xtick.direction": "in",
        "ytick.direction": "in",
    })

    fig, (ax_map, ax_tune) = plt.subplots(1, 2, figsize=(13.8, 5.2), dpi=dpi,
                                          gridspec_kw={"width_ratios": [1.25, 1.0], "wspace": 0.28})

    # --- LEFT PANEL: 2D Real Space Map ---
    ngx, ngy = 160, 90
    x_lin = np.linspace(0, a, ngx)
    y_lin = np.linspace(0, b, ngy)
    X, Y = np.meshgrid(x_lin, y_lin, indexing="ij")

    rho_2d = compute_2d_charge_field(X, Y, coords, charges, a, b, sigma=0.48)

    cf = ax_map.contourf(X, Y, rho_2d, levels=levels, cmap=cmap, extend="both")
    cs = ax_map.contour(X, Y, rho_2d, levels=levels[::4], colors="#444444", linewidths=0.55, alpha=0.55)
    ax_map.clabel(cs, inline=True, fontsize=7.0, fmt="%.2f")

    # Connect covalent C-C bonds
    for i in range(len(coords)):
        for j in range(i + 1, len(coords)):
            r_ij = np.linalg.norm(coords[i] - coords[j])
            if r_ij < 1.62:
                ax_map.plot([coords[i, 0], coords[j, 0]], [coords[i, 1], coords[j, 1]],
                            color="#222222", linestyle="-", linewidth=1.9, alpha=0.85, zorder=3)

    # Plot atoms and badges
    for idx, (coord, q, sname) in enumerate(zip(coords, charges, SITE_NAMES)):
        xc, yc = coord[0], coord[1]
        ax_map.plot(xc, yc, "o", color="white", markeredgecolor="black", markeredgewidth=1.3, markersize=8.0, zorder=4)

        q_txt = f"{q:+.2f}e"
        badge_txt = f"{sname}\n{q_txt}"
        ax_map.text(xc, yc + 0.17, badge_txt, fontsize=7.5, fontweight="bold", color="white",
                    ha="center", va="bottom", zorder=5,
                    bbox=dict(boxstyle="round,pad=0.15", facecolor="#111111", alpha=0.65, edgecolor="none"))

    ax_map.set_xlim(0, a)
    ax_map.set_ylim(0, b)
    ax_map.set_aspect("equal")
    ax_map.set_xlabel(r"Lattice Coordinate $x\ (\mathrm{\AA})$", fontsize=10.5)
    ax_map.set_ylabel(r"Lattice Coordinate $y\ (\mathrm{\AA})$", fontsize=10.5)
    ax_map.set_title(r"$\mathbf{(a)}\ \mathrm{Real\text{-}Space\ Net\ Bader\ Charge\ Map}$", fontsize=10.5, pad=8)

    cbar = fig.colorbar(cf, ax=ax_map, pad=0.03, aspect=24)
    cbar.set_label(r"Net Charge Density $q_{\mathrm{net}}\ (e/\mathrm{\AA}^2)$", fontsize=9.5)
    cbar.ax.tick_params(labelsize=8.5)

    # --- RIGHT PANEL: Site-Resolved Charge Tuning Curves ---
    eps_dense = np.linspace(-0.03, 0.03, 200)
    eps_dense_pct = eps_dense * 100

    for site in WYCKOFF_SITES:
        spl = splines[site]
        curve_y = spl(eps_dense)
        color = WYCKOFF_COLORS[site]
        lw = 2.4 if site == "C5" else 1.6
        zorder = 4 if site == "C5" else 2
        ax_tune.plot(eps_dense_pct, curve_y, color=color, lw=lw, label=WYCKOFF_LABELS[site], zorder=zorder)

        # Instantaneous point on the curve
        curr_y = float(spl(curr_eps))
        marker_size = 9.0 if site == "C5" else 6.5
        ax_tune.plot(curr_eps * 100, curr_y, "o", color=color, markeredgecolor="black",
                     markeredgewidth=1.1, markersize=marker_size, zorder=zorder + 2)

    # Synchronized vertical tracking cursor
    ax_tune.axvline(curr_eps * 100, color="#d9534f", linestyle="--", linewidth=1.4, alpha=0.85, zorder=5)
    ax_tune.axhline(0.0, color="#888888", linestyle=":", linewidth=0.8, alpha=0.7)
    ax_tune.axvline(0.0, color="#888888", linestyle=":", linewidth=0.8, alpha=0.5)

    ax_tune.set_xlim(-3.2, 3.2)
    ax_tune.set_ylim(-0.085, 0.085)
    ax_tune.set_xlabel(r"Applied Strain $\varepsilon$ (%)", fontsize=10.5)
    ax_tune.set_ylabel(r"Site Charge Tuning $\Delta q_{\mathrm{net}} = q(\varepsilon) - q(0)\ (e)$", fontsize=10.5)
    ax_tune.set_title(r"$\mathbf{(b)}\ \mathrm{Synchronized\ Wyckoff\ Site\ Tuning\ Curves}$", fontsize=10.5, pad=8)
    ax_tune.grid(True, linestyle=":", alpha=0.55)

    ax_tune.legend(loc="upper right", fontsize=8.0, framealpha=0.92, facecolor="white", edgecolor="#cccccc")

    # Clean Global Single-Line Header (Zero redundant title)
    sign = "+" if curr_eps > 0.0001 else ("-" if curr_eps < -0.0001 else "")
    super_title = rf"{mode_title}: $\varepsilon = {sign}{abs(curr_eps)*100:.1f}\% \quad (a = {a:.3f}\ \mathrm{{\AA}},\ b = {b:.3f}\ \mathrm{{\AA}})$"
    fig.suptitle(super_title, fontsize=11.2, fontweight="bold", y=0.97)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf)


def generate_clean_bader_animation(mode_code: str, mode_title: str, out_name: str,
                                   data: dict, n_subframes: int = 5, dpi: int = 125):
    """Generates clean coupled dual-panel GIF for a given strain mode."""
    loop_sequence = [
        ("Strain_X_+0.00", 0.0),
        (f"Strain_{mode_code}_+0.01", +0.01),
        (f"Strain_{mode_code}_+0.02", +0.02),
        (f"Strain_{mode_code}_+0.03", +0.03),
        (f"Strain_{mode_code}_+0.02", +0.02),
        (f"Strain_{mode_code}_+0.01", +0.01),
        ("Strain_X_+0.00", 0.0),
        (f"Strain_{mode_code}_-0.01", -0.01),
        (f"Strain_{mode_code}_-0.02", -0.02),
        (f"Strain_{mode_code}_-0.03", -0.03),
        (f"Strain_{mode_code}_-0.02", -0.02),
        (f"Strain_{mode_code}_-0.01", -0.01),
        ("Strain_X_+0.00", 0.0),
    ]

    eps_discrete = [-0.03, -0.02, -0.01, 0.00, +0.01, +0.02, +0.03]
    q0_wyckoff = data["Strain_X_+0.00"]["wyckoff"]
    splines = {}
    for s in WYCKOFF_SITES:
        y_pts = []
        for e in eps_discrete:
            cname = "Strain_X_+0.00" if abs(e) < 1e-4 else f"Strain_{mode_code}_{e:+.02f}"
            y_pts.append(data[cname]["wyckoff"][s] - q0_wyckoff[s])
        splines[s] = CubicSpline(eps_discrete, y_pts)

    levels = np.linspace(-0.22, 0.22, 35)
    cmap = "coolwarm"

    frames_coupled = []

    print(f"\n[+] Interpolating {mode_title} ({len(loop_sequence)-1} intervals x {n_subframes} subframes)...")
    for i in range(len(loop_sequence) - 1):
        case_a, eps_a = loop_sequence[i]
        case_b, eps_b = loop_sequence[i + 1]

        d_a = data[case_a]
        d_b = data[case_b]

        for s in range(n_subframes):
            alpha = s / n_subframes
            curr_eps = (1.0 - alpha) * eps_a + alpha * eps_b
            curr_a = (1.0 - alpha) * d_a["a"] + alpha * d_b["a"]
            curr_b = (1.0 - alpha) * d_a["b"] + alpha * d_b["b"]
            curr_coords = (1.0 - alpha) * d_a["coords"] + alpha * d_b["coords"]
            curr_charges = (1.0 - alpha) * d_a["charges"] + alpha * d_b["charges"]

            img_coupled = render_coupled_frame(curr_a, curr_b, curr_coords, curr_charges,
                                               mode_title, curr_eps, splines, eps_discrete,
                                               q0_wyckoff, levels, cmap, dpi=dpi)
            frames_coupled.append(img_coupled)

    out_path = OUT_DIR / out_name
    print(f"Saving {len(frames_coupled)} frames to {out_path}...")
    frames_coupled[0].save(
        out_path,
        save_all=True,
        append_images=frames_coupled[1:],
        duration=66,
        loop=0,
        optimize=True
    )
    print(f"[✓] Saved Clean Bader GIF: {out_path}")


def main():
    print("=" * 70)
    print("GENERATING CLEAN PUBLICATION-GRADE BADER ANIMATIONS")
    print("=" * 70)

    data = load_all_bader_data()
    print(f"Loaded {len(data)} strain cases from {CSV_PATH}")

    # 1. Biaxial Breathing Mode
    generate_clean_bader_animation("Biaxial", "Biaxial Breathing Mode",
                                  "anim_bader_biaxial_breathing.gif", data, n_subframes=5)

    # 2. Uniaxial X Mode (Armchair)
    generate_clean_bader_animation("X", "Uniaxial X (Armchair) Mode",
                                  "anim_bader_uniaxial_x.gif", data, n_subframes=5)

    # 3. Uniaxial Y Mode (Zigzag)
    generate_clean_bader_animation("Y", "Uniaxial Y (Zigzag) Mode",
                                  "anim_bader_uniaxial_y.gif", data, n_subframes=5)


if __name__ == "__main__":
    main()
