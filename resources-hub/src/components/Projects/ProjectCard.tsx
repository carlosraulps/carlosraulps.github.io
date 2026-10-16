import React from 'react';
import { ExternalLink, Github, Download, ArrowUpRight, Cpu, Layers } from 'lucide-react';
import { ProjectMetadata } from '../../types';

interface ProjectCardProps {
  project: ProjectMetadata;
  onOpenDetails: (project: ProjectMetadata) => void;
}

export function ProjectCard({ project, onOpenDetails }: ProjectCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg bg-white border border-forest-800/15 p-5 shadow-editorial hover:shadow-editorial-hover transition-all duration-200 group relative">
      
      {/* Top Header: Category & Language */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono mb-3">
          <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium bg-forest-50 text-forest-800 border border-forest-800/10">
            {project.category}
          </span>
          <div className="flex items-center gap-1.5 text-ink-600 text-[11px]">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: project.languageColor }}
            />
            <span>{project.primaryLanguage}</span>
          </div>
        </div>

        {/* Project Title */}
        <h3 className="text-xl font-serif font-bold text-forest-950 tracking-tight group-hover:text-forest-700 transition-colors">
          {project.title}
        </h3>

        {/* Short Description */}
        <p className="mt-2 text-xs sm:text-[13px] text-ink-700 leading-relaxed font-sans">
          {project.shortDescription}
        </p>

        {/* Highlights Preview */}
        {project.highlights.length > 0 && (
          <ul className="mt-3.5 space-y-1.5 text-[11px] text-ink-600 font-sans border-t border-forest-800/10 pt-3">
            {project.highlights.slice(0, 2).map((h, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-forest-600 font-bold">•</span>
                <span className="truncate">{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Area: Tech Tags & Buttons */}
      <div className="mt-5 pt-3.5 border-t border-forest-800/10">
        
        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.techStack.slice(0, 4).map((tech, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-ivory-100 text-ink-700 border border-forest-800/10"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-500">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => onOpenDetails(project)}
            className="inline-flex items-center gap-1 text-forest-800 hover:text-forest-950 font-semibold transition-colors group-hover:underline"
          >
            <span>Details & Schematics</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            {project.downloadUrl && (
              <a
                href={project.downloadUrl}
                download
                className="p-1.5 rounded hover:bg-forest-100 text-ink-700 transition-colors"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {project.liveDemoUrl && (
              <a
                href={project.liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-forest-100 text-ink-700 transition-colors"
                title="Live Application Demo"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {project.githubUrl && project.githubUrl !== project.liveDemoUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-forest-100 text-ink-700 transition-colors"
                title="GitHub Repository"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
