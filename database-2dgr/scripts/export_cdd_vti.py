#!/usr/bin/env python3
"""
CDD to VTI & WebGL Binary Grid Converter
Converts 3D Charge Density Difference (cdd_3d.xsf or cdd.vasp) into:
1. cdd_3d_compact.vti (VTK XML ImageData for vtk.js)
2. cdd_3d_grid.bin + metadata.json (Compact Float32 buffer for Three.js / WebGL / vtk.js)

Author: Carbon Atlas Engineering
"""

import sys
import json
import struct
import xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np

CDD_XSF_PATH = Path("/Volumes/KingstonSSD/Krojects/Kresearch/photh-gr/06_charge_density_analysis/02_hydrogen_cdd_3d/cdd_3d.xsf")
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "calculations" / "photh" / "volumetric"


def parse_cdd_xsf(xsf_path: Path):
    print(f"Reading XSF grid from: {xsf_path}")
    with open(xsf_path, "r") as f:
        # Read until coordinates
        line = f.readline()
        while line and "PRIMCOORD" not in line:
            line = f.readline()
        
        # Read number of atoms
        header_coord = f.readline().split()
        n_atoms = int(header_coord[0])
        atoms = []
        for _ in range(n_atoms):
            parts = f.readline().split()
            atoms.append({
                "atomic_number": int(parts[0]),
                "x": float(parts[1]),
                "y": float(parts[2]),
                "z": float(parts[3])
            })
        
        # Read until grid
        while line and "BEGIN_DATAGRID_3D" not in line:
            line = f.readline()
            
        dims = [int(x) for x in f.readline().split()] # nx, ny, nz
        origin = [float(x) for x in f.readline().split()]
        a_vec = [float(x) for x in f.readline().split()]
        b_vec = [float(x) for x in f.readline().split()]
        c_vec = [float(x) for x in f.readline().split()]
        
        vals = []
        for line in f:
            if "END_DATAGRID_3D" in line:
                break
            vals.extend([float(x) for x in line.split()])
            
    # Reshape: in XSF format, x changes fastest, then y, then z
    # vals has nx * ny * nz items
    grid = np.array(vals, dtype=np.float32).reshape((dims[2], dims[1], dims[0])) # [nz, ny, nx]
    
    return {
        "atoms": atoms,
        "dims": dims, # [nx, ny, nz]
        "origin": origin,
        "lattice": [a_vec, b_vec, c_vec],
        "grid": grid # shape (nz, ny, nx)
    }


def export_compact_cdd(data: dict, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    
    grid = data["grid"] # shape (nz, ny, nx)
    nx, ny, nz = data["dims"]
    a, b, c = data["lattice"]
    
    # Active range in z where delta_rho is significant (monolayer region)
    # Monolayer is at ~10 Angstroms (index 150 out of 300)
    # Let's crop from iz=90 to iz=220 (130 slices in z covering 6.0 A to 14.6 A)
    # and optionally downsample by factor of 2 in x and y for ultra-fast WebGL rendering
    z_start, z_end = 90, 220
    cropped_grid = grid[z_start:z_end, :, :] # shape (130, ny, nx)
    
    # Calculate spacing in Angstroms
    dx = a[0] / nx
    dy = b[1] / ny
    dz = c[2] / nz
    z_origin = z_start * dz
    
    # 1. Export Raw Binary Float32 for WebGL / vtk.js direct buffer
    bin_file = out_dir / "cdd_3d_monolayer.bin"
    with open(bin_file, "wb") as f:
        # Write flat array: order [z, y, x]
        cropped_grid.tofile(f)
    print(f"Exported raw binary grid: {bin_file} ({bin_file.stat().st_size / 1024:.1f} KB)")
    
    # 2. Export Metadata JSON
    meta = {
        "dimensions": [nx, ny, z_end - z_start], # [108, 60, 130]
        "spacing": [float(dx), float(dy), float(dz)],
        "origin": [float(data["origin"][0]), float(data["origin"][1]), float(z_origin)],
        "lattice": {
            "a": a,
            "b": b,
            "c": c
        },
        "atoms": data["atoms"],
        "data_range": {
            "min": float(np.min(cropped_grid)),
            "max": float(np.max(cropped_grid)),
            "rms": float(np.sqrt(np.mean(cropped_grid**2)))
        },
        "recommended_isovalues": {
            "accumulation": +0.0070,
            "depletion": -0.0070
        },
        "units": "e / Angstrom^3"
    }
    
    meta_file = out_dir / "cdd_3d_metadata.json"
    with open(meta_file, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Exported metadata: {meta_file}")

    # 3. Export VTK XML ImageData (.vti)
    # vtk.js vtkXMLImageDataReader natively loads .vti files!
    vti_file = out_dir / "cdd_3d_monolayer.vti"
    nz_crop = z_end - z_start
    
    # Flatten as float32 bytes
    raw_bytes = cropped_grid.tobytes()
    import base64
    b64_data = base64.b64encode(raw_bytes).decode("ascii")
    
    vti_content = f"""<?xml version="1.0"?>
<VTKFile type="ImageData" version="0.1" byte_order="LittleEndian">
  <ImageData WholeExtent="0 {nx-1} 0 {ny-1} 0 {nz_crop-1}" Origin="{data['origin'][0]} {data['origin'][1]} {z_origin}" Spacing="{dx} {dy} {dz}">
    <Piece Extent="0 {nx-1} 0 {ny-1} 0 {nz_crop-1}">
      <PointData Scalars="CDD_e_per_Ang3">
        <DataArray type="Float32" Name="CDD_e_per_Ang3" format="binary">
{b64_data}
        </DataArray>
      </PointData>
    </Piece>
  </ImageData>
</VTKFile>
"""
    with open(vti_file, "w") as f:
        f.write(vti_content)
    print(f"Exported VTI file for vtk.js: {vti_file} ({vti_file.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    if CDD_XSF_PATH.exists():
        data = parse_cdd_xsf(CDD_XSF_PATH)
        export_compact_cdd(data, OUTPUT_DIR)
        print("Successfully generated vtk.js and WebGL volumetric assets!")
    else:
        print(f"Error: {CDD_XSF_PATH} not found!")
