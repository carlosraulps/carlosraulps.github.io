import React from 'react';
import { ArrowUp, Github, Mail, Globe, BookOpen, ShieldCheck } from 'lucide-react';

export function EditorialFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-20 border-t border-forest-800/15 bg-ivory-100/70 pt-14 pb-12 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Colophon Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-forest-800/10">
          
          {/* Column 1: Identity & Research Statement (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-forest-800 flex items-center justify-center text-ivory-50 text-xs font-mono font-bold">
                CR
              </div>
              <span className="font-serif text-xl font-bold text-forest-950">
                Carlos Raúl Primo Ramos
              </span>
            </div>
            <p className="text-xs text-ink-700 leading-relaxed font-sans max-w-sm">
              Computational physics and mathematical modeling researcher specializing in Density Functional Theory, electronic structure simulations, and high-performance scientific software development.
            </p>
            <div className="text-[11px] font-mono text-ink-500 pt-1">
              Affiliations: Universidad Nacional Mayor de San Marcos (UNMSM) · Universidade Federal do ABC (UFABC)
            </div>
          </div>

          {/* Column 2: Academic Links (3 cols) */}
          <div className="md:col-span-3 space-y-2.5 font-mono text-xs">
            <div className="text-[10.5px] uppercase tracking-wider text-forest-800 font-semibold mb-2">
              Academic Navigation
            </div>
            <ul className="space-y-1.5 text-ink-700">
              <li><a href="/" className="hover:text-forest-900 transition-colors">Main Portfolio & Home</a></li>
              <li><a href="/publications/" className="hover:text-forest-900 transition-colors">Publications & Articles</a></li>
              <li><a href="/projects/" className="hover:text-forest-900 transition-colors">Academic Projects</a></li>
              <li><a href="/cv/" className="hover:text-forest-900 transition-colors">Curriculum Vitae (CV)</a></li>
              <li><a href="/resources/" className="text-forest-900 font-bold">Resources Hub (Current)</a></li>
            </ul>
          </div>

          {/* Column 3: Flagships & Downloads (4 cols) */}
          <div className="md:col-span-4 space-y-2.5 font-mono text-xs">
            <div className="text-[10.5px] uppercase tracking-wider text-forest-800 font-semibold mb-2">
              Flagship Applications & Open Notes
            </div>
            <ul className="space-y-2 text-ink-700">
              <li>
                <a
                  href="/2d-carbon-explorer/"
                  className="hover:text-forest-900 transition-colors flex items-center justify-between"
                >
                  <span>Carbon Atlas (2D Carbon Explorer)</span>
                  <span className="text-[10px] text-terracotta-600">Live App ↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/carlosraulps/VASP-automatization-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-forest-900 transition-colors flex items-center justify-between"
                >
                  <span>VASP Automatization Platform</span>
                  <span className="text-[10px] text-forest-700">GitHub ↗</span>
                </a>
              </li>
              <li>
                <a
                  href="/files/apuntes_de_Git_y_Github.pdf"
                  download
                  className="hover:text-forest-900 transition-colors flex items-center justify-between"
                >
                  <span>Apuntes de Git y GitHub (PDF)</span>
                  <span className="text-[10px] text-forest-700">Download ⭳</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/carlosraulps/VASP-automatization-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-forest-900 transition-colors flex items-center justify-between"
                >
                  <span>VASP-automatization-platform</span>
                  <span className="text-[10px] text-ink-500">GitHub ↗</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, License, Back to Top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-500">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Carlos Raúl Primo Ramos</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
              <span>MIT License</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="mailto:carlos.primo@unmsm.edu.pe"
              className="hover:text-forest-900 transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>carlos.primo@unmsm.edu.pe</span>
            </a>

            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-forest-100 border border-forest-800/15 text-forest-900 font-medium transition-colors shadow-sm"
              aria-label="Return to top of page"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
