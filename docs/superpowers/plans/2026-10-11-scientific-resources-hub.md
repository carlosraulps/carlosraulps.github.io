# Implementation Plan: Premium Scientific Research Hub & Resources Transformation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the GitHub Pages Resources section into a world-class interactive scientific computing portfolio and research application hub with High-Density Editorial Scientific Minimalism, 3D WebGL Carbon Atlas integration, authentic simulation schematics, and seamless preservation of the existing academic Jekyll infrastructure.

**Architecture:** A standalone, modular React 18 + Vite + TypeScript application (`resources-hub`) built with Tailwind CSS, Motion for React, GSAP + ScrollTrigger, and React Three Fiber. The application builds static, self-contained assets into `/resources/index.html` and `/assets/resources/dist/`, enabling both native Jekyll hosting on GitHub Pages and automated GitHub Actions workflows, while preserving all existing URLs (`/`, `/publications/`, `/cv/`, `/projects/`).

**Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind CSS, Motion for React (`motion/react` / `framer-motion`), GSAP 3 + ScrollTrigger, Three.js + React Three Fiber + Drei, Lucide React, KaTeX (for mathematical formulas).

**Spec:** MASTER DESIGN & ENGINEERING PROMPT: Transform My GitHub Pages Resources Website into a Premium Scientific Research Hub.

## Global Constraints

- Design language: High-Density Editorial Scientific Minimalism.
- Color tokens: Background `#F4F2E9`, Surface `#FFFFFF`, Primary `#173D31`, Accent `#4E8062`, Muted green `#E4EBDF`, Text `#203A30`, Terracotta accent `#C85A32`.
- Typography: Geist/Inter (body), IBM Plex Mono (technical/tags), Instrument Serif (editorial headings).
- No generic SaaS dashboard, AI startup landing page, or futuristic neon interface.
- Respect `prefers-reduced-motion` and include visible keyboard focus indicators.
- WebGL: Max 1 active canvas, lazy-loaded, suspend when offscreen, with graceful WebGL fallback.
- Preserve all existing academic navigation links (`/`, `/publications/`, `/cv/`, `/projects/`).
- Master git branch must remain `master` (never `main`).
- Only authentic scientific projects, tools, and algorithms from Carlos's research portfolio; no fabricated results or papers.

## Review Focus

1. **Subpath Asset Loading on GitHub Pages:** Visiting `/resources/` directly or refreshing on a subpath must load all JS/CSS/assets without 404s. Tested with relative or `/resources/` base configuration.
2. **WebGL Context Loss / Non-WebGL Fallback:** Environments without WebGL or low memory must display a crisp SVG/2D lattice topology fallback without crashing.
3. **Academic Site Interoperability:** Navigating between the academic pages (Home, Publications, CV, Blog) and Resources must be seamless with matching navigation anchors.
4. **Reduced Motion Compliance:** When `prefers-reduced-motion: reduce` is active, all 3D rotations, card expansions, and scroll scrubs must collapse to instant/static states.
5. **Mobile Viewport Stability:** The hero and 3D preview must not cause horizontal scroll or vertical layout jumps (`min-h-[100dvh]` rather than `h-screen`).

---

### Task 1: Scaffolding the Resources Hub Application

**Files:**
- Create: `resources-hub/package.json`
- Create: `resources-hub/vite.config.ts`
- Create: `resources-hub/tsconfig.json`
- Create: `resources-hub/tsconfig.node.json`
- Create: `resources-hub/tailwind.config.js`
- Create: `resources-hub/postcss.config.js`
- Create: `resources-hub/index.html`
- Modify: `package.json` (add convenience scripts)

**Interfaces:**
- Consumes: Node 25+, npm 11+
- Produces: Runnable Vite development server and production build output targetting `../resources/` and `../assets/resources/dist`

- [ ] **Step 1: Create package.json and configuration files**
Initialize `resources-hub` with React 18, Vite 5, Tailwind CSS, Motion, Three, R3F, Drei, GSAP, Lucide React, and TypeScript.
- [ ] **Step 2: Configure Vite build and output paths**
Configure `vite.config.ts` with `base: './'` so that assets work across any hosting setup (including `carlosraulps.github.io/resources/` or local dev).
- [ ] **Step 3: Run npm install and verify compilation**
Run `npm install` inside `resources-hub/` and verify clean dependency resolution.
- [ ] **Step 4: Update root package.json**
Add `"dev:resources"` and `"build:resources"` scripts to root `package.json`.
- [ ] **Step 5: Verify build script**
Run `npm run build:resources` to verify Vite builds without errors.

---

### Task 2: Design System, Tokens & Typography Foundation

**Files:**
- Create: `resources-hub/src/index.css`
- Create: `resources-hub/src/types/index.ts`
- Create: `resources-hub/src/theme/tokens.ts`

**Interfaces:**
- Consumes: Tailwind CSS, Google Fonts / system fonts
- Produces: CSS custom properties (`--bg-ivory`, `--surface-paper`, `--primary-forest`, `--accent-sage`, `--accent-terracotta`), fine grid pattern classes, typography utility classes, and TypeScript type declarations for Projects, Allotropes, and Metrics.

- [ ] **Step 1: Define TypeScript schemas in `src/types/index.ts`**
Define interfaces for `Project`, `ProjectCategory`, `AllotropeStructure`, `SimulationStep`, and `FilterState`.
- [ ] **Step 2: Implement styling tokens and utilities in `src/index.css`**
Define scientific editorial typography, subtle millimeter grid lines (`bg-editorial-grid`), custom scrollbars, and `@media (prefers-reduced-motion)` overrides.
- [ ] **Step 3: Verify style compilation**
Check that Tailwind generates tokens for `#F4F2E9`, `#FFFFFF`, `#173D31`, `#4E8062`, `#E4EBDF`, `#203A30`, `#C85A32`.

---

### Task 3: Authentic Research Portfolio & Scientific Data Layer

**Files:**
- Create: `resources-hub/src/data/projects.ts`
- Create: `resources-hub/src/data/carbonAtlasAllotropes.ts`
- Create: `resources-hub/src/data/scientificMetrics.ts`

**Interfaces:**
- Consumes: Authentic metadata from `_pages/resources.md` and `2d-carbon-explorer`
- Produces: Typed data structures for all 15 repositories, 4 flagship carbon allotropes with atomic coordinates and Wyckoff charges, and verified lab metrics.

- [ ] **Step 1: Port and structure the complete 15-project catalog**
Cover all 7 categories:
1. Featured Research Applications (Carbon Atlas, VASP Automatization Platform, aird2d)
2. DFT & Materials Science
3. Numerical Computing (Fortran numerical methods & routines, MATLAB translations)
4. AI & Scientific Automation (papers-to-xlsx, code-axiomatization, docs-to-code, ia-notes-evaluator)
5. Linux & HPC (server-notification, dotfiles)
6. Academic Templates & Study Resources (UNMSM thesis, Git/GitHub guide, python_crash_course)
- [ ] **Step 2: Port authentic 2D carbon allotrope coordinates**
Include Pristine Graphene, Biphenylene Network (Net-W), Phagraphene, and Pentaheptite with ring topology invariants ($A = x\prod_n n^{a_n}$), space groups, wallpaper groups, formation energies $\Delta E$, and signed Wyckoff net charges.
- [ ] **Step 3: Define scientific simulation step data**
Orchestrate realistic workflows for VASP event execution, Runge-Kutta convergence scaling, and Slurm cluster queue states.

---

### Task 4: Interactive Flagship: Carbon Atlas 3D/2D WebGL Preview

**Files:**
- Create: `resources-hub/src/components/CarbonAtlas/LatticeCanvas.tsx`
- Create: `resources-hub/src/components/CarbonAtlas/LatticeViewer3D.tsx`
- Create: `resources-hub/src/components/CarbonAtlas/LatticeFallback2D.tsx`
- Create: `resources-hub/src/components/CarbonAtlas/CarbonAtlasShowcase.tsx`

**Interfaces:**
- Consumes: `carbonAtlasAllotropes.ts`, Three.js, `@react-three/fiber`, `@react-three/drei`
- Produces: Interactive WebGL crystal preview with orbit rotation, atom hover and picking, Wyckoff charge color mapping, ring topology HUD, allotrope selector, and deep links to live app & repo.

- [ ] **Step 1: Build `LatticeViewer3D.tsx`**
Render 3D bond cylinders, atom spheres colored by signed Bader net charge (`#c97b5d` for depletion, `#1b4332` for accumulation), selection halos, and billboarding tooltips.
- [ ] **Step 2: Build `LatticeFallback2D.tsx`**
SVG-based 2D projection fallback for environments where WebGL is unavailable or when the user prefers reduced motion.
- [ ] **Step 3: Implement `LatticeCanvas.tsx` with offscreen pause & ErrorBoundary**
Use `IntersectionObserver` to pause WebGL rendering loop when scrolled out of view to save battery and GPU cycles.
- [ ] **Step 4: Build `CarbonAtlasShowcase.tsx`**
Compose the complete showcase section with allotrope switcher, thermodynamic benchmark gauge ($\Delta E$ vs graphene), Girão taxonomy ring notation, and primary action buttons.

---

### Task 5: Authentic Scientific Interactive Schematics

**Files:**
- Create: `resources-hub/src/components/Schematics/VaspPipelineVisualizer.tsx`
- Create: `resources-hub/src/components/Schematics/NumericalConvergencePlot.tsx`
- Create: `resources-hub/src/components/Schematics/SlurmClusterTelemetry.tsx`
- Create: `resources-hub/src/components/Schematics/LatexAxiomatizerDemo.tsx`

**Interfaces:**
- Consumes: Scientific project data and numerical methods algorithms
- Produces: Interactive, pedagogical diagrams grounded in actual physics and computing practice.

- [ ] **Step 1: Implement `VaspPipelineVisualizer.tsx`**
Interactive step-through of the VASP automation engine: Structure Parsing -> K-Point Grid Generation -> Slurm Batch Dispatch -> Pulay SCF Monitoring & Charge Sloshing Guard -> Automated Bader Charge Partitioning.
- [ ] **Step 2: Implement `NumericalConvergencePlot.tsx`**
Interactive SVG mathematical convergence plot showing Runge-Kutta 4th Order vs Euler method error decay $\log_{10}(\text{Error})$ vs step size $h$, demonstrating $\mathcal{O}(h^4)$ vs $\mathcal{O}(h)$ accuracy.
- [ ] **Step 3: Implement `SlurmClusterTelemetry.tsx`**
Interactive HPC cluster monitor displaying node allocation, partition states (`batch`, `gpu`, `debug`), job queue statuses, and Discord notification event triggers.
- [ ] **Step 4: Implement `LatexAxiomatizerDemo.tsx`**
Interactive before/after formula transformation demonstrating raw handwritten OCR/derivation to axiomatized LaTeX output with copy button.

---

### Task 6: Editorial Navigation, Hero & Searchable Project Discovery

**Files:**
- Create: `resources-hub/src/components/Navigation/EditorialNavbar.tsx`
- Create: `resources-hub/src/components/Hero/EditorialHero.tsx`
- Create: `resources-hub/src/components/Projects/ProjectDiscovery.tsx`
- Create: `resources-hub/src/components/Projects/ProjectCard.tsx`
- Create: `resources-hub/src/components/Projects/ProjectModal.tsx`
- Create: `resources-hub/src/components/Footer/EditorialFooter.tsx`
- Create: `resources-hub/src/App.tsx`

**Interfaces:**
- Consumes: All project components, Motion for React, GSAP ScrollTrigger
- Produces: Complete responsive application with real-time fuzzy search, category filtering, expanding project modal, academic link preservation, and smooth micro-interactions.

- [ ] **Step 1: Implement `EditorialNavbar.tsx`**
Dual-tier navigation: Academic links back to Home, Publications, Projects, CV, plus in-page category quick-jump anchors with active section spy.
- [ ] **Step 2: Implement `EditorialHero.tsx`**
High-density editorial layout with Instrument Serif display heading, research mission statement, metric badges (61 Allotropes, 15 Repositories, 5 Domains), and quick-action buttons.
- [ ] **Step 3: Implement `ProjectDiscovery.tsx` & `ProjectCard.tsx`**
Debounced search input, category filter pills (All, Featured, DFT, Numerical, AI, HPC, LaTeX), tag pills, and high-density cards with GitHub links, tech tags, and interactive demo openers.
- [ ] **Step 4: Implement `ProjectModal.tsx`**
Contextual deep-dive modal using Motion shared layout, displaying architecture schematics, full documentation summary, requirements, and direct repo links.
- [ ] **Step 5: Implement `EditorialFooter.tsx`**
Academic colophon, institutional affiliations (UNMSM, UFABC), license, study guide PDF direct downloads, and jump to top.
- [ ] **Step 6: Assemble full application in `src/App.tsx`**
Connect all sections with GSAP ScrollTrigger reveals and keyboard accessibility (`Escape` closes modal, focus traps).

---

### Task 7: Jekyll & GitHub Pages Integration & Deployment Pipeline

**Files:**
- Create: `resources/index.html` (built production hub)
- Create: `_pages/resources.html` (Jekyll wrapper fallback)
- Create: `.github/workflows/deploy.yml` (automated build & deployment workflow)
- Create: `docs/DEVELOPMENT.md` (guide for maintaining both the website and Carbon Atlas)
- Modify: `_data/navigation.yml` (verify link consistency)

**Interfaces:**
- Consumes: `resources-hub` production build artifacts
- Produces: Dual-compatible deployment: native Jekyll GitHub Pages works out-of-the-box, and modern GitHub Actions can deploy automatically if enabled.

- [ ] **Step 1: Build the production bundle**
Run `npm run build:resources` to generate the optimized production assets.
- [ ] **Step 2: Verify Jekyll compatibility**
Ensure `_pages/resources.html` or `resources/index.html` preserves site routing without breaking any existing pages (`/publications/`, `/cv/`, etc.).
- [ ] **Step 3: Create GitHub Actions deployment workflow**
Configure `.github/workflows/deploy.yml` with node setup, Vite build, Jekyll build, and GitHub Pages artifact upload.
- [ ] **Step 4: Create comprehensive developer documentation**
Document how to run local development, add new projects, deploy Carbon Atlas, and synchronize with GitHub.

---

### Task 8: Verification, Quality Assurance & Visual Polish

**Files:**
- Test scripts and manual verification checklists

- [ ] **Step 1: Responsive design audit**
Verify layouts across 375px (mobile), 768px (tablet), 1024px, 1440px, and 1920px viewports. Confirm no horizontal overflow.
- [ ] **Step 2: Accessibility & Reduced Motion audit**
Verify keyboard tab navigation, visible focus rings, ARIA roles, and `prefers-reduced-motion` compliance.
- [ ] **Step 3: Link & Navigation verification**
Check all 15 project GitHub links, live demo links, PDF study guide downloads, and academic page links.
- [ ] **Step 4: Production build & bundle size inspection**
Ensure code splitting, lazy loading of WebGL canvas, and fast initial page load.
