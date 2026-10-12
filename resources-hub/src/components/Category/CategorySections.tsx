import React from 'react';
import { Atom, Binary, Sparkles, Terminal, FileText, ArrowRight, Download, ExternalLink, Github } from 'lucide-react';
import { ProjectMetadata } from '../../types';
import { VaspPipelineVisualizer } from '../Schematics/VaspPipelineVisualizer';
import { NumericalConvergencePlot } from '../Schematics/NumericalConvergencePlot';
import { SlurmClusterTelemetry } from '../Schematics/SlurmClusterTelemetry';
import { LatexAxiomatizerDemo } from '../Schematics/LatexAxiomatizerDemo';

interface CategorySectionsProps {
  onOpenDetails: (project: ProjectMetadata) => void;
}

export function CategorySections({ onOpenDetails }: CategorySectionsProps) {
  return (
    <div className="space-y-16 py-8">
      
      {/* 1. DFT & Materials Science Deep Dive */}
      <section id="dft-materials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center gap-2 mb-2">
          <Atom className="w-4 h-4 text-forest-700" />
          <span className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">
            Domain 01 · First-Principles Condensed Matter
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
          Density Functional Theory & 2D Materials
        </h3>
        <p className="mt-1 text-sm text-ink-700 max-w-3xl leading-relaxed mb-6 font-sans">
          Transitioning from empirical linear scripting to modular, event-driven DFT workflows. Incorporates automated Pulay mixing convergence protocols for large and polymeric systems, hybrid HSE06 functional benchmarking, and Henkelman Bader charge partitioning.
        </p>

        {/* Embedded Interactive VASP Schematic */}
        <VaspPipelineVisualizer />
      </section>

      {/* 2. Numerical Computing Deep Dive */}
      <section id="numerical-computing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-forest-800/10">
        <div className="flex items-center gap-2 mb-2">
          <Binary className="w-4 h-4 text-forest-700" />
          <span className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">
            Domain 02 · Algorithmic Physics & High Performance
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
          Numerical Computing in Modern Fortran & MATLAB
        </h3>
        <p className="mt-1 text-sm text-ink-700 max-w-3xl leading-relaxed mb-6 font-sans">
          Rigorous computational physics algorithms implemented with double-precision IEEE-754 arithmetic in Fortran 90/95. Covers adaptive Runge-Kutta ODE integrators, Gauss-Legendre quadrature, and cubic spline interpolation with strict benchmark error analysis.
        </p>

        {/* Embedded Interactive Convergence Plot */}
        <NumericalConvergencePlot />
      </section>

      {/* 3. AI & Scientific Automation Deep Dive */}
      <section id="ai-automation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-forest-800/10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-forest-700" />
          <span className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">
            Domain 03 · Cognitive Research Augmentation
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
          AI & Scientific Automation Pipelines
        </h3>
        <p className="mt-1 text-sm text-ink-700 max-w-3xl leading-relaxed mb-6 font-sans">
          Harnessing multimodal large language models and cognitive agents for high-throughput scientific paper extraction (Gemini API), derivation axiomatization into compile-ready LaTeX, and automated evaluation of physics coursework.
        </p>

        {/* Embedded Interactive LaTeX Axiomatizer */}
        <LatexAxiomatizerDemo />
      </section>

      {/* 4. Linux & HPC Administration Deep Dive */}
      <section id="linux-hpc" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-forest-800/10">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4 text-forest-700" />
          <span className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">
            Domain 04 · Infrastructure & Cluster Orchestration
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
          Linux & HPC Cluster Administration
        </h3>
        <p className="mt-1 text-sm text-ink-700 max-w-3xl leading-relaxed mb-6 font-sans">
          Production daemon architectures for monitoring Slurm clusters across Iskay, Huk, Carbono, and Arch. Real-time Discord alerting with strict completion verification, alongside personalized Qtile/Neovim developer dotfiles.
        </p>

        {/* Embedded Interactive Slurm Telemetry */}
        <SlurmClusterTelemetry />
      </section>

      {/* 5. Academic Templates & Study Resources */}
      <section id="academic-study" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-forest-800/10">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-forest-700" />
          <span className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">
            Domain 05 · Academic Publication & Study Manuals
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
          Academic Templates & Open Study Resources
        </h3>
        <p className="mt-1 text-sm text-ink-700 max-w-3xl leading-relaxed mb-6 font-sans">
          Institutional LaTeX templates compliant with UNMSM dissertation standards, self-taught computational Python problem sets with pytest, and authored Spanish study manuals on collaborative Git/GitHub revision control.
        </p>

        {/* Study Guides Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Git & GitHub Guide Card */}
          <div className="p-6 rounded-lg bg-white border border-forest-800/15 shadow-editorial flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="px-2 py-0.5 rounded bg-forest-100 text-forest-800">
                  Study Guide (Spanish)
                </span>
                <span className="text-ink-500">PDF Document</span>
              </div>
              <h4 className="text-xl font-serif font-bold text-forest-950">
                Apuntes de Git y GitHub (Guía Práctica)
              </h4>
              <p className="text-xs text-ink-700 mt-2 leading-relaxed font-sans">
                My personal study notes on collaborative version control: internal commit DAG graphs, branch management, rebase vs merge trade-offs, and GitHub PR workflows.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-forest-800/10 flex items-center justify-between">
              <span className="text-xs font-mono text-ink-600">
                Format: Clean PDF Document
              </span>
              <a
                href="/files/apuntes_de_Git_y_Github.pdf"
                download
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-forest-800 hover:bg-forest-900 text-ivory-50 text-xs font-mono font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-forest-300" />
                <span>Download Git Notes (PDF)</span>
              </a>
            </div>
          </div>

          {/* UNMSM LaTeX Template Card */}
          <div className="p-6 rounded-lg bg-white border border-forest-800/15 shadow-editorial flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="px-2 py-0.5 rounded bg-forest-100 text-forest-800">
                  Institutional TeX System
                </span>
                <span className="text-ink-500">UNMSM Physics</span>
              </div>
              <h4 className="text-xl font-serif font-bold text-forest-950">
                thesis-UNMSM-template
              </h4>
              <p className="text-xs text-ink-700 mt-2 leading-relaxed font-sans">
                Official LaTeX template for theses and dissertations at the Universidad Nacional Mayor de San Marcos. Modular chapters, XeLaTeX font engine, and BibLaTeX citation standards.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-forest-800/10 flex items-center justify-between">
              <span className="text-xs font-mono text-ink-600">
                License: Open-Source MIT
              </span>
              <a
                href="https://github.com/carlosraulps/thesis-UNMSM-template"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-white hover:bg-ivory-100 border border-forest-800/20 text-ink-800 text-xs font-mono font-medium transition-colors"
              >
                <Github className="w-3.5 h-3.5 text-forest-700" />
                <span>View TeX Repository</span>
              </a>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
