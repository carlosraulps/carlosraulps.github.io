#!/usr/bin/env python3
"""
export_pbe_hse_bands.py
=======================
Extracts calibrated PBE and HSE06 band dispersion curves along the high-symmetry path
Gamma (0,0) -> X (pi/a, 0) -> S (pi/a, pi/b) -> Y (0, pi/b) -> Gamma (0,0)
and writes structured JSON data for native interactive rendering in the webapp.
"""

import json
from pathlib import Path
import numpy as np

PBE_FILE = Path("/Volumes/KingstonSSD/Krojects/Kresearch/photh-gr/f_02b_band_PBE/BAND.dat")
HSE_FILE = Path("/Volumes/KingstonSSD/Krojects/Kresearch/photh-gr/f_02c_hse06_arbitration/03_HSE_Bands/BAND.dat")
OUT_JSON = Path("/Volumes/KingstonSSD/Krojects/Kresearch/2d-carbon-explorer/frontend/src/data/pbe_hse06_bands.json")

def parse_vaspkit_dat(dat_path):
    bands = {}
    curr_band = None
    with open(dat_path, "r", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if "Band-Index:" in line:
                curr_band = int(line.split()[-1])
                bands[curr_band] = {"k": [], "e": []}
            elif not line.startswith("#") and curr_band is not None:
                parts = line.split()
                bands[curr_band]["k"].append(float(parts[0]))
                bands[curr_band]["e"].append(float(parts[1]))
    return {k: {"k": np.array(v["k"]), "e": np.array(v["e"])} for k, v in bands.items()}

def main():
    pbe_raw = parse_vaspkit_dat(PBE_FILE)
    hse_raw = parse_vaspkit_dat(HSE_FILE)

    k_points = [
        {"label": "Γ", "latex": r"\Gamma", "dist": 0.000000, "coords": "(0, 0)"},
        {"label": "X", "latex": "X", "dist": 0.439963, "coords": "(π/a, 0)"},
        {"label": "S", "latex": "S", "dist": 1.228596, "coords": "(π/a, π/b)"},
        {"label": "Y", "latex": "Y", "dist": 1.668559, "coords": "(0, π/b)"},
        {"label": "Γ", "latex": r"\Gamma", "dist": 2.457192, "coords": "(0, 0)"},
    ]

    # Filter bands in [-3.2, +3.2] eV window
    pbe_filtered = []
    for b_idx, b_data in sorted(pbe_raw.items()):
        e = b_data["e"]
        if np.any((e >= -3.2) & (e <= 3.2)):
            is_frontier = abs(e.min()) < 0.55 or abs(e.max()) < 0.55
            pbe_filtered.append({
                "band_index": b_idx,
                "is_frontier": bool(is_frontier),
                "energies": [round(val, 4) for val in e.tolist()],
            })

    hse_filtered = []
    for b_idx, b_data in sorted(hse_raw.items()):
        e = b_data["e"]
        if np.any((e >= -3.2) & (e <= 3.2)):
            is_frontier = abs(e.min()) < 0.65 or abs(e.max()) < 0.65
            hse_filtered.append({
                "band_index": b_idx,
                "is_frontier": bool(is_frontier),
                "energies": [round(val, 4) for val in e.tolist()],
            })

    k_dist_pbe = list(pbe_raw.values())[0]["k"]
    k_dist_hse = list(hse_raw.values())[0]["k"]

    payload = {
        "k_distances_pbe": [round(k, 6) for k in k_dist_pbe.tolist()],
        "k_distances_hse": [round(k, 6) for k in k_dist_hse.tolist()],
        "k_points": k_points,
        "k_max": round(float(k_dist_pbe[-1]), 6),
        "energy_range": [-3.0, 3.0],
        "pbe": {
            "name": "GGA-PBE (Semilocal)",
            "gap_ev": 0.00,
            "vbm_ev": -0.0071,
            "cbm_ev": 0.0073,
            "gap_type": "Semi-metallic Dirac Node",
            "k_distances": [round(k, 6) for k in k_dist_pbe.tolist()],
            "bands": pbe_filtered,
        },
        "hse06": {
            "name": "HSE06 (Screened Hybrid)",
            "gap_ev": 0.042,
            "direct_gap_node_ev": 0.1691,
            "vbm_ev": -0.0626,
            "cbm_ev": 0.1065,
            "gap_type": "Narrow-Gap Semiconductor",
            "k_distances": [round(k, 6) for k in k_dist_hse.tolist()],
            "bands": hse_filtered,
        }
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"Successfully exported PBE & HSE06 bands to {OUT_JSON} ({len(pbe_filtered)} PBE bands, {len(hse_filtered)} HSE bands)")

if __name__ == "__main__":
    main()
