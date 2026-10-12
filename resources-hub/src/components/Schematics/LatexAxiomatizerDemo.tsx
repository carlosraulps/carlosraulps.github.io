import React, { useState } from 'react';
import { FileText, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';

const SAMPLES = [
  {
    title: 'Thermodynamic Virial Theorem',
    raw: '2<T> + <V> = 0 for 1/r potential, kinetic pressure P = 2/3 (E_kin / V) + 1/3 (sum r_i F_i / V)',
    latex: `\\begin{theorem}[Quantum Virial Relation]
\\label{thm:virial}
For a non-relativistic $N$-body quantum system governed by homogeneous Coulombic potentials $V(\\mathbf{r})$, the expectation values satisfy:
\\begin{equation}
  2\\langle \\hat{T} \\rangle + \\langle \\hat{V} \\rangle = 0
\\end{equation}
The macroscopic virial pressure tensor contracts to the scalar relation:
\\begin{equation}
  P = \\frac{2}{3} \\frac{\\langle E_{\\mathrm{kin}} \\rangle}{\\Omega} + \\frac{1}{3\\Omega} \\sum_{i=1}^{N} \\langle \\mathbf{r}_i \\cdot \\mathbf{F}_i \\rangle
\\end{equation}
\\end{theorem}`,
  },
  {
    title: 'Kohn-Sham DFT Functional',
    raw: 'E[n] = T_s[n] + int V_ext n dr + 1/2 int int n(r)n(r\')/|r-r\'| dr dr\' + E_xc[n]',
    latex: `\\begin{definition}[Kohn-Sham Energy Functional]
\\label{def:ks_energy}
The ground-state electronic energy functional under the Hohenberg-Kohn mapping is uniquely expressed by:
\\begin{equation}
  E[n] = T_{\\mathrm{s}}[n] + \\int v_{\\mathrm{ext}}(\\mathbf{r}) n(\\mathbf{r}) \\, \\mathrm{d}^3\\mathbf{r} + E_{\\mathrm{H}}[n] + E_{\\mathrm{xc}}[n]
\\end{equation}
where the classical Hartree electrostatic repulsion evaluates as:
\\begin{equation}
  E_{\\mathrm{H}}[n] = \\frac{1}{2} \\iint \\frac{n(\\mathbf{r}) n(\\mathbf{r}')}{\\lvert \\mathbf{r} - \\mathbf{r}' \\rvert} \\, \\mathrm{d}^3\\mathbf{r} \\, \\mathrm{d}^3\\mathbf{r}'
\\end{equation}
\\end{definition}`,
  },
];

export function LatexAxiomatizerDemo() {
  const [selectedSample, setSelectedSample] = useState(0);
  const [copied, setCopied] = useState(false);

  const sample = SAMPLES[selectedSample];

  const handleCopy = () => {
    navigator.clipboard.writeText(sample.latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-forest-800/15 bg-white p-5 shadow-editorial">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-forest-800/10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-forest-700" />
          <h4 className="text-sm font-serif font-bold text-forest-900">
            Automated Mathematical Axiomatizer · LLM Agent
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-800/15">
          code-axiomatization
        </span>
      </div>

      {/* Sample Switcher Tabs */}
      <div className="flex items-center gap-2 mb-3">
        {SAMPLES.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedSample(idx)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              selectedSample === idx
                ? 'bg-forest-800 text-ivory-50 font-medium'
                : 'bg-ivory-100 text-ink-700 hover:bg-forest-100'
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Raw Derivation Input */}
        <div className="p-3.5 rounded bg-ivory-50 border border-forest-800/15 text-xs font-mono flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 flex items-center gap-1">
              <span>Input: Raw Physical Derivation / Note</span>
            </div>
            <p className="text-ink-800 leading-relaxed font-mono bg-white p-2.5 rounded border border-forest-800/10">
              {sample.raw}
            </p>
          </div>
          <div className="text-[10px] text-ink-500 mt-2">
            Inferred Context: First-Principles Quantum Physics & Statistical Mechanics
          </div>
        </div>

        {/* Right: Axiomatized LaTeX Output */}
        <div className="p-3.5 rounded bg-forest-950 text-forest-100 border border-forest-900 text-xs font-mono flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-forest-400 mb-1 pb-1 border-b border-forest-800/50">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-forest-400" />
                <span>Axiomatized LaTeX Syntax</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-forest-300 hover:text-white transition-colors"
                title="Copy LaTeX code"
              >
                {copied ? <Check className="w-3 h-3 text-forest-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy TeX'}</span>
              </button>
            </div>
            <pre className="text-[11px] text-forest-200 overflow-x-auto p-2 bg-forest-900/60 rounded whitespace-pre-wrap leading-tight max-h-[140px]">
              {sample.latex}
            </pre>
          </div>
          <div className="text-[10px] text-forest-400 mt-2 flex items-center justify-between">
            <span>Theorem Scope: Scoped & Numbered</span>
            <span className="text-forest-300">XeLaTeX Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
