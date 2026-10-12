# Scientific Resources Hub & Carbon Atlas Developer Guide

This document describes the architecture, local development workflow, and deployment procedures for the **Resources Hub** and the standalone **Carbon Atlas (2D Carbon Explorer)** application.

---

## 1. Architecture Overview

```
carlosraulps.github.io/
├── _config.yml                    # Jekyll site configuration
├── _data/navigation.yml           # Academic navigation menu links
├── _pages/                        # Academic markdown & HTML pages (about, cv, publications)
│   └── resources-archive.md       # Preserved historical markdown notes (/resources/archive/)
├── resources/                     # Production build output for GitHub Pages (/resources/)
│   ├── index.html                 # High-Density Editorial Scientific entry page
│   └── assets/                    # Compiled CSS, JS, and WebGL bundle chunks
├── resources-hub/                 # Isolated Vite + React + TypeScript source workspace
│   ├── src/
│   │   ├── components/            # Editorial, 3D WebGL (R3F), and interactive schematics
│   │   ├── data/                  # Authentic 15-project catalog & Girão 61 allotrope data
│   │   └── theme/                 # Editorial design system tokens (Ivory, Forest, Terracotta)
│   ├── vite.config.ts             # Relative base ('./') building into ../resources/
│   └── package.json
└── .github/workflows/deploy.yml   # Automated CI/CD workflow for GitHub Pages
```

---

## 2. Resources Hub Development

### 2.1. Prerequisites
- **Node.js**: v20+ or v25+
- **npm**: v10+ or v11+

### 2.2. Running Local Development Server
From the root repository:
```bash
npm run dev:resources
```
This boots the Vite HMR development server at `http://localhost:5173/`. Edits in `resources-hub/src/` reflect immediately with sub-second hot reload.

### 2.3. Building for Production
From the root repository:
```bash
npm run build:resources
```
This runs TypeScript type checking (`tsc`) and Vite bundling. The optimized production artifacts are written directly to `resources/index.html` and `resources/assets/`.

### 2.4. Previewing the Production Build
```bash
npm run preview:resources
```

---

## 3. Carbon Atlas (2D Carbon Explorer) Integration

Carbon Atlas is Carlos's flagship materials informatics application for exploring two-dimensional carbon allotropes beyond graphene.

### 3.1. Architectural Separation
- **Portfolio Hub Integration (`resources-hub`)**: Contains an ultra-lightweight, hardware-accelerated 3D WebGL crystal preview (`LatticeViewer3D.tsx`) built with React Three Fiber + Drei. It features authentic allotropes (Pristine Graphene, Biphenylene Net-W, Phagraphene, Pentaheptite) with signed Henkelman Bader net charge coloring, Girão ring invariants, and thermodynamic viability gauges against the 0.456 eV/atom threshold.
- **Standalone Application (`2d-carbon-explorer`)**: Lives in its own repository (`https://github.com/carlosraulps/2d-carbon-explorer`). It includes the complete Mendeley Data v2 61-allotrope database, the interactive **PHOTH Quantum & Strain Lab**, electronic band structure unwrapping (PBE vs HSE06), and simulation coordinate exporters.

### 3.2. Developing and Deploying Carbon Atlas Separately
1. Clone or open the Carbon Atlas repository:
   ```bash
   cd /path/to/2d-carbon-explorer/frontend
   npm install
   npm run dev
   ```
2. Build the application for deployment:
   ```bash
   npm run build
   ```
3. Deploy the resulting `dist/` directory to GitHub Pages at `https://carlosraulps.github.io/2d-carbon-explorer/`.
4. If server-side ab initio DFT relaxation or ASE generation is required, deploy the FastAPI backend (`backend/`) to a container hosting provider (Render, Fly.io, Railway, or university server) and point `VITE_API_BASE_URL` to it. GitHub Pages serves the client-side WebGL workspace.

---

## 4. Git & GitHub Pages Deployment

### 4.1. Master Branch Policy
Per user project rules, all commits and remote operations MUST target the `master` branch (never `main`).

### 4.2. Dual-Mode Deployment Compatibility
The website supports two deployment modes without breaking:
1. **GitHub Actions Deployment (Recommended)**:
   - Configured in `.github/workflows/deploy.yml`.
   - On push to `master`, GitHub Actions builds both the Resources Hub via Vite and the Jekyll academic pages via Bundler, deploying the unified site to GitHub Pages.
2. **Standard Native Jekyll Deployment**:
   - Because `resources/index.html` and `resources/assets/` are committed directly to `master`, standard Jekyll copies the static directory verbatim into `_site/resources/`.
   - All links in `./assets/` use relative paths, ensuring zero 404s.

---

## 5. Adding New Research Repositories

To add a new research project or publication tool:
1. Open `resources-hub/src/data/projects.ts`.
2. Add a new `ProjectMetadata` entry with:
   - `id`: unique slug
   - `title`: Repository or platform name
   - `category`: `'featured' | 'dft' | 'numerical' | 'ai' | 'hpc' | 'academic'`
   - `primaryLanguage` & `languageColor`
   - `techStack`: string array of libraries and tools
   - `githubUrl`: repository URL
   - `highlights`: key scientific capabilities
   - `schematicType`: optional interactive diagram (`'vasp-workflow' | 'numerical-convergence' | 'hpc-cluster' | 'latex-axiomatizer'`)
3. Rebuild with `npm run build:resources`.
