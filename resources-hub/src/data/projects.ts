import { ProjectMetadata } from '../types';

export const PROJECTS: ProjectMetadata[] = [
  // 1. FLAGSHIP: Carbon Atlas
  {
    id: 'carbon-atlas',
    title: 'Carbon Atlas (2D Carbon Explorer)',
    shortDescription: 'Materials informatics and crystallographic discovery platform for two-dimensional carbon allotropes beyond graphene.',
    fullDescription: 'Carbon Atlas resolves nanoscience nomenclature ambiguity by coupling mathematical Girão ring-topology classification with first-principles DFT-D3 and HSE06 electronic structure benchmarks. Features hardware-accelerated 3D WebGL crystal inspection, Wyckoff net charge visualization, thermodynamic viability gauges against the 0.456 eV/atom experimental synthesis threshold, and multiformat simulation exports (VASP POSCAR, CIF, XYZ, QE).',
    category: 'featured',
    primaryLanguage: 'React / TypeScript / Python',
    languageColor: '#3178C6',
    techStack: ['React 18', 'Three.js', 'React Three Fiber', 'FastAPI', 'Pymatgen', 'ASE', 'VASP 6.x', 'HSE06', 'Tailwind CSS'],
    githubUrl: 'https://github.com/carlosraulps/2d-carbon-explorer',
    liveDemoUrl: 'https://carlosraulps.github.io/2d-carbon-explorer/',
    highlights: [
      '61 validated allotropes spanning all 17 plane wallpaper groups',
      'Calculated ΔE vs. Graphene monolayer ground state',
      'Signed Henkelman Bader net charge distribution',
      'Interactive crystal inspection with supercell expansion'
    ],
    scientificDomain: '2D Materials Informatics & Crystallography',
    schematicType: 'carbon-atlas',
    featured: true,
  },

  // 2. FLAGSHIP: VASP Automatization Platform
  {
    id: 'vasp-automatization-platform',
    title: 'VASP-automatization-platform',
    shortDescription: 'AI-driven, event-driven orchestration architecture for high-throughput Density Functional Theory calculations.',
    fullDescription: 'Transitions computational materials science from linear bash scripting to a modular, event-driven architecture designed for resilient cluster execution. Manages automatic k-point mesh generation, Pulay charge-sloshing damping for extended/polymeric systems, automated electronic convergence diagnosis, and integrated Henkelman Bader charge partitioning.',
    category: 'featured',
    primaryLanguage: 'Python',
    languageColor: '#3572A5',
    techStack: ['Python 3.12+', 'VASP', 'Pymatgen', 'ASE', 'Slurm', 'Event Architecture', 'AsyncIO'],
    githubUrl: 'https://github.com/carlosraulps/VASP-automatization-platform',
    highlights: [
      'Autonomous SCF convergence failure diagnosis & self-healing',
      'Pulay mixing calibration (DM.MixingWeight 0.04) against charge sloshing',
      'Event-driven Slurm batch queue management',
      'Automated extraction of band structures, DOS, and Bader charges'
    ],
    scientificDomain: 'First-Principles Electronic Structure & HPC',
    schematicType: 'vasp-workflow',
    featured: true,
  },

  // 3. FLAGSHIP: aird2d
  {
    id: 'aird2d',
    title: 'aird2d',
    shortDescription: 'Generative and discriminative machine learning models for 2D materials discovery based on the C2DB database.',
    fullDescription: 'Computational materials informatics platform leveraging the Computational 2D Materials Database (C2DB) and custom deep learning workflows. Employs generative models to explore structural space and discriminative regressors to predict band gaps, magnetic moments, and exfoliation energies of pristine and defected 2D monolayers.',
    category: 'featured',
    primaryLanguage: 'Python / HTML',
    languageColor: '#3572A5',
    techStack: ['Python', 'PyTorch', 'C2DB', 'Scikit-Learn', 'ASE', 'Matplotlib', 'Jupyter'],
    githubUrl: 'https://github.com/carlosraulps/aird2d',
    highlights: [
      'C2DB database ingestion and topological feature extraction',
      'Electronic band gap and formation energy regression',
      'Generative design of dynamically stable 2D monolayers',
      'Automated structure verification via ASE and spglib'
    ],
    scientificDomain: 'Materials Informatics & Deep Learning',
    featured: true,
  },

  // 4. Numerical Computing: fortran-numerical-methods
  {
    id: 'fortran-numerical-methods',
    title: 'fortran-numerical-methods',
    shortDescription: 'Modern Fortran implementations of fundamental numerical methods in computational physics and applied mathematics.',
    fullDescription: 'High-performance, modular scientific routines written in modern Fortran. Covers Runge-Kutta 4th order and adaptive ODE integrators, Newton-Raphson and Brent root-finding, LU/Cholesky linear solvers, and boundary-value differential problem algorithms with strict error tolerances and benchmark validation.',
    category: 'numerical',
    primaryLanguage: 'Fortran',
    languageColor: '#4d41b1',
    techStack: ['Fortran 90/95', 'gfortran', 'BLAS', 'LAPACK', 'Makefile', 'Scientific Numerics'],
    githubUrl: 'https://github.com/carlosraulps/fortran-numerical-methods',
    highlights: [
      'Adaptive Runge-Kutta integration with O(h⁴) local truncation error',
      'Stable linear system decomposition (LU with partial pivoting)',
      'High-precision root finding algorithms with quadratic convergence',
      'Zero-dependency modular Fortran modules'
    ],
    scientificDomain: 'Numerical Analysis & Applied Physics',
    schematicType: 'numerical-convergence',
  },

  // 5. Numerical Computing: fortran-numerical-routines
  {
    id: 'fortran-numerical-routines',
    title: 'fortran-numerical-routines',
    shortDescription: 'Comprehensive scientific routines covering spline interpolation, numerical quadrature, and Monte Carlo integration.',
    fullDescription: 'Extended collection of scientific computing routines in Fortran 90. Implements cubic spline interpolation, Gauss-Legendre quadrature, data smoothing filters, and multi-dimensional Monte Carlo phase space integration, designed for intensive computational physics simulations.',
    category: 'numerical',
    primaryLanguage: 'Fortran',
    languageColor: '#4d41b1',
    techStack: ['Fortran 90', 'gfortran', 'Numerical Quadrature', 'Monte Carlo', 'Splines'],
    githubUrl: 'https://github.com/carlosraulps/fortran-numerical-routines',
    highlights: [
      'Gauss-Legendre and Romberg numerical quadrature routines',
      'Natural and clamped cubic spline interpolators',
      'Uniform and Gaussian pseudorandom Monte Carlo sampling',
      'Optimized memory layouts for cache efficiency'
    ],
    scientificDomain: 'Numerical Quadrature & Stochastic Methods',
  },

  // 6. Numerical Computing: numerical-methods-in-matlab
  {
    id: 'numerical-methods-in-matlab',
    title: 'numerical-methods-in-matlab',
    shortDescription: 'MATLAB algorithm translations and interactive scientific visualization of computational physics coursework.',
    fullDescription: 'Comprehensive MATLAB code suite translating fundamental algorithms from computational physics and Fortran courses into vectorized MATLAB environments. Includes step-by-step phase space trajectory visualizations, eigenvalue problem solutions, and numerical stability comparisons.',
    category: 'numerical',
    primaryLanguage: 'MATLAB',
    languageColor: '#e16737',
    techStack: ['MATLAB', 'Vectorization', 'ODE Solvers', 'Eigenvalue Decomposition', 'Plotting'],
    githubUrl: 'https://github.com/carlosraulps/numerical-methods-in-matlab',
    highlights: [
      'Vectorized ODE and PDE boundary value solvers',
      '2D and 3D phase space orbit visualizers',
      'Convergence and condition number comparative analysis',
      'Interactive tutorial scripts for computational physics'
    ],
    scientificDomain: 'Computational Physics & Vectorized Algorithms',
  },

  // 7. Academic & LaTeX: thesis-UNMSM-template
  {
    id: 'thesis-unmsm-template',
    title: 'thesis-UNMSM-template',
    shortDescription: 'Institutional, publication-grade LaTeX template for theses and dissertations at UNMSM.',
    fullDescription: 'Standardized and battle-tested LaTeX template tailored to the rigorous formatting, typography, and citation requirements of the Universidad Nacional Mayor de San Marcos (UNMSM). Incorporates modular chapter structuring, compliant bibliography styles (BibLaTeX/Biber), institutional grayscale insignia, and XeLaTeX Unicode support.',
    category: 'academic',
    primaryLanguage: 'TeX / LaTeX',
    languageColor: '#3D6117',
    techStack: ['LaTeX', 'XeLaTeX', 'BibLaTeX', 'Biber', 'UNMSM Guidelines', 'Typography'],
    githubUrl: 'https://github.com/carlosraulps/thesis-UNMSM-template',
    highlights: [
      'Full compliance with UNMSM Faculty of Physical Sciences format',
      'Modular multi-file layout (chapters, appendices, nomenclature)',
      'Pre-configured math packages (AMS, physics, siunitx)',
      'Automated XeLaTeX build script with auxiliary cleanup'
    ],
    scientificDomain: 'Academic Publishing & Institutional Scaffolding',
  },

  // 8. AI & Automation: code-axiomatization
  {
    id: 'code-axiomatization',
    title: 'code-axiomatization',
    shortDescription: 'LLM agent capability to convert physical derivations and markdown equations into axiomatized LaTeX code.',
    fullDescription: 'An automated cognitive agent pipeline designed to take raw mathematical derivations, handwritten notes, or markdown expressions and synthesize mathematically rigorous, axiomatized LaTeX equations complete with theorem environments and clear variable scoping.',
    category: 'ai',
    primaryLanguage: 'Python',
    languageColor: '#3572A5',
    techStack: ['Python', 'LLM Agent', 'LaTeX Engine', 'AST Parser', 'Regex', 'KaTeX'],
    githubUrl: 'https://github.com/carlosraulps/code-axiomatization',
    highlights: [
      'Automatic theorem and lemma environment structuring',
      'Consistent notation enforcement across multi-page derivations',
      'Equation alignment optimization (align, gather, split)',
      'Syntax validation with headless LaTeX compilation'
    ],
    scientificDomain: 'Mathematical Derivation & Formalization',
    schematicType: 'latex-axiomatizer',
  },

  // 9. AI & Automation: docs-to-code
  {
    id: 'docs-to-code',
    title: 'docs-to-code',
    shortDescription: 'Intelligent optical parser and converter transforming scanned documents and research notes into structured LaTeX / Markdown.',
    fullDescription: 'Optical and semantic document transformation pipeline. Ingests scanned course notes, mathematical problem sets, and legacy PDF research reports, converting them into cleanly organized, editable Markdown and compile-ready LaTeX document structures.',
    category: 'ai',
    primaryLanguage: 'TeX / Python',
    languageColor: '#3572A5',
    techStack: ['Python', 'OCR / Vision API', 'TeX Engine', 'PDF Parsing', 'Markdown AST'],
    githubUrl: 'https://github.com/carlosraulps/docs-to-code',
    highlights: [
      'High-accuracy mathematical handwriting recognition',
      'Tables and figure float reconstruction in LaTeX syntax',
      'Automatic citation and reference bibliography parsing',
      'Batch conversion CLI for scanned course notebooks'
    ],
    scientificDomain: 'Document Ingestion & Semantic Transcription',
  },

  // 10. AI & Automation: papers-to-xlsx
  {
    id: 'papers-to-xlsx',
    title: 'papers-to-xlsx',
    shortDescription: 'Automated scientific literature extraction pipeline using Gemini API to parse batches of PDF papers into structured Excel datasets.',
    fullDescription: 'High-throughput research pipeline utilizing multimodal AI (Google Gemini API) to ingest folders of peer-reviewed scientific publications, extracting experimental parameters, synthesis conditions, band gaps, and material properties directly into structured, tabular Excel datasets.',
    category: 'ai',
    primaryLanguage: 'Python',
    languageColor: '#3572A5',
    techStack: ['Python', 'Google Gemini API', 'openpyxl', 'PyPDF2 / pdfplumber', 'Pandas'],
    githubUrl: 'https://github.com/carlosraulps/papers-to-xlsx',
    highlights: [
      'Zero-shot schema extraction for chemical formulas and lattice constants',
      'Batch processing of hundreds of PDF articles in parallel',
      'Strict type validation and missing data flagging',
      'Clean multi-sheet Excel export with source DOI traceability'
    ],
    scientificDomain: 'Scientific Literature Mining & Data Synthesis',
  },

  // 11. AI & Automation: ia-notes-evaluator
  {
    id: 'ia-notes-evaluator',
    title: 'ia-notes-evaluator',
    shortDescription: 'Continuous cognitive learning engine and academic notes evaluation platform.',
    fullDescription: 'Educational and cognitive AI engine built to assess student study notes, detect conceptual gaps, score technical rigor against syllabus benchmarks, and generate personalized Socratic feedback for advanced physics and mathematics curricula.',
    category: 'ai',
    primaryLanguage: 'Python',
    languageColor: '#3572A5',
    techStack: ['Python', 'LLM Prompt Engineering', 'Embeddings', 'Evaluation Rubric', 'Streamlit'],
    githubUrl: 'https://github.com/carlosraulps/ia-notes-evaluator',
    highlights: [
      'Rubric-based multi-criteria scoring of physical derivations',
      'Conceptual trap detection and misconception diagnosis',
      'Automated feedback generation with corrective hints',
      'Longitudinal learning progress tracking'
    ],
    scientificDomain: 'Educational Informatics & Cognitive Modeling',
  },

  // 12. Linux & HPC: server-notification
  {
    id: 'server-notification',
    title: 'server-notification',
    shortDescription: 'Real-time Discord notification bot and telemetry daemon for Slurm High-Performance Computing clusters.',
    fullDescription: 'Asynchronous monitoring service bridging Slurm queue outputs and real-time Discord notifications. Listens for job state transitions (PENDING, RUNNING, COMPLETED, FAILED), detects SCF convergence stalls, tracks walltime expirations, and delivers instant alerts to research teams.',
    category: 'hpc',
    primaryLanguage: 'Python',
    languageColor: '#3572A5',
    techStack: ['Python 3.11+', 'Discord.py', 'Slurm (squeue / sacct)', 'AsyncIO', 'Linux Daemon', 'Systemd'],
    githubUrl: 'https://github.com/carlosraulps/server-notification',
    highlights: [
      'Real-time job lifecycle webhook notifications',
      'Strict completion detection anchoring (never generic grep strings)',
      'Core utilization and memory threshold warnings',
      'Lightweight headless daemon with systemd integration'
    ],
    scientificDomain: 'HPC Cluster Telemetry & Queue Automation',
    schematicType: 'hpc-cluster',
  },

  // 13. Linux & HPC: dotfiles
  {
    id: 'dotfiles',
    title: 'dotfiles',
    shortDescription: 'Personal HPC and Linux workstation environment: Qtile, Neovim, Fish shell, and scientific scripting setup.',
    fullDescription: 'Production-grade configuration repository for Arch Linux workstations and remote computing nodes. Optimized for computational physics, featuring a keyboard-driven Qtile window manager, LSP-configured Neovim for Fortran/Python/LaTeX, and scripted environment bootstrapping.',
    category: 'hpc',
    primaryLanguage: 'Python / Shell',
    languageColor: '#89e051',
    techStack: ['Python (Qtile)', 'Neovim (Lua)', 'Fish Shell', 'Rofi', 'Alacritty', 'Arch Linux'],
    githubUrl: 'https://github.com/carlosraulps/dotfiles',
    highlights: [
      'Qtile tiling window manager with dynamic scientific workspace layouts',
      'Neovim configured for Pyright, Fortran-LSP, and VimTeX',
      'Automated installation and symlinking shell scripts',
      'Dark forest and high-contrast terminal color themes'
    ],
    scientificDomain: 'System Engineering & Developer Productivity',
  },

  // 14. Academic & Study: Git & GitHub Guide
  {
    id: 'git-study-guide',
    title: 'Apuntes de Git y GitHub (Guía en Español)',
    shortDescription: 'Comprehensive Spanish study guide and reference manual on collaborative version control, branching models, and Git mastery.',
    fullDescription: 'Authored study guide detailing modern Git workflows for scientific teams. Covers internal commit object DAGs, branch rebasing vs merging, remote repository collaboration, pull request reviews, conflict resolution, and submodules.',
    category: 'academic',
    primaryLanguage: 'Markdown / PDF',
    languageColor: '#e34c26',
    techStack: ['Git', 'GitHub', 'Markdown', 'Technical Writing', 'Spanish Documentation'],
    githubUrl: 'https://github.com/carlosraulps/resources',
    downloadUrl: '/files/apuntes_de_Git_y_Github.pdf',
    highlights: [
      'Complete Git reference from commit plumbing to porcelain',
      'Visual branching diagrams for trunk-based and gitflow models',
      'Practical terminal cheatsheet for daily research workflows',
      'Direct PDF download available'
    ],
    scientificDomain: 'Scientific Software Engineering & Version Control',
  },

  // 15. Academic & Study: python_crash_course
  {
    id: 'python-crash-course',
    title: 'python_crash_course',
    shortDescription: 'Self-taught scientific Python curriculum with automated pytest test suites and computational problem sets.',
    fullDescription: 'Structured repository of computational physics and programming exercises. Synthesizes concepts from "Automate the Boring Stuff" and "Python Crash Course", augmented with comprehensive unit tests in pytest, algorithmic explanations, and scientific library applications.',
    category: 'academic',
    primaryLanguage: 'Python',
    languageColor: '#3572A5',
    techStack: ['Python 3', 'pytest', 'NumPy', 'Matplotlib', 'OOP', 'Scientific Computing'],
    githubUrl: 'https://github.com/carlosraulps/python_crash_course',
    highlights: [
      'Test-driven development (TDD) problem sets with pytest',
      'Object-oriented physical simulation structures',
      'Data manipulation and numerical plotting routines',
      'Extensive comments and pedagogical documentation'
    ],
    scientificDomain: 'Pedagogical Computing & Test-Driven Development',
  },
];
