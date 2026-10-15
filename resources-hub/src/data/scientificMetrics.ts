import { MetricItem } from '../types';

export const SCIENTIFIC_METRICS: MetricItem[] = [
  {
    label: 'DFT Calculations Executed',
    value: '5,000+',
    description: 'High-throughput electronic structure, hybrid functional calculations, and Bader partitioning',
  },
  {
    label: 'Open Scientific Repositories',
    value: '15',
    description: 'First-principles DFT, numerical methods, ML discovery, and Slurm orchestration',
  },
  {
    label: 'Computational Domains',
    value: '5',
    description: 'Electronic Structure, Fortran Numerics, AI Automation, HPC Infra, Academic Workflows',
  },
  {
    label: 'HPC Execution Scale',
    value: '1,000+ Cores',
    description: 'Distributed Slurm workload execution across academic supercomputing clusters',
  },
];

export const RESEARCH_DOMAINS = [
  {
    id: 'dft',
    name: 'Density Functional Theory & 2D Materials',
    code: 'DFT-MAT',
    description: 'High-throughput electronic structure theory, VASP 6.x / SIESTA automation, hybrid HSE06 functional benchmarking, and Henkelman Bader charge partitioning.',
    icon: 'Atom',
  },
  {
    id: 'numerical',
    name: 'Numerical Computing & Algorithmic Physics',
    code: 'NUM-PHY',
    description: 'Modern Fortran 90/95 high-performance scientific kernels, differential equation solvers, Monte Carlo integrations, and algorithmic MATLAB translations.',
    icon: 'Binary',
  },
  {
    id: 'ai',
    name: 'AI & Scientific Automation',
    code: 'AI-AUTO',
    description: 'LLM agents for literature extraction, mathematical axiomatization, optical document parsing, and cognitive continuous evaluation.',
    icon: 'Sparkles',
  },
  {
    id: 'hpc',
    name: 'Linux & HPC Cluster Administration',
    code: 'HPC-INF',
    description: 'Slurm workload manager telemetry, real-time Discord daemon daemons, multi-cluster dispatching across Iskay, Huk, Carbono, and Arch.',
    icon: 'Terminal',
  },
  {
    id: 'academic',
    name: 'Academic Document Processing & LaTeX',
    code: 'TEX-DOC',
    description: 'Institutional LaTeX templates (UNMSM), automated equation derivation formats, and collaborative Git/GitHub revision control manuals.',
    icon: 'FileText',
  },
];
