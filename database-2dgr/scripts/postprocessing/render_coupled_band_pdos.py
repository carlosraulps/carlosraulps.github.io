#!/usr/bin/env python3
"""
render_coupled_band_pdos.py
============================
Native webapp-themed generator for coupled Electronic Band Structure + PDOS animations:
- Panel (a): Electronic Band Structure with C(2p_z) Fat Bands orbital projections
- Panel (b): Projected Density of States (PDOS) with aligned energy axis [-4.0, 4.0] eV
- Colorbar: C(2p_z) orbital character on fixed cax with zero-dilation framing
- Design: Styled with Carbon Atlas Webapp Theme (#f4f2e9 paper, #11362d forest green)
- Continuous subframe spline interpolation (60 frames total, 15 fps, 66 ms/frame)
- Outputs:
  1. anim_band_pdos_coupled_biaxial.gif
  2. anim_band_pdos_coupled_uniaxial_x.gif
  3. anim_band_pdos_coupled_uniaxial_y.gif
  4. fig_band_pdos_coupled_pristine.png (.pdf)
"""

import sys
import io
import argparse
import warnings
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from PIL import Image

# Import local webapp theme
try:
    from webapp_theme import PALETTE, apply_webapp_theme
except ImportError:
    sys.path.append(str(Path(__file__).resolve().parent))
    from webapp_theme import PALETTE, apply_webapp_theme

warnings.filterwarnings("ignore")

try:
    from pymatgen.io.vasp.outputs import Vasprun
except ImportError:
    print("Warning: pymatgen not found in current environment. Run with ~/venvs/research/bin/python3")

E_GRID = np.linspace(-4.5, 4.5, 901)


def parse_doscar(path: Path, e_grid: np.ndarray) -> Optional[dict]:
    """Parses VASP DOSCAR and resamples TDOS, C(pz), and C(px+py) onto a uniform e_grid."""
    if not path.exists():
        return None
    try:
        with open(path) as f:
            lines = [f.readline() for _ in range(6)]
            emax, emin, nedos, ef = (
                float(lines[5].split()[0]),
                float(lines[5].split()[1]),
                int(lines[5].split()[2]),
                float(lines[5].split()[3]),
            )
            tdos_raw = np.array([[float(x) for x in f.readline().split()] for _ in range(nedos)])
            pdos_raw = []
            for _ in range(10):
                f.readline()
                pdos_raw.append(np.array([[float(x) for x in f.readline().split()] for _ in range(nedos)]))

        e_rel = tdos_raw[:, 0] - ef
        tdos_vals = tdos_raw[:, 1]
        all_pz = np.sum([p[:, 3] for p in pdos_raw], axis=0)
        all_pxy = np.sum([p[:, 2] + p[:, 4] for p in pdos_raw], axis=0)

        tdos_interp = np.interp(e_grid, e_rel, tdos_vals)
        pz_interp = np.interp(e_grid, e_rel, all_pz)
        pxy_interp = np.interp(e_grid, e_rel, all_pxy)

        return {
            "ef": ef,
            "tdos": tdos_interp,
            "pz": pz_interp,
            "pxy": pxy_interp,
        }
    except Exception as e:
        print(f"Error parsing DOSCAR {path}: {e}")
        return None


def load_band_data(case_dir: Path) -> Optional[dict]:
    """Parses vasprun.xml for band eigenvalues, k-distances, and C 2p_z orbital projections."""
    xml_path = case_dir / "vasprun.xml"
    kp_path = case_dir / "KPOINTS_BANDS"
    if not kp_path.exists():
        kp_path = case_dir / "KPOINTS"

    if not xml_path.exists() or not kp_path.exists():
        return None

    try:
        vrun = Vasprun(str(xml_path), parse_projected_eigen=True)
        bs = vrun.get_band_structure(kpoints_filename=str(kp_path), line_mode=True)
        ef = bs.efermi
        spin = list(bs.bands.keys())[0]
        energies = bs.bands[spin] - ef
        k_dists = np.array(bs.distance)

        p_raw = vrun.projected_eigenvalues[spin]
        pz = p_raw[:, :, :, 2].sum(axis=2).T

        structure = vrun.final_structure
        a_len = structure.lattice.a
        b_len = structure.lattice.b

        return {
            "energies": energies,
            "k_dists": k_dists,
            "pz": pz,
            "ef": ef,
            "a_len": a_len,
            "b_len": b_len,
        }
    except Exception as e:
        print(f"Error loading {case_dir.name}: {e}")
        return None


def render_coupled_frame(
    mode_title: str,
    curr_eps: float,
    curr_a: float,
    curr_b: float,
    k_dists: np.ndarray,
    energies: np.ndarray,
    pz: np.ndarray,
    curr_dos: dict,
    pristine_dos: dict,
    dpi: int = 140,
    save_path: Optional[Path] = None,
) -> Image.Image:
    """Renders a single high-definition coupled Band+PDOS frame using clean white publication styling."""
    apply_webapp_theme(white_background=True)
    
    fig = plt.figure(figsize=(9.2, 5.8), dpi=dpi, facecolor="white")
    fig.patch.set_facecolor("white")
    gs = gridspec.GridSpec(
        1, 3,
        width_ratios=[1.5, 1.0, 0.045],
        wspace=0.09,
        left=0.08, right=0.92, bottom=0.12, top=0.87
    )

    ax_b = fig.add_subplot(gs[0])
    ax_d = fig.add_subplot(gs[1], sharey=ax_b)
    cax = fig.add_subplot(gs[2])

    ax_b.set_facecolor("white")
    ax_d.set_facecolor("white")
    cax.set_facecolor("white")

    nbands, nkpts = energies.shape

    # --- Panel (a): Band Structure ---
    for b in range(nbands):
        e_b = energies[b]
        if np.any((e_b >= -4.5) & (e_b <= 4.5)):
            ax_b.plot(k_dists, e_b, color="#7d9988", lw=0.6, alpha=0.45, zorder=1)

    k_mesh, e_mesh, pz_mesh = [], [], []
    for b in range(nbands):
        e_b = energies[b]
        pz_b = pz[b]
        for k_idx in range(nkpts):
            val = e_b[k_idx]
            if -4.2 <= val <= 4.2:
                k_mesh.append(k_dists[k_idx])
                e_mesh.append(val)
                pz_mesh.append(pz_b[k_idx])

    k_mesh = np.array(k_mesh)
    e_mesh = np.array(e_mesh)
    pz_mesh = np.array(pz_mesh)

    sc = ax_b.scatter(
        k_mesh, e_mesh, c=pz_mesh,
        s=pz_mesh * 34 + 1.2,
        cmap="summer_r", vmin=0.0, vmax=0.60, alpha=0.95, zorder=2, edgecolors="none"
    )

    cbar = fig.colorbar(sc, cax=cax)
    cbar.set_label(r"Carbon $2p_z$ Projection $(\pi/\pi^*)$", fontsize=9.5, labelpad=8, color=PALETTE["ink"])
    cbar.ax.tick_params(labelsize=8.5, colors=PALETTE["ink"])

    tick_indices = [0, 40, 80, 120, 160, nkpts - 1]
    tick_labels = [r"$\Gamma$", r"$X$", r"$S$", r"$Y$", r"$\Gamma$", r"$S$"]
    custom_ticks = [k_dists[idx] for idx in tick_indices if idx < nkpts]
    custom_labels = [tick_labels[i] for i, idx in enumerate(tick_indices) if idx < nkpts]

    for t in custom_ticks:
        ax_b.axvline(t, color="#b2c7b5", ls="--", lw=0.65, zorder=0)

    ax_b.set_xticks(custom_ticks)
    ax_b.set_xticklabels(custom_labels, fontsize=11.0, color=PALETTE["ink"])
    ax_b.set_xlim(0, k_dists[-1])
    ax_b.set_ylim(-4.0, 4.0)
    ax_b.axhline(0.0, color=PALETTE["fermi"], ls="--", lw=1.1, zorder=0)
    ax_b.set_ylabel(r"$E - E_{\mathrm{F}}\ (\mathrm{eV})$", fontsize=11.0, color=PALETTE["ink"])
    ax_b.set_title(r"$\mathbf{(a)}\ \mathrm{Electronic\ Band\ Structure}\ [\mathrm{C}(2p_z)\ \mathrm{Fat\ Bands}]$",
                   fontsize=10.5, pad=6, color=PALETTE["forest_deep"])
    ax_b.grid(True, ls=":", alpha=0.5, color=PALETTE["grid"])

    # --- Panel (b): PDOS ---
    tdos = curr_dos["tdos"]
    pz_dos = curr_dos["pz"]
    pxy_dos = curr_dos["pxy"]
    tdos0 = pristine_dos["tdos"]

    ax_d.plot(tdos, E_GRID, color=PALETTE["c_total"], lw=1.4, label=r"$\mathrm{Total\ DOS}$")
    ax_d.fill_betweenx(E_GRID, 0, pz_dos, color=PALETTE["c_pz"], alpha=0.35, label=r"$\mathrm{C}(2p_z)\ [\pi/\pi^*]$")
    ax_d.plot(pz_dos, E_GRID, color=PALETTE["c_pz"], lw=1.2)
    ax_d.plot(pxy_dos, E_GRID, color=PALETTE["c_pxy"], lw=1.1, ls="--", label=r"$\mathrm{C}(2p_x + 2p_y)\ [\sigma/\sigma^*]$")
    ax_d.plot(tdos0, E_GRID, color="#8a9e8f", lw=0.9, ls=":", label=r"$\mathrm{Pristine\ Baseline}$")

    ax_d.axhline(0.0, color=PALETTE["fermi"], ls="--", lw=1.1, zorder=0)
    ax_d.set_ylim(-4.0, 4.0)
    ax_d.set_xlim(0, 15.0)
    ax_d.set_xlabel(r"$\mathrm{Density\ of\ States}\ (\mathrm{states/eV})$", fontsize=11.0, color=PALETTE["ink"])
    ax_d.tick_params(labelleft=False)
    ax_d.set_title(r"$\mathbf{(b)}\ \mathrm{Projected\ Density\ of\ States\ (PDOS)}$", fontsize=10.5, pad=6, color=PALETTE["forest_deep"])
    ax_d.legend(loc="upper right", framealpha=0.95, facecolor="white", edgecolor=PALETTE["border"], fontsize=8.5)
    ax_d.grid(True, ls=":", alpha=0.5, color=PALETTE["grid"])

    # Synchronized Clean Title Header (Single-line publication header without repetitive title)
    sign = "+" if curr_eps > 0.0001 else ("-" if curr_eps < -0.0001 else "")
    title_strain = rf"{mode_title}: $\varepsilon = {sign}{abs(curr_eps)*100:.1f}\% \quad (a = {curr_a:.3f}\ \mathrm{{\AA}},\ b = {curr_b:.3f}\ \mathrm{{\AA}})$"
    fig.suptitle(title_strain, fontsize=11.0, fontweight="bold", y=0.965, color=PALETTE["forest_deep"])

    if save_path:
        fig.savefig(save_path, dpi=dpi, bbox_inches="tight", facecolor="white", edgecolor="white")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, facecolor="white", edgecolor="white")
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf)


def generate_coupled_animation(
    calc_dir: Path,
    out_dir: Path,
    mode_prefix: str,
    mode_title: str,
    out_gif_name: str,
    band_cache: dict,
    dos_cache: dict,
    n_subframes: int = 5,
    dpi: int = 130
):
    """Generates continuous fluid cyclic animated GIF of coupled Band+PDOS under strain."""
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

    pristine_dos = dos_cache["pristine_00"]
    frames = []
    print(f"\n[+] Generating {mode_title} ({len(loop_sequence)-1} intervals x {n_subframes} subframes)...")

    for i in range(len(loop_sequence) - 1):
        case_a, eps_a = loop_sequence[i]
        case_b, eps_b = loop_sequence[i + 1]

        data_a = band_cache[case_a]
        data_b = band_cache[case_b]
        dos_a = dos_cache[case_a]
        dos_b = dos_cache[case_b]

        for s in range(n_subframes):
            alpha = s / n_subframes
            curr_eps = (1 - alpha) * eps_a + alpha * eps_b
            curr_a = (1 - alpha) * data_a["a_len"] + alpha * data_b["a_len"]
            curr_b = (1 - alpha) * data_a["b_len"] + alpha * data_b["b_len"]
            curr_k = (1 - alpha) * data_a["k_dists"] + alpha * data_b["k_dists"]
            curr_energies = (1 - alpha) * data_a["energies"] + alpha * data_b["energies"]
            curr_pz = (1 - alpha) * data_a["pz"] + alpha * data_b["pz"]

            curr_dos = {
                "tdos": (1 - alpha) * dos_a["tdos"] + alpha * dos_b["tdos"],
                "pz": (1 - alpha) * dos_a["pz"] + alpha * dos_b["pz"],
                "pxy": (1 - alpha) * dos_a["pxy"] + alpha * dos_b["pxy"],
            }

            img = render_coupled_frame(
                mode_title=mode_title,
                curr_eps=curr_eps,
                curr_a=curr_a,
                curr_b=curr_b,
                k_dists=curr_k,
                energies=curr_energies,
                pz=curr_pz,
                curr_dos=curr_dos,
                pristine_dos=pristine_dos,
                dpi=dpi
            )
            frames.append(img)

    out_gif = out_dir / out_gif_name
    print(f"Saving {len(frames)} frames to {out_gif}...")
    frames[0].save(
        out_gif,
        save_all=True,
        append_images=frames[1:],
        duration=66,
        loop=0,
        optimize=True
    )
    print(f"[✓] Saved {out_gif_name} ({out_gif.stat().st_size / 1e6:.2f} MB)")


def main():
    parser = argparse.ArgumentParser(description="Render Webapp-Themed Coupled Band Structure + PDOS Animations")
    parser.add_argument("--calc-dir", type=str, default="/Volumes/KingstonSSD/Krojects/Kresearch/photh-gr/07_electronic_band_structures")
    parser.add_argument("--out-dir", type=str, default="frontend/public/calculations/photh")
    parser.add_argument("--dpi", type=int, default=130)
    args = parser.parse_args()

    calc_dir = Path(args.calc_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Webapp Theme Postprocessing Suite: Coupled Band+PDOS")
    print(f"Calculations Dir: {calc_dir}")
    print(f"Output Dir:       {out_dir}")
    print(f"DPI:              {args.dpi}")

    all_cases = [
        "pristine_00",
        "biaxial_+0.01", "biaxial_+0.02", "biaxial_+0.03",
        "biaxial_-0.01", "biaxial_-0.02", "biaxial_-0.03",
        "uniaxial_x_+0.01", "uniaxial_x_+0.02", "uniaxial_x_+0.03",
        "uniaxial_x_-0.01", "uniaxial_x_-0.02", "uniaxial_x_-0.03",
        "uniaxial_y_+0.01", "uniaxial_y_+0.02", "uniaxial_y_+0.03",
        "uniaxial_y_-0.01", "uniaxial_y_-0.02", "uniaxial_y_-0.03",
    ]

    print("\n--- [1/3] Pre-loading Band Structure and Resampled DOS Data ---")
    band_cache = {}
    dos_cache = {}

    for c in all_cases:
        cdir = calc_dir / c
        dos_file = cdir / "DOSCAR"
        xml_file = cdir / "vasprun.xml"
        if not dos_file.exists() or not xml_file.exists():
            print(f"Skipping {c}: missing files")
            continue
        dos_cache[c] = parse_doscar(dos_file, E_GRID)
        band_cache[c] = load_band_data(cdir)

    print("\n--- [2/3] Generating High-Res Pristine Coupled Publication Figure ---")
    if "pristine_00" in band_cache and "pristine_00" in dos_cache:
        pristine_dos = dos_cache["pristine_00"]
        pristine_band = band_cache["pristine_00"]
        out_png = out_dir / "fig_band_pdos_coupled_pristine.png"
        img_pristine = render_coupled_frame(
            mode_title="Pristine Equilibrium State",
            curr_eps=0.0,
            curr_a=pristine_band["a_len"],
            curr_b=pristine_band["b_len"],
            k_dists=pristine_band["k_dists"],
            energies=pristine_band["energies"],
            pz=pristine_band["pz"],
            curr_dos=pristine_dos,
            pristine_dos=pristine_dos,
            dpi=220,
            save_path=out_png
        )
        print(f"  -> Saved pristine publication coupled figure: {out_png}")

    print("\n--- [3/3] Generating Smooth 60-Frame Coupled Band+PDOS Animations ---")
    generate_coupled_animation(
        calc_dir=calc_dir,
        out_dir=out_dir,
        mode_prefix="biaxial",
        mode_title="Biaxial Breathing Mode",
        out_gif_name="anim_band_pdos_coupled_biaxial.gif",
        band_cache=band_cache,
        dos_cache=dos_cache,
        n_subframes=5,
        dpi=args.dpi
    )

    generate_coupled_animation(
        calc_dir=calc_dir,
        out_dir=out_dir,
        mode_prefix="uniaxial_x",
        mode_title="Uniaxial X (Armchair) Mode",
        out_gif_name="anim_band_pdos_coupled_uniaxial_x.gif",
        band_cache=band_cache,
        dos_cache=dos_cache,
        n_subframes=5,
        dpi=args.dpi
    )

    generate_coupled_animation(
        calc_dir=calc_dir,
        out_dir=out_dir,
        mode_prefix="uniaxial_y",
        mode_title="Uniaxial Y (Zigzag) Mode",
        out_gif_name="anim_band_pdos_coupled_uniaxial_y.gif",
        band_cache=band_cache,
        dos_cache=dos_cache,
        n_subframes=5,
        dpi=args.dpi
    )


if __name__ == "__main__":
    main()
