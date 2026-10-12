import React, { useEffect } from 'react';
import { X, ExternalLink, Github, Download, CheckCircle2, ShieldCheck, Terminal, Layers } from 'lucide-react';
import { ProjectMetadata } from '../../types';
import { VaspPipelineVisualizer } from '../Schematics/VaspPipelineVisualizer';
import { NumericalConvergencePlot } from '../Schematics/NumericalConvergencePlot';
import { SlurmClusterTelemetry } from '../Schematics/SlurmClusterTelemetry';
import { LatexAxiomatizerDemo } from '../Schematics/LatexAxiomatizerDemo';

interface ProjectModalProps {
  project: ProjectMetadata | null;
  onClose: () => void;
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (project) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-forest-950/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl rounded-xl bg-white border border-forest-800/20 shadow-modal overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-forest-800/10 bg-ivory-50/70">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-forest-100 text-forest-800 border border-forest-800/15">
              {project.category}
            </span>
            <span className="text-xs font-mono text-ink-500">
              {project.scientificDomain}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-forest-100 text-ink-700 transition-colors"
            aria-label="Close project modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Header */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 tracking-tight">
              {project.title}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs font-mono text-ink-600">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: project.languageColor }}
              />
              <span className="font-semibold text-ink-800">{project.primaryLanguage}</span>
              <span>•</span>
              <span>Open-Source Research Software</span>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="text-sm text-ink-800 leading-relaxed font-sans space-y-2">
            <p>{project.fullDescription}</p>
          </div>

          {/* Interactive Schematic Embed (if available) */}
          {project.schematicType === 'vasp-workflow' && (
            <div className="mt-4">
              <VaspPipelineVisualizer />
            </div>
          )}

          {project.schematicType === 'numerical-convergence' && (
            <div className="mt-4">
              <NumericalConvergencePlot />
            </div>
          )}

          {project.schematicType === 'hpc-cluster' && (
            <div className="mt-4">
              <SlurmClusterTelemetry />
            </div>
          )}

          {project.schematicType === 'latex-axiomatizer' && (
            <div className="mt-4">
              <LatexAxiomatizerDemo />
            </div>
          )}

          {/* Key Capabilities / Highlights */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2.5">
              Key Scientific Capabilities & Implementations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {project.highlights.map((h, i) => (
                <div key={i} className="p-2.5 rounded bg-ivory-50 border border-forest-800/10 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-forest-700 shrink-0 mt-0.5" />
                  <span className="text-ink-800 leading-tight">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Tech Stack */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">
              Technology Stack & Dependencies
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {project.techStack.map((tech, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded text-xs font-mono bg-ivory-100 text-ink-800 border border-forest-800/15"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-forest-800/10 bg-ivory-50/70 flex items-center justify-between text-xs font-mono">
          <div className="text-ink-500 text-[11px]">
            Repository: carlosraulps/{project.id}
          </div>

          <div className="flex items-center gap-2.5">
            {project.downloadUrl && (
              <a
                href={project.downloadUrl}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-ivory-100 border border-forest-800/20 text-ink-800 font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-forest-700" />
                <span>Download PDF Guide</span>
              </a>
            )}

            {project.liveDemoUrl && (
              <a
                href={project.liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-forest-800 hover:bg-forest-900 text-white font-medium transition-colors"
              >
                <span>Launch Live Application</span>
                <ExternalLink className="w-3.5 h-3.5 text-forest-300" />
              </a>
            )}

            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-ivory-100 border border-forest-800/20 text-ink-800 font-medium transition-colors"
            >
              <Github className="w-3.5 h-3.5 text-forest-700" />
              <span>Source Repository</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
