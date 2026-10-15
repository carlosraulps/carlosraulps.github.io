# Graph Report - 2d-carbon-explorer  (2026-10-15)

## Corpus Check
- 116 files · ~2,223,066 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 214 file(s) not represented in the graph (top: .cif 184, .poscar 10, .csv 5)

## Summary
- 1143 nodes · 2152 edges · 79 communities (56 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4212a306`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ingest_paper_file
- render_coupled_band_pdos.py
- AbInitioLab.jsx
- frontend/package.json
- process_allotropes.py
- 💎 2D Carbon Explorer · Carbon Atlas
- StructureInspector.jsx
- frontend/tests/scientific_integrity.test.mjs
- allotropesStore.ts
- 📚 2D Carbon Allotropes Literature Catalog & Acquisition Index
- extract_all_descriptors
- main.jsx
- app.py
- generate_supercell_endpoint
- MendeleyCatalog
- Family IV: Primitive Rectangular Networks (r-series)
- Family IV: Primitive Rectangular Networks (r-series)
- import_allotropes.py
- 🔄 2. The 7-Stage Data Ingestion & Curation Architecture
- Family II: Hexagonal Networks (h-series)
- 🔄 2. The 7-Stage Data Ingestion & Curation Architecture
- Family II: Hexagonal Networks (h-series)
- test_crystallography.py
- test_api.py
- AllotropesCatalog
- MIDbCatalog
- health_check
- render_clean_ccd_anim.py
- ml_baseline.py
- mendeley.py
- standardize_and_enrich_database.py
- get_pymatgen_structure
- package.json
- bibliography.py
- Family III: Centered-Rectangular Networks (c-series)
- Family III: Centered-Rectangular Networks (c-series)
- crystallographic_cards.py
- Family I: Landmark & Experimentally Synthesized Allotropes
- 📁 4. Detailed Allotrope Cards & Search Query Vectors
- Family I: Landmark & Experimentally Synthesized Allotropes
- 📁 4. Detailed Allotrope Cards & Search Query Vectors
- BibliographyExplorer.jsx
- render_clean_bader_anim.py
- midb_view.py
- disambiguate_paper_structure.py
- 📚 Literature Manager: Ingestion, Deduplication, Topological Disambiguation, Citation Ethics & Multi-Tier Taxonomy Sync
- Carbon Atlas — 2D Carbon Explorer
- json
- make_wallpaper_symmetry_figure
- dash_bootstrap_components
- compute_bond_statistics
- build_supercell
- dependencies
- Interactive3DLattice.jsx
- ErrorBoundary
- WorkspaceErrorBoundary
- upload_modal.py
- 📝 2D Carbon Allotropes: Operational Literature & Vector Extraction Checklist
- numpy
- re
- MachineLearningStudio.jsx
- devDependencies
- scripts
- carbon-explorer-backend
- track_papers.py
- _patch_controls_sensitivity
- os
- export_ml_datasets
- services/__init__.py
- predict_relative_energy
- export_allotropes_js.py
- compute_savings_summary

## God Nodes (most connected - your core abstractions)
1. `App()` - 27 edges
2. `get_pymatgen_structure()` - 25 edges
3. `get_structure_by_id()` - 19 edges
4. `ingest_paper_file()` - 19 edges
5. `Family IV: Primitive Rectangular Networks (r-series)` - 19 edges
6. `Family IV: Primitive Rectangular Networks (r-series)` - 19 edges
7. `export_structure_content()` - 17 edges
8. `AbInitioLab()` - 17 edges
9. `ScientificFormula()` - 17 edges
10. `Family II: Hexagonal Networks (h-series)` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Motion and performance notes` --references--> `CarbonLattice3D()`  [INFERRED]
  frontend/README.md → frontend/src/main.jsx
- `update_selected_allotrope()` --calls--> `render_properties_dashboard()`  [EXTRACTED]
  app.py → components/crystallographic_cards.py
- `run_pipeline()` --calls--> `resolve_canonical_id()`  [EXTRACTED]
  scripts/standardize_and_enrich_database.py → backend/app/services/canonical_catalog.py
- `run_pipeline()` --calls--> `get_canonical_group()`  [EXTRACTED]
  scripts/standardize_and_enrich_database.py → backend/app/services/canonical_catalog.py
- `main()` --calls--> `list_structures()`  [EXTRACTED]
  scripts/verify_allotropes_integrity.py → backend/app/services/crystallography.py

## Import Cycles
- None detected.

## Communities (79 total, 23 thin omitted)

### Community 0 - "ingest_paper_file"
Cohesion: 0.13
Nodes (12): add_by_doi(), auto_classify_and_link(), check_duplicate(), clean_no_emoji(), compute_sha256(), extract_pdf_metadata(), fetch_crossref_by_doi(), fetch_crossref_by_title() (+4 more)

### Community 1 - "render_coupled_band_pdos.py"
Cohesion: 0.11
Nodes (10): generate_coupled_animation(), load_band_data(), main(), parse_doscar(), render_coupled_frame(), main(), plot_her_profile(), main() (+2 more)

### Community 2 - "AbInitioLab.jsx"
Cohesion: 0.21
Nodes (19): AbInitioLab(), applySymmetryOp(), computeSymmetryOrbits(), evalCoordExpr(), fracDist(), parseSymmetryOpsFromCif(), NativeBandsPbeHse(), getReferencesForStructure() (+11 more)

### Community 3 - "frontend/package.json"
Cohesion: 0.12
Nodes (15): name, private, type, version, autoprefixer, gsap, postcss, puppeteer-core (+7 more)

### Community 4 - "process_allotropes.py"
Cohesion: 0.07
Nodes (9): AllotropesPipeline, ASECIFParser, AtomEnvironment, BondDistributionCalibrator, BondRecord, CalibratedThresholds, ContinuousDescriptorCalculator, main() (+1 more)

### Community 5 - "💎 2D Carbon Explorer · Carbon Atlas"
Cohesion: 0.04
Nodes (43): 1.1 Overview, 1.2 Duplicate Identity Catalog, 1. Canonical Nomenclature & Identity Resolution, 2.1 The Non-$z$-Normal Anomaly, 2.2 Cyclic Right-Handed $SO(3)$ Rotation Algorithm, 2.3 Post-Rotation Physical Verification, 2. Plane Standardization & Vacuum Normalization Protocol, 2D Carbon Allotropes: Scientific Database & Reproducibility Protocol (+35 more)

### Community 7 - "StructureInspector.jsx"
Cohesion: 0.31
Nodes (12): Methodology(), formatGiraoSymbol(), getGiraoNotation(), isNamedAllotrope(), MathTex(), ScientificFormula(), StructureComparisonModal(), StructureInspector() (+4 more)

### Community 8 - "frontend/tests/scientific_integrity.test.mjs"
Cohesion: 0.12
Nodes (22): BOND_LENGTH_LABELS, BONDING_THRESHOLDS, DOUBLE_MAX, SINGLE_MIN, TRIPLE_MAX, UNIFORM_DELTA_D_MAX, normalizeAllotrope(), BondCharacterCounts (+14 more)

### Community 9 - "allotropesStore.ts"
Cohesion: 0.12
Nodes (17): phothCalculations, fmt(), classifySymmetryFamily(), getAllotropeById(), masterCatalog, SYMMETRY_FAMILIES, SymmetryFamily, SymmetryFamilyMeta (+9 more)

### Community 10 - "📚 2D Carbon Allotropes Literature Catalog & Acquisition Index"
Cohesion: 0.40
Nodes (4): 1. Verified Local Literature Catalog (Active in WebApp Database), 2. Prioritized Missing Literature Queue (To Download for Database & WebApp), 📚 2D Carbon Allotropes Literature Catalog & Acquisition Index, Executive Summary

### Community 11 - "extract_all_descriptors"
Cohesion: 0.15
Nodes (9): compute_ring_entropy(), extract_all_descriptors(), extract_bond_metrics(), extract_lattice_and_density_metrics(), parse_girao_rings(), test_biphenylene_strained_descriptors(), test_covalent_bonding_characterization(), test_graphene_ideal_sp2_descriptors() (+1 more)

### Community 12 - "main.jsx"
Cohesion: 0.08
Nodes (28): AllotropeSubmissionModal(), ALLOWED_EXACT_NAMES, ALLOWED_EXTENSIONS, BLACKLISTED_EXACT_NAMES, BLACKLISTED_EXTENSIONS, allotropes, benchmark, bondingChoices (+20 more)

### Community 13 - "app.py"
Cohesion: 0.11
Nodes (13): build_mendeley_options(), build_midb_options(), build_native_options(), export_conventional_cif(), export_primitive_cif(), export_supercell_cif(), handle_auth_modal(), handle_settings_modal() (+5 more)

### Community 17 - "Family IV: Primitive Rectangular Networks (r-series)"
Cohesion: 0.11
Nodes (19): [37] Allotrope r5^4_7^4_55 (`r5^4_7^4_55`), [38] Allotrope r5^2_6^6_7^2_51 (`r5^2_6^6_7^2_51`), [39] Allotrope r4^1_6^1_8^1_47 (`r4^1_6^1_8^1_47`), [40] Allotrope r4^2_6^1_10^1_47 (`r4^2_6^1_10^1_47`), [41] Allotrope r4^5_6^4_10^1_12^1_47 (`r4^5_6^4_10^1_12^1_47`), [42] Allotrope r5^2_6^1_8^1_47 (`r5^2_6^1_8^1_47`), [43] Allotrope r4^1_5^2_8^2_47 (`r4^1_5^2_8^2_47`), [44] Allotrope r4^1_6^3_8^1_47 (`r4^1_6^3_8^1_47`) (+11 more)

### Community 18 - "Family IV: Primitive Rectangular Networks (r-series)"
Cohesion: 0.11
Nodes (19): [37] Allotrope r5^4_7^4_55 (`r5^4_7^4_55`), [38] Allotrope r5^2_6^6_7^2_51 (`r5^2_6^6_7^2_51`), [39] Allotrope r4^1_6^1_8^1_47 (`r4^1_6^1_8^1_47`), [40] Allotrope r4^2_6^1_10^1_47 (`r4^2_6^1_10^1_47`), [41] Allotrope r4^5_6^4_10^1_12^1_47 (`r4^5_6^4_10^1_12^1_47`), [42] Allotrope r5^2_6^1_8^1_47 (`r5^2_6^1_8^1_47`), [43] Allotrope r4^1_5^2_8^2_47 (`r4^1_5^2_8^2_47`), [44] Allotrope r4^1_6^3_8^1_47 (`r4^1_6^3_8^1_47`) (+11 more)

### Community 19 - "import_allotropes.py"
Cohesion: 0.16
Nodes (7): calculate_bonds(), calculate_visual_mesh(), clean_taxonomy_symbol(), detect_slab_geometry(), ingest_allotropes(), parse_rings_from_symbol(), pbc_span()

### Community 20 - "🔄 2. The 7-Stage Data Ingestion & Curation Architecture"
Cohesion: 0.12
Nodes (16): 1. Catalog Duplicate / Alias Pairs with Resolution, 📊 1. Executive Summary & Catalog Statistics, 🔍 2.1 Critical Deep-Research Audit & Ground-Truth Resolution (2026-10-12), 🔄 2. The 7-Stage Data Ingestion & Curation Architecture, 2. Topological Euler Invariant Gate, 🔬 2D Carbon Allotropes: Comprehensive Literature Discovery & Multi-Stage Data Extraction Pipeline, 3. Artificial $\Delta E$ Energy Grid Binning, 📋 3. Master Inventory Table: All 61 Allotropes (+8 more)

### Community 21 - "Family II: Hexagonal Networks (h-series)"
Cohesion: 0.12
Nodes (17): [10] Allotrope h6^1_191 (`h6^1_191`), [11] Allotrope h5^6_12^1_191 (`h5^6_12^1_191`), [12] Allotrope h4^3_12^1_156 (`h4^3_12^1_156`), [13] Allotrope h4^6_6^8_8^3_12^1_191 (`h4^6_6^8_8^3_12^1_191`), [14] Allotrope h4^6_6^9_10^3_191 (`h4^6_6^9_10^3_191`), [15] Allotrope h5^12_6^3_9^2_12^1_191 (`h5^12_6^3_9^2_12^1_191`), [16] Allotrope h4^6_6^6_9^2_12^1_191 (`h4^6_6^6_9^2_12^1_191`), [17] Allotrope h5^3_6^2_7^3_189 (`h5^3_6^2_7^3_189`) (+9 more)

### Community 22 - "🔄 2. The 7-Stage Data Ingestion & Curation Architecture"
Cohesion: 0.12
Nodes (16): 1. Catalog Duplicate / Alias Pairs with Resolution, 📊 1. Executive Summary & Catalog Statistics, 🔍 2.1 Critical Deep-Research Audit & Ground-Truth Resolution (2026-10-12), 🔄 2. The 7-Stage Data Ingestion & Curation Architecture, 2. Topological Euler Invariant Gate, 🔬 2D Carbon Allotropes: Comprehensive Literature Discovery & Multi-Stage Data Extraction Pipeline, 3. Artificial $\Delta E$ Energy Grid Binning, 📋 3. Master Inventory Table: All 61 Allotropes (+8 more)

### Community 23 - "Family II: Hexagonal Networks (h-series)"
Cohesion: 0.12
Nodes (17): [10] Allotrope h6^1_191 (`h6^1_191`), [11] Allotrope h5^6_12^1_191 (`h5^6_12^1_191`), [12] Allotrope h4^3_12^1_156 (`h4^3_12^1_156`), [13] Allotrope h4^6_6^8_8^3_12^1_191 (`h4^6_6^8_8^3_12^1_191`), [14] Allotrope h4^6_6^9_10^3_191 (`h4^6_6^9_10^3_191`), [15] Allotrope h5^12_6^3_9^2_12^1_191 (`h5^12_6^3_9^2_12^1_191`), [16] Allotrope h4^6_6^6_9^2_12^1_191 (`h4^6_6^6_9^2_12^1_191`), [17] Allotrope h5^3_6^2_7^3_189 (`h5^3_6^2_7^3_189`) (+9 more)

### Community 24 - "test_crystallography.py"
Cohesion: 0.13
Nodes (9): get_manifest(), list_structures(), biphenylene_id(), client(), graphene_id(), manifest(), test_get_structure_by_id(), test_list_and_search_structures() (+1 more)

### Community 25 - "test_api.py"
Cohesion: 0.17
Nodes (6): test_api_bibliography_endpoints(), test_api_export_endpoints(), test_api_health(), test_api_structure_detail(), test_api_structures_list(), test_api_supercell_endpoint()

### Community 29 - "render_clean_ccd_anim.py"
Cohesion: 0.17
Nodes (5): generate_animation_mode(), load_slices_bin(), main(), render_single_frame(), resample_grid()

### Community 30 - "ml_baseline.py"
Cohesion: 0.14
Nodes (4): execute_and_save_baseline(), run_cross_validation(), test_baseline_regression_cross_validation(), test_ml_dataset_export_integrity()

### Community 31 - "mendeley.py"
Cohesion: 0.11
Nodes (3): clean_chart_label(), clean_taxonomy_symbol(), StructureLoader

### Community 32 - "standardize_and_enrich_database.py"
Cohesion: 0.21
Nodes (7): detect_normal_axis(), pbc_span(), rotate_slab_to_z(), test_all_structures_in_dataset_are_z_normal(), test_cyclic_rotation_preserves_right_handedness(), test_graphene_is_already_z_normal(), run_pipeline()

### Community 33 - "get_pymatgen_structure"
Cohesion: 0.14
Nodes (10): export_structure_endpoint(), get_pymatgen_structure(), get_structure_by_id(), export_structure_content(), test_cif_roundtrip(), test_extxyz_roundtrip(), test_json_export(), test_poscar_roundtrip() (+2 more)

### Community 34 - "package.json"
Cohesion: 0.15
Nodes (12): author, description, keywords, license, name, private, scripts, build (+4 more)

### Community 35 - "bibliography.py"
Cohesion: 0.19
Nodes (6): get_all_references(), get_structure_references(), load_bib(), is_canonical_structure(), resolve_canonical_id(), test_canonical_identification_and_resolution()

### Community 36 - "Family III: Centered-Rectangular Networks (c-series)"
Cohesion: 0.17
Nodes (12): [26] Allotrope c5^2_7^2_65 (`c5^2_7^2_65`), [27] Allotrope c5^2_6^4_8^1_65 (`c5^2_6^4_8^1_65`), [28] Allotrope c4^1_5^1_7^1_8^1_38 (`c4^1_5^1_7^1_8^1_38`), [29] Allotrope c4^1_6^2_8^1_65 (`c4^1_6^2_8^1_65`), [30] Allotrope c5^4_6^1_10^1_65 (`c5^4_6^1_10^1_65`), [31] Allotrope c4^2_5^4_6^1_14^1_65 (`c4^2_5^4_6^1_14^1_65`), [32] Allotrope c5^2_6^4_7^2_65 (`c5^2_6^4_7^2_65`), [33] Allotrope c5^2_8^1_65 (`c5^2_8^1_65`) (+4 more)

### Community 37 - "Family III: Centered-Rectangular Networks (c-series)"
Cohesion: 0.17
Nodes (12): [26] Allotrope c5^2_7^2_65 (`c5^2_7^2_65`), [27] Allotrope c5^2_6^4_8^1_65 (`c5^2_6^4_8^1_65`), [28] Allotrope c4^1_5^1_7^1_8^1_38 (`c4^1_5^1_7^1_8^1_38`), [29] Allotrope c4^1_6^2_8^1_65 (`c4^1_6^2_8^1_65`), [30] Allotrope c5^4_6^1_10^1_65 (`c5^4_6^1_10^1_65`), [31] Allotrope c4^2_5^4_6^1_14^1_65 (`c4^2_5^4_6^1_14^1_65`), [32] Allotrope c5^2_6^4_7^2_65 (`c5^2_6^4_7^2_65`), [33] Allotrope c5^2_8^1_65 (`c5^2_8^1_65`) (+4 more)

### Community 38 - "crystallographic_cards.py"
Cohesion: 0.24
Nodes (3): format_latex_taxonomy(), format_symmetry_latex(), render_properties_dashboard()

### Community 39 - "Family I: Landmark & Experimentally Synthesized Allotropes"
Cohesion: 0.20
Nodes (10): [01] Pristine Graphene (`graphene`), [02] Biphenylene Network (`biphenylene`), [03] Phagraphene (`phagraphene`), [04] PHOTH-Graphene (`photh_graphene`), [05] Alpha Gr (`alpha_gr`), [06] Beta Gr (`beta_gr`), [07] Cmmm Graphene (`cmmm_graphene`), [08] Pentaheptite (`pentaheptite`) (+2 more)

### Community 40 - "📁 4. Detailed Allotrope Cards & Search Query Vectors"
Cohesion: 0.20
Nodes (10): 📁 4. Detailed Allotrope Cards & Search Query Vectors, [55] Allotrope t5^4_6^8_8^2_123 (`t5^4_6^8_8^2_123`), [56] Allotrope t4^1_8^1_123 (`t4^1_8^1_123`), [57] Allotrope t5^4_6^4_8^2_127 (`t5^4_6^4_8^2_127`), [58] Allotrope o4^1_5^1_6^1_9^1_6 (`o4^1_5^1_6^1_9^1_6`), [59] Allotrope o4^1_5^2_10^1_10 (`o4^1_5^2_10^1_10`), [60] Allotrope o5^2_6^1_7^2_10 (`o5^2_6^1_7^2_10`), [61] Allotrope o5^2_6^2_7^2_10 (`o5^2_6^2_7^2_10`) (+2 more)

### Community 41 - "Family I: Landmark & Experimentally Synthesized Allotropes"
Cohesion: 0.20
Nodes (10): [01] Pristine Graphene (`graphene`), [02] Biphenylene Network (`biphenylene`), [03] Phagraphene (`phagraphene`), [04] PHOTH-Graphene (`photh_graphene`), [05] Alpha Gr (`alpha_gr`), [06] Beta Gr (`beta_gr`), [07] Cmmm Graphene (`cmmm_graphene`), [08] Pentaheptite (`pentaheptite`) (+2 more)

### Community 42 - "📁 4. Detailed Allotrope Cards & Search Query Vectors"
Cohesion: 0.20
Nodes (10): 📁 4. Detailed Allotrope Cards & Search Query Vectors, [55] Allotrope t5^4_6^8_8^2_123 (`t5^4_6^8_8^2_123`), [56] Allotrope t4^1_8^1_123 (`t4^1_8^1_123`), [57] Allotrope t5^4_6^4_8^2_127 (`t5^4_6^4_8^2_127`), [58] Allotrope o4^1_5^1_6^1_9^1_6 (`o4^1_5^1_6^1_9^1_6`), [59] Allotrope o4^1_5^2_10^1_10 (`o4^1_5^2_10^1_10`), [60] Allotrope o5^2_6^1_7^2_10 (`o5^2_6^1_7^2_10`), [61] Allotrope o5^2_6^2_7^2_10 (`o5^2_6^2_7^2_10`) (+2 more)

### Community 43 - "BibliographyExplorer.jsx"
Cohesion: 0.44
Nodes (8): BibliographyExplorer(), ImportReferenceModal(), downloadFile(), RESEARCH_TOPICS, SCIENTIFIC_BIBLIOGRAPHY, toAPA(), toBibTeX(), toRIS()

### Community 44 - "render_clean_bader_anim.py"
Cohesion: 0.21
Nodes (5): compute_2d_charge_field(), generate_clean_bader_animation(), load_all_bader_data(), main(), render_coupled_frame()

### Community 46 - "disambiguate_paper_structure.py"
Cohesion: 0.14
Nodes (10): apply_reconciliations(), disambiguate_pdf(), disambiguate_text_sections(), extract_crystallographic_features(), extract_pdf_sections(), main(), resolve_chronological_priority(), run_cross_audit() (+2 more)

### Community 47 - "📚 Literature Manager: Ingestion, Deduplication, Topological Disambiguation, Citation Ethics & Multi-Tier Taxonomy Sync"
Cohesion: 0.08
Nodes (24): 1. Overview & Mission, 2. Architecture & Pipeline, 3. The Roald Hoffmann Citation Ethics & Anti-Amnesia Protocol, 4. Topological Crystallography & Periodic Graph Isomorphism, 5. The 5-Fold Structural Invariant Tuple Verification Gate, 6. Audited 4-Tier Allotrope Evidence Taxonomy, 7. CLI Commands & Operational Workflows, 8. Synchronized Downstream Dependencies (+16 more)

### Community 48 - "Carbon Atlas — 2D Carbon Explorer"
Cohesion: 0.25
Nodes (7): Carbon Atlas — 2D Carbon Explorer, Implemented interactions, Important scientific limitation, Motion and performance notes, Motion and visualization stack, Run locally, Suggested real-data schema

### Community 49 - "json"
Cohesion: 0.23
Nodes (7): get_canonical_group(), test_canonical_and_alias_energies_synchronization(), test_canonical_groups(), test_catalog_json_synchronization(), test_manifest_contains_canonical_metadata(), test_verified_literature_energies_ground_truth(), generate_pipeline()

### Community 50 - "make_wallpaper_symmetry_figure"
Cohesion: 0.16
Nodes (3): update_selected_allotrope(), make_enhanced_stability_chart(), make_wallpaper_symmetry_figure()

### Community 52 - "compute_bond_statistics"
Cohesion: 0.14
Nodes (6): get_structure_bonds(), get_structure_detail(), get_structure_symmetry(), get_structures(), compute_bond_statistics(), test_pymatgen_structure_and_bonds()

### Community 53 - "build_supercell"
Cohesion: 0.19
Nodes (4): build_supercell(), test_biphenylene_supercell(), test_graphene_2x2_and_4x4(), test_invalid_scaling_raises_error()

### Community 54 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, framer-motion, gsap, katex, lucide-react, react, react-dom, @react-three/drei (+4 more)

### Community 55 - "Interactive3DLattice.jsx"
Cohesion: 0.32
Nodes (11): AtomSphere(), BondCylinder(), CameraController(), CrystallographicAxes(), DistanceMeasurementVisualizer(), getBaderColorThree(), GhostAtomSphere(), Interactive3DLattice (+3 more)

### Community 58 - "upload_modal.py"
Cohesion: 0.20
Nodes (3): handle_uploaded_structure_file(), analyze_uploaded_structure(), make_upload_modal()

### Community 61 - "numpy"
Cohesion: 0.26
Nodes (4): export_compact_cdd(), parse_cdd_xsf(), main(), parse_vaspkit_dat()

### Community 64 - "re"
Cohesion: 0.21
Nodes (5): clean_text(), extract_midb_data(), fetch_url(), normalize_title(), title_similarity()

### Community 65 - "MachineLearningStudio.jsx"
Cohesion: 0.57
Nodes (6): MachineLearningStudio(), generateCanonicalCSV(), generateFeatureMetadataJSON(), generateFullCatalogCSV(), getParityData(), ML_BENCHMARKS

### Community 66 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, autoprefixer, postcss, puppeteer-core, tailwindcss

### Community 67 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 71 - "track_papers.py"
Cohesion: 0.22
Nodes (6): check_status(), format_size(), load_master(), main(), scan_untracked_papers(), sync_all_dependencies()

### Community 73 - "os"
Cohesion: 0.19
Nodes (3): verify_requirements(), run_tests(), main()

### Community 74 - "export_ml_datasets"
Cohesion: 0.21
Nodes (5): download_ml_dataset(), get_baseline_results(), get_ml_metadata(), build_ml_dataframe(), export_ml_datasets()

## Knowledge Gaps
- **5 isolated node(s):** `carbon-explorer-backend`, `autoprefixer`, `postcss`, `puppeteer-core`, `tailwindcss`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 603 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AllotropesCatalog` connect `AllotropesCatalog` to `app.py`, `mendeley.py`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `carbon-explorer-backend`, `autoprefixer`, `postcss` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ingest_paper_file` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Why does `MendeleyCatalog` connect `MendeleyCatalog` to `app.py`, `mendeley.py`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `render_coupled_band_pdos.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10588235294117647 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `process_allotropes.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06565656565656566 - nodes in this community are weakly interconnected._