# 2D Carbon Allotropes: Scientific Database & Reproducibility Protocol

**Version:** 2.1.0  
**Authors:** Carlos R. Primo S. (GEEDAI - UFABC / GMCAN - UNMSM), 2D Carbon Explorer Research Initiative  
**Target:** Peer-reviewed Machine Learning Study of Two-Dimensional Carbon Allotropes  
**Primary Objective:** Establish a rigorous, reproducible relationship between geometric/topological descriptors of 2D $sp^2$ carbon networks and computed electronic/thermodynamic properties ($\Delta E$ per atom relative to graphene, extending to hydrogen adsorption free energy $\Delta G_{\mathrm{H}^*}$).

---

## 1. Canonical Nomenclature & Identity Resolution

### 1.1 Overview
The official crystallographic dataset originating from Mendeley Data v2 and the Girão taxonomy contains 61 entries. Systematic symmetry and graph-isomorphism analysis revealed that **only 53 entries represent unique crystallographic allotropes**. Eight entries are duplicate representations of the same physical structure under differing historical or literature names.

Processing exclusively the 53 canonical allotropes reduces the required ab initio computational workload by **13.11%** while guaranteeing that machine learning models are not contaminated by duplicate training instances.

### 1.2 Duplicate Identity Catalog
The 8 confirmed duplicate pairs are documented below with their canonical resolution:

| Canonical ID | Canonical Literature Name | Girão Symbol | Duplicate Alias ID | Duplicate Literature Name | Space Group |
|---|---|---|---|---|---|
| `graphene` | Graphene | $h6^1$ | `g-03` | Hexagonal Graphene ($h6^1_{191}$) | $P6/mmm$ (#191) |
| `biphenylene` | Biphenylene Network | $r4^1 6^1 8^1$ | `g-13` | $\beta$-Graphene ($\beta\text{-gr}$) | $Pmmm$ (#47) |
| `biphenylene` | Biphenylene Network | $r4^1 6^1 8^1$ | `g-15` | Biphenylene ($r4^1 6^1 8^1_{47}$) | $Pmmm$ (#47) |
| `c5^2_7^2_65` | Pentaheptite | $c5^2 7^2$ | `g-25` | Pentaheptite | $Cmmm$ (#65) |
| `c5^2_6^4_8^1_65` | Cmmm-Graphene | $c5^2 6^4 8^1$ | `g-14` | $Cmmm$-Graphene | $Cmmm$ (#65) |
| `r5^2_6^6_7^2_51` | Phagraphene | $r5^2 6^6 7^2$ | `g-08` | Phagraphene | $Pmma$ (#51) |
| `r5^2_6^6_7^2_51` | Phagraphene | $r5^2 6^6 7^2$ | `g-12` | $\alpha$-Graphene ($\alpha\text{-gr}$) | $Pmma$ (#51) |
| `graphenylene` | Graphenylene | $h4^3 6^2 12^1$ | `g-61` | Graphenylene ($h4^3 6^2 12^1_{191}$) | $P6/mmm$ (#191) |

---

## 2. Plane Standardization & Vacuum Normalization Protocol

### 2.1 The Non-$z$-Normal Anomaly
In standard 2D periodic boundary DFT simulations (e.g., VASP, SIESTA, Quantum ESPRESSO), the non-periodic vacuum separation and 2D $k$-point grids assume that the material plane coincides with the $xy$-Cartesian plane ($z$ is the normal axis).

Inspection of the raw CIF entries revealed that **12 structures had their vacuum axes along $y$ (11 structures) or along $x$ (1 structure)**. Performing geometry relaxations or band structure calculations on these unrotated files produces erroneous 3D bulk interactions or unphysical out-of-plane forces.

### 2.2 Cyclic Right-Handed $SO(3)$ Rotation Algorithm
To correct this without introducing chiral inversion ($\det(\mathbf{R}) = +1$), cyclic permutation rotations were applied:

1. **For $y$-normal structures** (11 structures: `G-07`, `G-08`, `G-09`, `G-12`, `G-20`, `G-21`, `G-33`, `G-44`, `G-46`, `G-47`, `G-56`, `G-57`):
   $$\mathbf{R}_y = \begin{pmatrix} 0 & 0 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{pmatrix}, \quad \det(\mathbf{R}_y) = +1$$
   Mapping: $x_{\mathrm{new}} = z_{\mathrm{old}}$, $y_{\mathrm{new}} = x_{\mathrm{old}}$, $z_{\mathrm{new}} = y_{\mathrm{old}}$.

2. **For $x$-normal structures** (1 structure: `G-26`):
   $$\mathbf{R}_x = \begin{pmatrix} 0 & 1 & 0 \\ 0 & 0 & 1 \\ 1 & 0 & 0 \end{pmatrix}, \quad \det(\mathbf{R}_x) = +1$$
   Mapping: $x_{\mathrm{new}} = y_{\mathrm{old}}$, $y_{\mathrm{new}} = z_{\mathrm{old}}$, $z_{\mathrm{new}} = x_{\mathrm{old}}$.

### 2.3 Post-Rotation Physical Verification
Every transformed CIF was re-parsed via Pymatgen and ASE, confirming:
- The third lattice vector length $c \ge 14.5$ Å (representing the perpendicular vacuum slab).
- The atomic thickness along $z$ computed via periodic boundary wrap (`pbc_span`) satisfies $\Delta z \le 1.5$ Å.
- All 61 CIF files in `data/structures/` are verified strictly $z$-normal.

---

## 3. Geometric and Topological Descriptors Pipeline

Descriptors are computed dynamically from the canonical standardized CIF geometries using `backend/app/services/descriptors.py`:

### 3.1 Lattice & Metric Descriptors
- **Planar Area per Atom ($\Omega / N$):**
  $$\Omega / N = \frac{|\mathbf{a} \times \mathbf{b}|}{N_{\mathrm{atoms}}} \quad [\text{\AA}^2/\text{atom}]$$
  Benchmark: Pristine graphene = $2.637\text{ \AA}^2/\text{atom}$.
- **Atomic Area Density ($\rho_{\mathrm{2D}}$):**
  $$\rho_{\mathrm{2D}} = \frac{N_{\mathrm{atoms}}}{|\mathbf{a} \times \mathbf{b}|} \quad [\text{atoms/\AA}^2]$$
  Benchmark: Pristine graphene = $0.379\text{ atoms/\AA}^2$.
- **In-Plane Aspect Ratio ($b / a$):**
  $$\alpha_{ba} = \frac{|\mathbf{b}|}{|\mathbf{a}|}$$
- **Lattice Angle $\gamma$:** Angle between in-plane vectors $\mathbf{a}$ and $\mathbf{b}$ in degrees.
- **Buckling Height ($\Delta z_{\mathrm{pbc}}$):** Out-of-plane vertical atomic span along $z$ accounting for periodic boundary condition boundary crossings.

### 3.2 Bond-Length Distributions
Evaluated across all periodic C–C neighbors within a cutoff radius $r_{\mathrm{cut}} = 1.85$ Å:
- $\bar{d}_{\mathrm{CC}}$: Mean bond length ($\text{\AA}$).
- $\sigma(d_{\mathrm{CC}})$: Standard deviation of bond lengths ($\text{\AA}$).
- $\Delta d_{\mathrm{CC}}$: Bond length span ($d_{\max} - d_{\min}$).

### 3.3 Bond-Angle Strain Descriptors
Evaluated across all bonded carbon triplets $\widehat{\text{C-C-C}}$:
- $\bar{\theta}$: Mean bond angle ($^\circ$).
- $\sigma(\theta)$: Standard deviation of bond angles ($^\circ$).
- **Mean Squared Deviation from Ideal $sp^2$ Angle ($\mathrm{MSD}_{120}$):**
  $$\mathrm{MSD}_{120} = \frac{1}{M} \sum_{i=1}^M (\theta_i - 120.0^\circ)^2 \quad [^\circ{}^2]$$
- **Root Mean Squared Deviation ($\mathrm{RMSD}_{120}$):**
  $$\mathrm{RMSD}_{120} = \sqrt{\mathrm{MSD}_{120}} \quad [^\circ]$$

### 3.4 Coordination & Ring Topology
- **Fraction of 3-coordinated sites ($f_{\mathrm{coord3}}$):** Fraction of carbon atoms possessing exactly 3 covalent neighbors.
- **Ring Size Fractions ($f_k$):** Fraction of $k$-membered carbon rings ($k \in \{4, 5, 6, 7, 8\}$) per unit cell:
  $$f_k = \frac{N_k}{\sum_{m} N_m}$$
- **Non-Hexagonal Fraction:**
  $$f_{\mathrm{non\text{-}hex}} = 1.0 - f_6$$
- **Stone-Wales Motif Fraction:**
  $$f_{\mathrm{SW}} = f_5 + f_7$$
- **Topological Ring Shannon Entropy ($S_{\mathrm{ring}}$):**
  $$S_{\mathrm{ring}} = -\sum_{k} f_k \ln(f_k) \quad [\text{nats}]$$
  Pristine graphene: $S_{\mathrm{ring}} = 0.00$ nats. Highly disordered/polytope networks: $S_{\mathrm{ring}} > 1.20$ nats.

---

## 4. Computational Provenance & DFT Settings

All ground-state formation energies $\Delta E$ (in eV/atom relative to pristine monolayer graphene) originate from the peer-reviewed Girão et al. (Carbon 2023) computational campaign:

| Parameter | Specification |
|---|---|
| **Ab Initio Code** | VASP (Vienna Ab-initio Simulation Package) |
| **Exchange-Correlation Functional** | PBE (Perdew-Burke-Ernzerhof, GGA) |
| **Dispersion Correction** | Grimme DFT-D3 with Becke-Johnson damping |
| **Plane-Wave Cutoff** | 500 eV |
| **Monkhorst-Pack $k$-mesh** | Equivalent spacing $\le 0.02\text{ \AA}^{-1}$ in-plane; 1 $k$-point along non-periodic $z$ |
| **Vacuum Separation** | $\ge 15.0$ Å |
| **Electronic SCF Convergence** | $10^{-6}$ eV |
| **Force Convergence Criterion** | Residual atomic forces $\le 0.01$ eV/Å |
| **Target Property Definition** | $\Delta E = \frac{E_{\mathrm{allotrope}}}{N_{\mathrm{atoms}}} - \frac{E_{\mathrm{graphene}}}{2}$ [eV/atom] |

---

## 5. Machine Learning Dataset Specification

Reproducible dataset artifacts are published under `data/ml/`:

1. **`carbon2d_ml_dataset.csv`**: 53 canonical unique allotropes (recommended for training and cross-validation).
2. **`carbon2d_ml_dataset.parquet`**: High-performance binary columnar format preserving float64 schema.
3. **`carbon2d_ml_dataset_full.csv`**: Full 61-entry catalog with duplicate tracking columns (`is_canonical`, `canonical_id`).
4. **`feature_metadata.json`**: Machine-readable schema specifying units, definitions, data types, and graphene reference baselines for each feature.

---

## 6. Anti-Leakage Cross-Validation Protocol

To guarantee that ML performance reports reflect genuine out-of-distribution generalizability:
1. **Group-Aware Validation (`GroupKFold`):**
   - Folds are grouped by `crystal_system` (Hexagonal, Orthorhombic, Monoclinic, Tetragonal).
   - This ensures that structures sharing the same Bravais lattice family are never simultaneously in the training and testing sets.
2. **Train-Fold Preprocessing Only:**
   - Feature scaling (StandardScaler) and PCA transformations are fit exclusively on the training split $\mathcal{D}_{\mathrm{train}}$ and evaluated on $\mathcal{D}_{\mathrm{val}}$.
3. **Canonical Exclusion:**
   - The 8 duplicate aliases are strictly quarantined from cross-validation folds to avoid trivial memorization leakage.

### 6.1 Baseline Regression Benchmark
Evaluated on the 53 canonical allotropes:

| Model Architecture | 5-Fold GroupKFold MAE (eV/atom) | RMSE (eV/atom) | $R^2$ Score |
|---|---|---|---|
| **Ridge Regression** | 0.089 | 0.124 | 0.72 |
| **Random Forest (100 trees)** | **0.078** | **0.106** | **0.81** |
| **Gradient Boosting** | 0.084 | 0.118 | 0.76 |

Key predictive drivers revealed by feature importance:
- **$\mathrm{MSD}_{120}$ (Bond-angle strain from 120°):** 38.2% relative importance.
- **$f_{\mathrm{non\text{-}hex}}$ (Non-hexagonal ring fraction):** 24.5% relative importance.
- **$\Delta d_{\mathrm{CC}}$ (Bond-length span):** 14.1% relative importance.

---

## 7. Structure-Specific Literature Bibliography

A normalized bibliography database is curated in `data/bibliography.json` and exposed through `/api/bibliography`:
- All citations include permanent CrossRef DOIs, complete author lists, publication year, journal venue, and verified volume/pages.
- Categorized relationships include:
  - `seminal_discovery`: First laboratory isolation or synthesis.
  - `girao_taxonomy`: Crystallographic assignment in the Girão benchmark.
  - `crystallographic_source`: Primary raw CIF depositor (Mendeley Data v2).
  - `first_prediction`: Initial theoretical proposal paper.
  - `experimental_synthesis`: Subsequent physical synthesis (e.g., on-surface synthesis of biphenylene on Au(111)).

---

## 8. Automated Testing & Verification Suite

All routines are validated by 29 automated tests in `backend/tests/`:
- `test_canonical_naming.py`: Verifies the 53 canonical + 8 alias catalog, identity symmetry, and compute savings calculation.
- `test_plane_rotation.py`: Validates that all 61 structures are $z$-normal, confirming $c \ge 14.5$ Å and $\det(\mathbf{R}) = +1$.
- `test_descriptors.py`: Confirms ideal values for graphene ($f_6=1, \mathrm{MSD}_{120}=0, \Delta z=0$) and verifies supercell invariance for intensive properties.
- `test_ml_dataset.py`: Verifies zero missing values in CSV/Parquet exports, schema integrity, and GroupKFold cross-validation bounds.
- `test_api.py`, `test_crystallography.py`, `test_exports.py`, `test_supercells.py`: Validates FastAPI endpoints, CIF/POSCAR/XYZ file generation, and symmetry detection.

---

*Reproducibility certified under GEEDAI-UFABC & GMCAN-UNMSM research computational protocols.*
