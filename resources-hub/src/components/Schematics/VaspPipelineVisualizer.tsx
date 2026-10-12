import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, ArrowRight, Server, Shield, Layers, RefreshCw } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  sub: string;
  details: string;
  codeSnippet: string;
  metric: string;
  status: 'passed' | 'active' | 'warning';
}

const PIPELINE_STEPS: Step[] = [
  {
    id: 1,
    title: 'Crystal Ingestion & K-Mesh',
    sub: 'Pymatgen & ASE Sanitization',
    details: 'Validates space group symmetry, generates standardized primitive cells, and generates Monkhorst-Pack or Gamma-centered k-point grids based on reciprocal lattice lengths.',
    codeSnippet: 'kpoints = Kpoints.monkhorst_automatic(grid_density=45)\nstructure = Structure.from_file("POSCAR")\nincar["ENCUT"] = 520  # eV benchmark',
    metric: '45 k-points / Å⁻¹',
    status: 'passed',
  },
  {
    id: 2,
    title: 'Slurm Cluster Dispatch',
    sub: 'Zero-Redundancy Job Submission',
    details: 'Dispatches job to optimal partition across HPC clusters (Iskay, Huk, Carbono, Arch) with empirical core-count optimization and MPI ranks binding.',
    codeSnippet: 'sbatch --partition=batch \\\n       --nodes=2 --ntasks-per-node=32 \\\n       --time=24:00:00 --job-name=vasp_opt',
    metric: '64 MPI Cores allocated',
    status: 'passed',
  },
  {
    id: 3,
    title: 'SCF Convergence Guard',
    sub: 'Pulay Mixing & Sloshing Prevention',
    details: 'Monitors ionic and electronic steps in real-time. Automatically diagnoses charge-sloshing oscillations in extended polymers and activates Pulay mixing damping.',
    codeSnippet: '# Auto-healed SCF oscillation:\nDM.MixingWeight       0.04\nDM.NumberPulay        5\ncheck: grep -q "End of run" run.log',
    metric: 'NELM: 60 | dE < 1e-6 eV',
    status: 'warning',
  },
  {
    id: 4,
    title: 'Bader Charge & DOS Analysis',
    sub: 'Henkelman Partitioning & Output',
    details: 'Executes Henkelman Bader algorithm on total electron density (CHGCAR + AECCAR0/2), parsing atomic net charges and projecting orbital DOS onto Fermi level.',
    codeSnippet: 'bader CHGCAR -ref CHGCAR_sum\nparsed_charges = HenkelmanParser("ACF.dat")\nwrite_bader_json(parsed_charges)',
    metric: 'ΔQ conservation: < 0.001 e',
    status: 'passed',
  },
];

export function VaspPipelineVisualizer() {
  const [activeStepId, setActiveStepId] = useState<number>(3);
  const activeStep = PIPELINE_STEPS.find((s) => s.id === activeStepId) || PIPELINE_STEPS[0];

  return (
    <div className="rounded-lg border border-forest-800/15 bg-white p-5 shadow-editorial">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-forest-800/10">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-forest-700" />
          <h4 className="text-sm font-serif font-bold text-forest-900">
            VASP Automation Engine · Execution Lifecycle
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-800/15">
          Event-Driven Architecture
        </span>
      </div>

      {/* Step Tracker Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {PIPELINE_STEPS.map((step) => {
          const isSelected = step.id === activeStepId;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStepId(step.id)}
              className={`p-2.5 rounded text-left transition-all border ${
                isSelected
                  ? 'bg-forest-900 text-ivory-50 border-forest-900 shadow-sm'
                  : 'bg-ivory-50 text-ink-800 border-forest-800/15 hover:bg-forest-100/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono ${isSelected ? 'text-forest-300' : 'text-ink-500'}`}>
                  Phase 0{step.id}
                </span>
                {step.status === 'warning' ? (
                  <Shield className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-amber-600'}`} />
                ) : (
                  <CheckCircle2 className={`w-3 h-3 ${isSelected ? 'text-forest-300' : 'text-forest-600'}`} />
                )}
              </div>
              <div className="text-xs font-semibold truncate leading-tight">
                {step.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Deep-Dive */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-ivory-50/70 p-4 rounded border border-forest-800/10">
        <div className="md:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-forest-900">
                {activeStep.title}
              </span>
              <span className="text-[11px] text-ink-500 font-sans">
                ({activeStep.sub})
              </span>
            </div>
            <p className="text-xs text-ink-700 leading-relaxed mt-2 font-sans">
              {activeStep.details}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-forest-800/10 flex items-center justify-between text-[11px] font-mono text-ink-600">
            <span>Diagnostic Telemetry:</span>
            <span className="font-semibold text-forest-800">{activeStep.metric}</span>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="md:col-span-5 bg-forest-950 p-3 rounded font-mono text-[11px] text-forest-100 overflow-x-auto border border-forest-900 flex flex-col justify-between">
          <div className="text-[10px] text-forest-400 border-b border-forest-800/50 pb-1 mb-2 uppercase">
            Runtime Routine
          </div>
          <pre className="text-forest-200 leading-snug whitespace-pre-wrap">
            {activeStep.codeSnippet}
          </pre>
          <div className="mt-2 pt-1 border-t border-forest-800/50 text-[10px] text-forest-400 flex items-center justify-between">
            <span>Status: Verified</span>
            <span className="text-terracotta-400">Zero Sloshing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
