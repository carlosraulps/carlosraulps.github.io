import React, { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Sparkles, Filter } from 'lucide-react';
import { PROJECTS } from '../../data/projects';
import { ProjectCategory, ProjectMetadata } from '../../types';
import { ProjectCard } from './ProjectCard';

interface ProjectDiscoveryProps {
  onOpenDetails: (project: ProjectMetadata) => void;
}

const CATEGORIES: { id: ProjectCategory; label: string }[] = [
  { id: 'all', label: 'All Repositories' },
  { id: 'featured', label: 'Featured Platforms' },
  { id: 'dft', label: 'DFT & Materials' },
  { id: 'numerical', label: 'Numerical Computing' },
  { id: 'ai', label: 'AI & Automation' },
  { id: 'hpc', label: 'Linux & HPC' },
  { id: 'academic', label: 'LaTeX & Study' },
];

export function ProjectDiscovery({ onOpenDetails }: ProjectDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProjectCategory>('all');

  const filteredProjects = useMemo(() => {
    return PROJECTS.filter((project) => {
      // Category filter
      if (activeCategory === 'featured' && !project.featured) return false;
      if (activeCategory === 'dft' && project.category !== 'featured' && project.category !== 'dft') return false;
      if (activeCategory === 'numerical' && project.category !== 'numerical') return false;
      if (activeCategory === 'ai' && project.category !== 'ai') return false;
      if (activeCategory === 'hpc' && project.category !== 'hpc') return false;
      if (activeCategory === 'academic' && project.category !== 'academic') return false;

      // Text search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const matchTitle = project.title.toLowerCase().includes(query);
      const matchDesc = project.shortDescription.toLowerCase().includes(query) || project.fullDescription.toLowerCase().includes(query);
      const matchLang = project.primaryLanguage.toLowerCase().includes(query);
      const matchTags = project.techStack.some((t) => t.toLowerCase().includes(query));
      const matchDomain = project.scientificDomain.toLowerCase().includes(query);

      return matchTitle || matchDesc || matchLang || matchTags || matchDomain;
    });
  }, [searchQuery, activeCategory]);

  return (
    <section id="projects-catalog" className="py-12 md:py-16 border-b border-forest-800/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-terracotta-600 font-semibold">
                Open-Source Directory
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-normal text-forest-950 tracking-tight">
              Research Repositories & Scientific Applications
            </h2>
            <p className="mt-1 text-sm text-ink-700 max-w-2xl">
              Search by algorithmic topic, programming language, materials theory, or computational stack.
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search algorithms, VASP, Fortran..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white border border-forest-800/20 text-xs font-mono text-forest-950 placeholder-ink-400 focus:outline-none focus:ring-1 focus:ring-forest-800 focus:border-forest-800 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-ink-400 hover:text-ink-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            // Count projects in this category
            const count = PROJECTS.filter((p) => {
              if (cat.id === 'all') return true;
              if (cat.id === 'featured') return p.featured;
              if (cat.id === 'dft') return p.category === 'featured' || p.category === 'dft';
              return p.category === cat.id;
            }).length;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-forest-800 text-ivory-50 border-forest-800 font-semibold shadow-sm'
                    : 'bg-white text-ink-700 border-forest-800/15 hover:bg-forest-100/60'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`ml-1.5 text-[10px] opacity-75 ${active ? 'text-forest-200' : 'text-ink-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Filters / Status Banner */}
        <div className="flex items-center justify-between text-xs font-mono text-ink-600 mb-6 pb-3 border-b border-forest-800/10">
          <div>
            Showing <strong className="text-forest-900">{filteredProjects.length}</strong> of{' '}
            <strong>{PROJECTS.length}</strong> research repositories
            {searchQuery && <span> matching "{searchQuery}"</span>}
          </div>

          {(searchQuery || activeCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-terracotta-600 hover:text-terracotta-800 underline text-[11px]"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-lg bg-white border border-forest-800/15 my-6">
            <Sparkles className="w-8 h-8 text-forest-600 mx-auto mb-3" />
            <h3 className="text-lg font-serif font-bold text-forest-950">
              No matching research repositories found
            </h3>
            <p className="text-xs text-ink-600 mt-1 max-w-sm mx-auto">
              No repositories match your current query "{searchQuery}". Try searching for broader terms like "Fortran", "DFT", or "Python".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="mt-4 px-4 py-2 rounded bg-forest-800 text-ivory-50 text-xs font-mono transition-colors"
            >
              Clear Search Query
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
