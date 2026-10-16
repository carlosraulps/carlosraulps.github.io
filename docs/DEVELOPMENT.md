# Scientific Resources Hub Developer Guide

This document describes the architecture, local development workflow, and deployment procedures for the **Resources Hub** application.

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

### 3.1. Architecture & Data Provenance Protection
- **Private Source Repository & Vercel Deployment**: To protect unreleased ab initio crystallographic coordinates, volumetric charge density files (`*.bin`, `*.vti`), and proprietary codebase components prior to peer-reviewed publication, Carbon Atlas is maintained in a private GitHub repository and deployed to **[https://2d-carbon-explorer.vercel.app/](https://2d-carbon-explorer.vercel.app/)**.
- **Public Repository Boundary**: `.gitignore` explicitly excludes `2d-carbon-explorer/`, `database-2dgr/`, `*.bin`, and `*.vti` so that raw source code and unreleased structural files are never committed to the public `carlosraulps.github.io` repository.
- **Resources Hub Integration**: The Resources Hub links directly to `https://2d-carbon-explorer.vercel.app/` from the navigation bar, hero banner, project catalog, and footer colophon.

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
