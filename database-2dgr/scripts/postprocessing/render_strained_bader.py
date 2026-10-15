#!/usr/bin/env python3
"""
render_strained_bader.py
========================
Native webapp-themed generator for Bader Net Charge Redistribution under Mechanical Strain:
- Processes bader_strained_summary.csv for PHOTH-Graphene and candidate 2D allotropes
- Tracks site-resolved atomic charges across the 6 Wyckoff sites (C1 to C6)
- Evaluates charge transfer delta: Δq(ε) = q(ε) - q(0)
- Applies Carbon Atlas Webapp Theme (#f4f2e9, #11362d, #c97b5d)
"""

import sys
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

try:
    from webapp_theme import PALETTE, apply_webapp_theme
except ImportError:
    sys.path.append(str(Path(__file__).resolve().parent))
    from webapp_theme import PALETTE, apply_webapp_theme

WYCKOFF_SITES = ["C1", "C2", "C3", "C4", "C5", "C6"]


def plot_static_bader_profiles(summary_csv: Path, out_path: Path, dpi: int = 200):
    """Plots multi-panel site-resolved Bader charge redistribution curves matching webapp styling."""
    if not summary_csv.exists():
        print(f"Summary CSV {summary_csv} not found.")
        return

    apply_webapp_theme()
    df = pd.read_csv(summary_csv)

    fig, axes = plt.subplots(1, 2, figsize=(11.0, 4.5), dpi=dpi)

    # Equilibrium 0.00 strain (from Strain_X_+0.00)
    df_p = df[df["Case"] == "Strain_X_+0.00"]
    mean_charges_0 = df_p.groupby("Wyckoff_Site")["Bader_Net_Charge_e"].mean().to_dict()

    # Panel (a): Net Charge at Equilibrium (0%)
    ax_a = axes[0]
    charges_0 = [mean_charges_0.get(s, 0.0) for s in WYCKOFF_SITES]
    colors_0 = [PALETTE["terracotta"] if q >= 0 else PALETTE["forest_mid"] for q in charges_0]
    bars_a = ax_a.bar(WYCKOFF_SITES, charges_0, color=colors_0, width=0.55, edgecolor=PALETTE["forest_deep"], lw=1.1)
    ax_a.axhline(0.0, color="#8a9e8f", ls="--", lw=0.9)
    ax_a.set_ylabel(r"Bader Net Charge $Q_{\mathrm{net}}\ (e)$", color=PALETTE["ink"], fontsize=10.5)
    ax_a.set_title(r"$\mathbf{(a)}\ \mathrm{Equilibrium\ Net\ Charges\ (0\%\ Strain)}$", color=PALETTE["forest_deep"], fontsize=10.5, pad=8)
    ax_a.grid(True, ls=":", alpha=0.5, color=PALETTE["grid"])

    for bar, q in zip(bars_a, charges_0):
        y_pos = bar.get_height() + (0.003 if q >= 0 else -0.012)
        ax_a.text(bar.get_x() + bar.get_width() / 2, y_pos, f"{q:+.3f}", ha="center",
                  va="bottom" if q >= 0 else "top", fontsize=8.8, fontweight="bold", color=PALETTE["forest_deep"])

    # Panel (b): Charge Transfer Delta under Tensile Strain (+2% Biaxial)
    ax_b = axes[1]
    df_s = df[df["Case"] == "Strain_Biaxial_+0.02"]
    if not df_s.empty:
        mean_charges_s = df_s.groupby("Wyckoff_Site")["Bader_Net_Charge_e"].mean().to_dict()
        deltas = [mean_charges_s.get(s, 0.0) - mean_charges_0.get(s, 0.0) for s in WYCKOFF_SITES]
        colors_b = [PALETTE["terracotta"] if d >= 0 else PALETTE["forest_mid"] for d in deltas]
        bars_b = ax_b.bar(WYCKOFF_SITES, deltas, color=colors_b, width=0.55, edgecolor=PALETTE["forest_deep"], lw=1.1)
        ax_b.axhline(0.0, color="#8a9e8f", ls="--", lw=0.9)
        ax_b.set_ylabel(r"Charge Transfer $\Delta Q_{\mathrm{net}}\ (e)$", color=PALETTE["ink"], fontsize=10.5)
        ax_b.set_title(r"$\mathbf{(b)}\ \mathrm{Electronic\ Redistribution\ at\ +2\%\ Biaxial\ Strain}$", color=PALETTE["forest_deep"], fontsize=10.5, pad=8)
        ax_b.grid(True, ls=":", alpha=0.5, color=PALETTE["grid"])

        for bar, d in zip(bars_b, deltas):
            y_pos = bar.get_height() + (0.0005 if d >= 0 else -0.0015)
            ax_b.text(bar.get_x() + bar.get_width() / 2, y_pos, f"{d:+.4f}", ha="center",
                      va="bottom" if d >= 0 else "top", fontsize=8.5, fontweight="bold", color=PALETTE["forest_deep"])

    fig.suptitle(r"$\mathrm{Wyckoff\ Site-Resolved\ Bader\ Net\ Charge\ Partitioning\ under\ Strain}$",
                 fontsize=11.0, fontweight="bold", color=PALETTE["forest_deep"], y=0.98)
    plt.tight_layout()
    fig.savefig(out_path, dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved Bader profile figure to {out_path}")


def main():
    parser = argparse.ArgumentParser(description="Render Webapp-Themed Bader Net Charge Profiles")
    parser.add_argument("--csv", type=str, default="frontend/public/calculations/photh/bader_strained_summary.csv")
    parser.add_argument("--out", type=str, default="frontend/public/calculations/photh/fig_bader_charge_profiles.png")
    parser.add_argument("--dpi", type=int, default=180)
    args = parser.parse_args()

    plot_static_bader_profiles(Path(args.csv), Path(args.out), args.dpi)


if __name__ == "__main__":
    main()
