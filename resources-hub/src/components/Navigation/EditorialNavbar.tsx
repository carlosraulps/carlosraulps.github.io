import React, { useState, useEffect } from 'react';
import { Atom, ExternalLink, Github, Menu, X, Terminal, BookOpen, Layers } from 'lucide-react';

export function EditorialNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const academicLinks = [
    { title: 'Home', href: '/' },
    { title: 'Resources', href: '/resources/', active: true },
    { title: 'Projects', href: '/projects/' },
    { title: 'Publications', href: '/publications/' },
    { title: 'CV', href: '/cv/' },
  ];

  const sectionAnchors = [
    { title: 'Overview', href: '#overview' },
    { title: 'Carbon Atlas ↗', href: 'https://2d-carbon-explorer.vercel.app/', external: true },
    { title: 'Featured Applications', href: '#featured-apps' },
    { title: 'DFT & Materials', href: '#dft-materials' },
    { title: 'Numerical Computing', href: '#numerical-computing' },
    { title: 'AI & Automation', href: '#ai-automation' },
    { title: 'Linux & HPC', href: '#linux-hpc' },
    { title: 'Academic & LaTeX', href: '#academic-study' },
  ];

  return (
    <header className={`sticky top-0 z-40 transition-all duration-200 ${
      scrolled 
        ? 'bg-[#F4F2E9]/95 backdrop-blur-md border-b border-forest-800/15 shadow-sm' 
        : 'bg-[#F4F2E9] border-b border-forest-800/10'
    }`}>
      {/* Tier 1: Academic Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 border-b border-forest-800/10">
          
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3">
            <a 
              href="/" 
              className="flex items-center gap-2 text-forest-900 hover:text-forest-700 transition-colors group"
            >
              <div className="px-2 h-7 rounded bg-forest-800 flex items-center justify-center text-ivory-50 text-xs font-mono font-bold tracking-wider group-hover:bg-forest-900 transition-colors">
                CRPS
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg tracking-tight font-bold text-forest-950 leading-none">
                  Carlos R. Primo S.
                </span>
                <span className="text-[10px] font-mono text-ink-500 uppercase tracking-wider mt-0.5">
                  Computational Physics & Materials Hub
                </span>
              </div>
            </a>
          </div>

          {/* Academic Pages Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            {academicLinks.map((link) => (
              <a
                key={link.title}
                href={link.href}
                className={`px-3 py-1.5 rounded transition-colors ${
                  link.active
                    ? 'bg-forest-800 text-ivory-50 font-semibold'
                    : 'text-ink-700 hover:text-forest-900 hover:bg-forest-100/60'
                }`}
              >
                {link.title}
              </a>
            ))}

            <div className="h-4 w-px bg-forest-800/20 mx-2" />

            {/* External Links */}
            <a
              href="https://github.com/carlosraulps"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded text-ink-700 hover:text-forest-900 hover:bg-forest-100 transition-colors"
              title="GitHub Profile"
            >
              <Github className="w-4 h-4" />
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded text-forest-900 hover:bg-forest-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Tier 2: In-Page Section Quick-Jumps (Desktop) */}
        <div className="hidden md:flex items-center justify-between h-9 text-[11px] font-mono text-ink-600 overflow-x-auto">
          <div className="flex items-center gap-4">
            <span className="text-terracotta-600 font-medium uppercase tracking-wider text-[10px]">
              Directory Index:
            </span>
            {sectionAnchors.map((anchor) => (
              <a
                key={anchor.title}
                href={anchor.href}
                target={anchor.external ? '_blank' : undefined}
                rel={anchor.external ? 'noopener noreferrer' : undefined}
                className={`whitespace-nowrap hover:text-forest-900 hover:underline transition-colors ${
                  anchor.external ? 'text-forest-800 font-semibold' : ''
                }`}
              >
                {anchor.title}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ink-500">
            <span>UNMSM · UFABC</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-forest-800/20 bg-[#F4F2E9] px-4 pt-3 pb-5 space-y-3 font-mono text-xs">
          <div className="text-[10px] uppercase text-ink-500 tracking-wider">Academic Pages</div>
          <div className="grid grid-cols-2 gap-1.5">
            {academicLinks.map((link) => (
              <a
                key={link.title}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded text-center ${
                  link.active ? 'bg-forest-800 text-white font-semibold' : 'bg-white text-ink-800 border border-forest-800/10'
                }`}
              >
                {link.title}
              </a>
            ))}
          </div>

          <div className="text-[10px] uppercase text-ink-500 tracking-wider pt-2">Resources Hub Sections</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {sectionAnchors.map((anchor) => (
              <a
                key={anchor.title}
                href={anchor.href}
                target={anchor.external ? '_blank' : undefined}
                rel={anchor.external ? 'noopener noreferrer' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 bg-ivory-50 rounded text-ink-800 hover:bg-forest-100 border border-forest-800/10 truncate"
              >
                {anchor.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
