# ⚛️ Carlos Raúl Primo Ramos · Academic & Scientific Computing Hub

> Personal academic website, computational physics portfolio, Density Functional Theory (DFT) platforms, and interactive research applications.

<p align="center">
  <a href="https://carlosraulps.github.io/"><img src="https://img.shields.io/badge/Live%20Website-carlosraulps.github.io-173D31?style=for-the-badge&logoColor=white" alt="Live Website" /></a>
  <a href="https://carlosraulps.github.io/resources/"><img src="https://img.shields.io/badge/Resources%20Hub-Interactive%20Scientific%20Portfolio-4E8062?style=for-the-badge&logoColor=white" alt="Resources Hub" /></a>
</p>

---

## 🔬 Core Platforms & Hub Sections

### 1. [Scientific Resources Hub (`/resources/`)](https://carlosraulps.github.io/resources/)
A high-density editorial scientific portfolio featuring:
- **VASP Automatization Platform**: Event-driven simulation lifecycle diagram, automatic k-mesh generation, and Pulay mixing convergence protocols.
- **Fortran Algorithmic Numerics**: Double-precision ODE integrators with interactive $\mathcal{O}(h^4)$ vs $\mathcal{O}(h)$ log-log error convergence plotting.
- **HPC Slurm Telemetry**: Multi-cluster partition telemetry across Iskay, Huk, Carbono, and Arch with real-time Discord daemon integration.
- **Mathematical Axiomatizer**: Automated LLM derivation-to-LaTeX converter with XeLaTeX-compliant theorem environments.
- **Searchable Repository Directory**: Real-time debounced discovery across all 14 open-source research repositories.

### 2. Academic Portfolio
- **[About / Home](https://carlosraulps.github.io/)**: Research focus in computational physics and materials science.
- **[Publications](https://carlosraulps.github.io/publications/)**: Peer-reviewed articles and preprints.
- **[Curriculum Vitae (CV)](https://carlosraulps.github.io/cv/)**: Academic background, UNMSM, and UFABC research activities.
- **[Study Manuals](https://carlosraulps.github.io/files/apuntes_de_Git_y_Github.pdf)**: Authored Spanish guide to Git & GitHub version control.

---

## 🛠️ Local Development & Build

### Prerequisites
- Node.js v20+ / v25+
- Ruby 3.x with Bundler (for native Jekyll builds)

### Commands
```bash
# Run Resources Hub locally (Vite HMR at http://localhost:5173/)
npm run dev:resources

# Compile Resources Hub production assets
npm run build:resources

# Preview Resources Hub production build
npm run preview:resources
```

Detailed developer instructions are available in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

---

## 📄 License
This repository and its open-source scientific tools are released under the [MIT License](LICENSE).
