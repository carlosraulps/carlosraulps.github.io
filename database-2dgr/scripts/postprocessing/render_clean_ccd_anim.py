#!/usr/bin/env python3
"""
render_clean_ccd_anim.py
========================
Generates publication-quality smooth animated GIFs of the 2D Valence Charge Density (CCD 2D)
transition loops for PHOTH-Graphene under mechanical strain with CLEAN titles (no redundant repetitive headers):
- Biaxial Breathing Mode: 0% -> +1% -> +2% -> +3% -> +2% -> +1% -> 0% -> -1% -> -2% -> -3% -> -2% -> -1% -> 0%
- Uniaxial X (Armchair) Mode: 0% -> +3% -> 0% -> -3% -> 0%
- Uniaxial Y (Zigzag) Mode: 0% -> +3% -> 0% -> -3% -> 0%

Aesthetic Standards:
- Plasma colormap with labeled contour isolines
- Standardized mirror plane z = 0.50 (Cartesian z = 10.0 A)
- Prominent white atomic centers with dark borders and Wyckoff/POSCAR site badges (C_sub^(super))
- Connected covalent C-C bonds
- Clean single-line mathematical header with mode, strain, and instantaneous (a, b) lattice parameters
- Zero internal clunky HUD boxes
"""

import sys
import struct
import io
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.ndimage import zoom
from PIL import Image

BASE_DIR = Path("/Volumes/KingstonSSD/Krojects/Kresearch/photh-gr/06_charge_density_analysis")
BIN_FILE = BASE_DIR / "all_strained_2d_ccd_slices.bin"
OUT_DIR = Path("/Volumes/KingstonSSD/Krojects/Kresearch/2d-carbon-explorer/frontend/public/calculations/photh")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SITE_NAMES = [
    r"$\mathrm{C}_1^{(1)}$", r"$\mathrm{C}_2^{(2)}$", r"$\mathrm{C}_2^{(3)}$",
    r"$\mathrm{C}_3^{(4)}$", r"$\mathrm{C}_3^{(5)}$", r"$\mathrm{C}_4^{(6)}$",
    r"$\mathrm{C}_4^{(7)}$", r"$\mathrm{C}_5^{(8)}$", r"$\mathrm{C}_5^{(9)}$",
    r"$\mathrm{C}_6^{(10)}$"
]


def load_slices_bin(bin_path: Path):
    """Loads standardized 2D slice data from binary cache."""
    data = {}
    with open(bin_path, "rb") as f:
        n_records = struct.unpack("<I", f.read(4))[0]
        for _ in range(n_records):
            name_len = struct.unpack("<I", f.read(4))[0]
            name = f.read(name_len).decode("utf-8")
            a_vec = struct.unpack("<3d", f.read(24))
            b_vec = struct.unpack("<3d", f.read(24))
            c_vec = struct.unpack("<3d", f.read(24))
            natoms = struct.unpack("<I", f.read(4))[0]
            coords = struct.unpack(f"<{3 * natoms}d", f.read(24 * natoms))
            ngx, ngy, ngz, iz = struct.unpack("<4I", f.read(16))
            n_vals = ngx * ngy
            vals = struct.unpack(f"<{n_vals}f", f.read(4 * n_vals))

            arr = np.array(vals, dtype=np.float32).reshape((ngy, ngx)).T

            data[name] = {
                "a_vec": np.array(a_vec),
                "b_vec": np.array(b_vec),
                "c_vec": np.array(c_vec),
                "natoms": natoms,
                "coords": np.array(coords).reshape((natoms, 3)),
                "rho": arr,
                "iz": iz,
            }
    return data


def resample_grid(grid, target_shape=(160, 90)):
    """Resamples 2D slice to uniform shape using cubic spline zoom."""
    factors = (target_shape[0] / grid.shape[0], target_shape[1] / grid.shape[1])
    return zoom(grid, factors, order=3)


def render_single_frame(curr_a, curr_b, curr_rho, curr_coords, mode_title, curr_eps, levels, cmap, dpi=130):
    """Renders a single publication-grade frame with clean single-line header."""
    plt.rcParams.update({
        "font.family": "serif",
        "font.serif": ["Times New Roman", "DejaVu Serif"],
        "mathtext.fontset": "stix",
        "font.size": 10,
        "axes.linewidth": 1.1,
    })

    fig, ax = plt.subplots(figsize=(7.5, 4.8), dpi=dpi)

    ngx, ngy = curr_rho.shape
    x_lin = np.linspace(0, curr_a, ngx)
    y_lin = np.linspace(0, curr_b, ngy)
    X, Y = np.meshgrid(x_lin, y_lin, indexing="ij")

    # Filled contour
    cf = ax.contourf(X, Y, curr_rho, levels=levels, cmap=cmap, extend="both")

    # Overlay isolines
    cs = ax.contour(X, Y, curr_rho, levels=levels[::3], colors="#ffffff", linewidths=0.55, alpha=0.5)
    ax.clabel(cs, inline=True, fontsize=7.0, fmt="%.2f")

    # Connected covalent C-C bonds (cutoff 1.60 A)
    for i in range(len(curr_coords)):
        for j in range(i + 1, len(curr_coords)):
            r_ij = np.linalg.norm(curr_coords[i] - curr_coords[j])
            if r_ij < 1.60:
                ax.plot([curr_coords[i, 0], curr_coords[j, 0]],
                        [curr_coords[i, 1], curr_coords[j, 1]],
                        color="#ffffff", linestyle="-", linewidth=2.0, alpha=0.9, zorder=3)

    # Atomic centers and badges
    for idx, (coord, sname) in enumerate(zip(curr_coords, SITE_NAMES)):
        xc, yc = coord[0], coord[1]
        ax.plot(xc, yc, "o", color="#ffffff", markeredgecolor="#111111", markeredgewidth=1.2, markersize=6.5, zorder=4)

        ax.text(xc, yc + 0.18, sname, fontsize=7.2, fontweight="bold", color="#ffffff",
                ha="center", va="bottom", zorder=5,
                bbox=dict(boxstyle="round,pad=0.15", facecolor="#111111", alpha=0.6, edgecolor="none"))

    ax.set_xlim(0, curr_a)
    ax.set_ylim(0, curr_b)
    ax.set_aspect("equal")

    ax.set_xlabel(r"$x\ (\mathrm{\AA})$", fontsize=11.0)
    ax.set_ylabel(r"$y\ (\mathrm{\AA})$", fontsize=11.0)

    # Clean single-line publication title
    sign = "+" if curr_eps > 0.0001 else ("-" if curr_eps < -0.0001 else "")
    title_clean = rf"{mode_title}: $\varepsilon = {sign}{abs(curr_eps)*100:.1f}\% \quad (a = {curr_a:.3f}\ \mathrm{{\AA}},\ b = {curr_b:.3f}\ \mathrm{{\AA}})$"
    ax.set_title(title_clean, fontsize=10.5, pad=8)

    # Colorbar
    cb = fig.colorbar(cf, ax=ax, orientation="vertical", pad=0.03, aspect=24)
    cb.set_label(r"Electron Density $\rho(\mathbf{r})\ (e/\mathrm{\AA}^3)$", fontsize=10.0, labelpad=8)
    cb.ax.tick_params(labelsize=8.5)

    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf)


def generate_animation_mode(data: dict, mode_prefix: str, mode_title: str, out_gif_name: str, n_subframes: int = 5, dpi: int = 130):
    """Generates a closed-loop animation for a specific strain deformation mode."""
    loop_sequence = [
        ("pristine_00", 0.0),
        (f"{mode_prefix}_+0.01", +0.01),
        (f"{mode_prefix}_+0.02", +0.02),
        (f"{mode_prefix}_+0.03", +0.03),
        (f"{mode_prefix}_+0.02", +0.02),
        (f"{mode_prefix}_+0.01", +0.01),
        ("pristine_00", 0.0),
        (f"{mode_prefix}_-0.01", -0.01),
        (f"{mode_prefix}_-0.02", -0.02),
        (f"{mode_prefix}_-0.03", -0.03),
        (f"{mode_prefix}_-0.02", -0.02),
        (f"{mode_prefix}_-0.01", -0.01),
        ("pristine_00", 0.0),
    ]

    target_shape = (160, 90)
    standardized_cache = {}
    for case, eps in loop_sequence:
        if case not in standardized_cache and case in data:
            item = data[case]
            standardized_cache[case] = {
                "a_len": np.linalg.norm(item["a_vec"]),
                "b_len": np.linalg.norm(item["b_vec"]),
                "coords": item["coords"],
                "rho": resample_grid(item["rho"], target_shape),
                "eps": eps,
            }

    levels = np.linspace(0.05, 2.20, 25)
    cmap = plt.cm.plasma
    frames = []

    print(f"\n[+] Building clean publication frames for {mode_title} ({len(loop_sequence)-1} intervals x {n_subframes} sub-frames)...")

    for i in range(len(loop_sequence) - 1):
        case_a, eps_a = loop_sequence[i]
        case_b, eps_b = loop_sequence[i + 1]

        item_a = standardized_cache[case_a]
        item_b = standardized_cache[case_b]

        for s in range(n_subframes):
            alpha = s / n_subframes
            curr_eps = (1 - alpha) * eps_a + alpha * eps_b
            curr_a = (1 - alpha) * item_a["a_len"] + alpha * item_b["a_len"]
            curr_b = (1 - alpha) * item_a["b_len"] + alpha * item_b["b_len"]
            curr_coords = (1 - alpha) * item_a["coords"] + alpha * item_b["coords"]
            curr_rho = (1 - alpha) * item_a["rho"] + alpha * item_b["rho"]

            img = render_single_frame(curr_a, curr_b, curr_rho, curr_coords, mode_title, curr_eps, levels, cmap, dpi=dpi)
            frames.append(img)

    out_gif = OUT_DIR / out_gif_name
    print(f"Saving {len(frames)} frames to {out_gif} (15 fps)...")
    frames[0].save(
        out_gif,
        save_all=True,
        append_images=frames[1:],
        duration=66,
        loop=0,
        optimize=True
    )
    print(f"[✓] Saved Clean Animated GIF: {out_gif}")


def main():
    print("=" * 70)
    print("GENERATING CLEAN PUBLICATION-GRADE 2D CHARGE DENSITY ANIMATIONS")
    print("=" * 70)

    if not BIN_FILE.exists():
        print(f"Error: {BIN_FILE} not found!")
        sys.exit(1)

    data = load_slices_bin(BIN_FILE)
    print(f"Loaded {len(data)} standardized 2D slices from {BIN_FILE.name}")

    # 1. Biaxial Breathing Mode
    generate_animation_mode(
        data,
        mode_prefix="biaxial",
        mode_title="Biaxial Breathing Mode",
        out_gif_name="anim_ccd_biaxial_breathing.gif",
        n_subframes=5,
        dpi=130
    )

    # 2. Uniaxial X Mode (Armchair)
    generate_animation_mode(
        data,
        mode_prefix="uniaxial_x",
        mode_title="Uniaxial X (Armchair) Mode",
        out_gif_name="anim_ccd_uniaxial_x.gif",
        n_subframes=5,
        dpi=130
    )

    # 3. Uniaxial Y Mode (Zigzag)
    generate_animation_mode(
        data,
        mode_prefix="uniaxial_y",
        mode_title="Uniaxial Y (Zigzag) Mode",
        out_gif_name="anim_ccd_uniaxial_y.gif",
        n_subframes=5,
        dpi=130
    )


if __name__ == "__main__":
    main()
