# Carbon Atlas — 2D Carbon Explorer

A front-end prototype for browsing two-dimensional carbon allotropes, inspired by editorial science storytelling and minimal scientific line graphics.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Motion and visualization stack

- **Framer Motion** animates the page entrance, catalogue rows, and selected-structure inspector transitions.
- **GSAP + ScrollTrigger** reveal major content sections as they enter the viewport. Motion is skipped for users who request reduced motion.
- **React Three Fiber + Drei + Three.js** render an interactive schematic carbon lattice in the hero and inspector. Drag to rotate and use the scroll wheel/pinch gesture to zoom. The 3D scene is illustrative and is not generated from verified Girão coordinates.
- **CSS transitions** provide the editorial hover states and compact 2D/3D view switch.

## Implemented interactions

- Search the 61 catalogue preview records and sort by energy or identifier.
- Multi-select polygon sizes and filter below the 0.456 eV/atom biphenylene reference.
- Select a candidate to update the animated split-pane inspector; switch between 2D schematic and interactive 3D lattice.
- Choose 1×1, 2×2, 3×3, or 4×4 demo supercells.
- Export CIF, extended XYZ, or a VASP-style POSCAR demo file.
- Import a CSV with `id,energy` columns to replace the visible energy values; sample template is included.
- Open the source Girão structure dataset from Mendeley Data.

## Important scientific limitation

This deliverable is a UI prototype, not a validated scientific database. The 61 rows, topology labels, energy values, and diagrams in `src/data/allotropes.js` are generated illustrative placeholders. The export formats produce schematic demo geometry and are explicitly marked as **not for DFT or research use**. The CSV importer can update energies but does not insert real atomic coordinates or symmetry. Replace the demonstration records with validated Girão et al. CIF-derived data and calculate symmetry/lattice properties from those structures before research use.

Source collection: https://data.mendeley.com/datasets/fs42cypny7/2

## Suggested real-data schema

For the production adapter, use a JSON record per allotrope with `id`, `name`, `taxonomy`, `formation_energy_ev_atom`, `cif`, `lattice_vectors`, `fractional_coordinates`, `space_group`, `plane_group`, and `wyckoff_positions`. Keep metadata for computational method and reference alongside each energy.

## Motion and performance notes

The 3D viewer uses transparent WebGL canvases and a low-power rendering preference. If you target older phones or restricted graphics environments, consider adding a static SVG fallback around the `CarbonLattice3D` component. The application respects the operating system's reduced-motion preference for Framer Motion, GSAP reveals, and the lattice's ambient movement.
