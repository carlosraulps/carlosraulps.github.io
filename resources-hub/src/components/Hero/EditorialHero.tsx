import React from 'react';
import { ArrowDown, Atom, Sparkles, Terminal, Code2, Compass } from 'lucide-react';
import { SCIENTIFIC_METRICS } from '../../data/scientificMetrics';

export function EditorialHero() {
  return (
    <section id="overview" className="relative pt-12 pb-14 md:pt-16 md:pb-20 border-b border-forest-800/10 bg-editorial-grid overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Eyebrow / System Stamp */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium tracking-wide bg-forest-100 text-forest-900 border border-forest-800/15">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-700 animate-pulse"></span>
            CARLOS RAÚL · COMPUTATIONAL SCIENCE LABORATORY
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-ink-500">
            UNMSM (Lima) · UFABC (São Paulo)
          </span>
        </div>

        {/* Editorial Display Heading */}
        <div className="max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-forest-950 tracking-tight leading-[1.08] mb-5">
            Interactive Scientific Computing, <br className="hidden sm:inline" />
            <span className="italic text-forest-800">First-Principles Materials</span> & Research Infrastructure
          </h1>

          <p className="text-base sm:text-lg text-ink-800 leading-relaxed max-w-2xl font-sans">
            A curated portfolio of open-source research software, high-throughput Density Functional Theory (DFT) platforms, high-performance Fortran numerical kernels, and distributed HPC orchestration tools.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex items-center gap-3 flex-wrap font-mono text-xs">
          <a
            href="#carbon-atlas"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-forest-800 hover:bg-forest-900 text-ivory-50 font-medium transition-all shadow-sm hover:shadow active:scale-[0.98]"
          >
            <Atom className="w-4 h-4 text-forest-300" />
            <span>Launch Carbon Atlas 3D</span>
          </a>

          <a
            href="#projects-catalog"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-white hover:bg-ivory-100 text-ink-800 border border-forest-800/20 font-medium transition-all shadow-sm active:scale-[0.98]"
          >
            <Code2 className="w-4 h-4 text-forest-700" />
            <span>Browse All 15 Repositories</span>
          </a>

          <a
            href="#linux-hpc"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-white hover:bg-ivory-100 text-ink-800 border border-forest-800/20 font-medium transition-all shadow-sm active:scale-[0.98]"
          >
            <Terminal className="w-4 h-4 text-forest-700" />
            <span>HPC Telemetry</span>
          </a>
        </div>

        {/* Scientific Metrics Quad-Strip */}
        <div className="mt-12 pt-8 border-t border-forest-800/15 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {SCIENTIFIC_METRICS.map((metric, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-white/80 backdrop-blur-sm border border-forest-800/10 shadow-editorial">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
                {metric.value}
              </div>
              <div className="text-xs font-mono font-semibold text-terracotta-600 mt-1 uppercase tracking-wide">
                {metric.label}
              </div>
              <div className="text-[11px] text-ink-600 font-sans mt-1 leading-snug">
                {metric.description}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
