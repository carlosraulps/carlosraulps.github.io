import React, { useState } from 'react';
import { ExternalLink, Github, Download, Compass, ShieldCheck, ChevronRight, Activity, Cpu } from 'lucide-react';
import { ALLOTROPES, SYNTHESIS_THRESHOLD_DELTA_E } from '../../data/carbonAtlasAllotropes';
import { AllotropeData, AllotropeAtom } from '../../types';
import { LatticeCanvas } from './LatticeCanvas';

export function CarbonAtlasShowcase() {
  const [selectedAllotrope, setSelectedAllotrope] = useState<AllotropeData>(ALLOTROPES[0]);
  const [selectedAtom, setSelectedAtom] = useState<AllotropeAtom | null>(ALLOTROPES[0].atoms[0]);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSelectAllotrope = (allotrope: AllotropeData) => {
    setSelectedAllotrope(allotrope);
    setSelectedAtom(allotrope.atoms[0] || null);
  };

  const handleExportPoscar = () => {
    const poscarContent = `${selectedAllotrope.name} 2D Monolayer
1.0
2.46784 0.00000 0.00000
-1.23392 2.13721 0.00000
0.00000 0.00000 20.00000
C
${selectedAllotrope.atoms.length}
Direct
${selectedAllotrope.atoms.map((a) => `${(a.cart_coords[0] / 2.46).toFixed(6)} ${(a.cart_coords[1] / 2.13).toFixed(6)} 0.500000`).join('\n')}
`;
    navigator.clipboard.writeText(poscarContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const isViable = selectedAllotrope.formation_energy_delta <= SYNTHESIS_THRESHOLD_DELTA_E;

  return (
    <section id="carbon-atlas" className="relative py-12 md:py-16 border-b border-forest-800/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-medium tracking-wider uppercase bg-forest-100 text-forest-800 border border-forest-800/15">
                Flagship Research Platform
              </span>
              <span className="text-xs font-mono text-terracotta-500 font-medium">
                Girão Taxonomy · 61 Allotropes
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-normal text-forest-950 tracking-tight">
              Carbon Atlas · 2D Allotrope Informatics
            </h2>
            <p className="mt-1 text-sm md:text-base text-ink-700 max-w-2xl leading-relaxed">
              Resolving nanoscience nomenclature collision via canonical mathematical ring invariants (${'A = x\\prod_n n^{a_n}'}$) and first-principles DFT stability anchors.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href="https://carlosraulps.github.io/2d-carbon-explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-forest-800 hover:bg-forest-900 text-ivory-50 text-xs font-mono font-medium transition-all shadow-sm hover:shadow active:scale-[0.98]"
            >
              <span>Launch Carbon Atlas</span>
              <ExternalLink className="w-3.5 h-3.5 text-forest-300" />
            </a>
            <a
              href="https://github.com/carlosraulps/2d-carbon-explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-white hover:bg-ivory-100 border border-forest-800/20 text-ink-800 text-xs font-mono font-medium transition-all shadow-sm active:scale-[0.98]"
            >
              <Github className="w-3.5 h-3.5 text-forest-700" />
              <span>Source</span>
            </a>
          </div>
        </div>

        {/* Main Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive 3D Canvas (Col 7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Allotrope Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-ivory-200/70 border border-forest-800/15 overflow-x-auto">
              {ALLOTROPES.map((allotrope) => {
                const active = allotrope.id === selectedAllotrope.id;
                return (
                  <button
                    key={allotrope.id}
                    onClick={() => handleSelectAllotrope(allotrope)}
                    className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all ${
                      active
                        ? 'bg-white text-forest-900 font-semibold shadow-sm border border-forest-800/10'
                        : 'text-ink-600 hover:text-ink-900 hover:bg-white/40'
                    }`}
                  >
                    <span>{allotrope.name}</span>
                    <span className="ml-1 text-[10px] opacity-60">({allotrope.code})</span>
                  </button>
                );
              })}
            </div>

            {/* 3D WebGL / 2D Canvas */}
            <LatticeCanvas
              allotrope={selectedAllotrope}
              selectedAtom={selectedAtom}
              onSelectAtom={setSelectedAtom}
            />

            {/* Selected Atom Inspector */}
            {selectedAtom && (
              <div className="p-3.5 rounded bg-white border border-forest-800/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-forest-100 border border-forest-800/15 flex items-center justify-center font-bold text-forest-900">
                    C
                  </div>
                  <div>
                    <div className="font-semibold text-ink-900">
                      Atom Site: {selectedAtom.site}
                    </div>
                    <div className="text-[11px] text-ink-500">
                      Coords: [{selectedAtom.cart_coords.map((c) => c.toFixed(2)).join(', ')}] Å
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-ink-500 uppercase tracking-wider">
                      Henkelman Bader Charge
                    </div>
                    <div className={`font-semibold text-xs ${
                      selectedAtom.bader_charge > 0.01
                        ? 'text-terracotta-500'
                        : selectedAtom.bader_charge < -0.01
                        ? 'text-forest-700'
                        : 'text-ink-700'
                    }`}>
                      {selectedAtom.bader_charge > 0 ? `+${selectedAtom.bader_charge.toFixed(3)}` : selectedAtom.bader_charge.toFixed(3)} e
                    </div>
                  </div>

                  <button
                    onClick={handleExportPoscar}
                    className="px-2.5 py-1.5 rounded border border-forest-800/20 bg-ivory-50 hover:bg-forest-100 text-ink-800 text-[11px] transition-colors flex items-center gap-1.5"
                    title="Copy POSCAR unit cell to clipboard"
                  >
                    <Download className="w-3 h-3 text-forest-700" />
                    <span>{copySuccess ? 'Copied POSCAR!' : 'Export POSCAR'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Scientific Informatics & Stability Benchmarks (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Overview Card */}
            <div className="p-5 rounded-lg bg-white border border-forest-800/15 shadow-editorial">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-forest-800/10">
                <div className="flex items-center gap-2">
                  <span className="text-base font-serif font-bold text-forest-900">
                    {selectedAllotrope.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-ivory-200 text-[10px] font-mono text-ink-700">
                    {selectedAllotrope.symbol}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-forest-700 font-medium">
                  {selectedAllotrope.crystal_system}
                </span>
              </div>

              <p className="text-xs text-ink-700 leading-relaxed mb-4">
                {selectedAllotrope.description}
              </p>

              {/* Crystallographic Properties Table */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                <div className="p-2 rounded bg-ivory-50 border border-forest-800/10">
                  <div className="text-[10px] text-ink-500 uppercase">Wallpaper Group</div>
                  <div className="font-semibold text-forest-900 mt-0.5">{selectedAllotrope.wallpaper_group}</div>
                </div>
                <div className="p-2 rounded bg-ivory-50 border border-forest-800/10">
                  <div className="text-[10px] text-ink-500 uppercase">3D Space Group</div>
                  <div className="font-semibold text-forest-900 mt-0.5">{selectedAllotrope.space_group}</div>
                </div>
                <div className="p-2 rounded bg-ivory-50 border border-forest-800/10">
                  <div className="text-[10px] text-ink-500 uppercase">Ring Invariant</div>
                  <div className="font-semibold text-terracotta-600 mt-0.5">{selectedAllotrope.ring_topology}</div>
                </div>
                <div className="p-2 rounded bg-ivory-50 border border-forest-800/10">
                  <div className="text-[10px] text-ink-500 uppercase">Polygon Types</div>
                  <div className="font-semibold text-forest-900 mt-0.5">
                    {selectedAllotrope.polygon_types.join('-')}-gon rings
                  </div>
                </div>
              </div>

              {/* Thermodynamic Viability Gauge */}
              <div className="pt-3 border-t border-forest-800/10">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="flex items-center gap-1.5 text-ink-800">
                    <Activity className="w-3.5 h-3.5 text-forest-700" />
                    <span>Formation Energy ΔE</span>
                  </span>
                  <span className="font-bold text-forest-900">
                    +{selectedAllotrope.formation_energy_delta.toFixed(3)} eV/atom
                  </span>
                </div>

                {/* Progress Bar Meter */}
                <div className="relative w-full h-3 rounded-full bg-ivory-200 overflow-hidden border border-forest-800/15">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      selectedAllotrope.formation_energy_delta <= 0.3
                        ? 'bg-forest-600'
                        : selectedAllotrope.formation_energy_delta <= SYNTHESIS_THRESHOLD_DELTA_E
                        ? 'bg-amber-600'
                        : 'bg-terracotta-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedAllotrope.formation_energy_delta / 0.6) * 100
                      )}%`,
                    }}
                  />
                  {/* Synthesis Threshold Marker at 0.456 eV */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-terracotta-600 z-10"
                    style={{ left: `${(SYNTHESIS_THRESHOLD_DELTA_E / 0.6) * 100}%` }}
                    title="Synthesis Benchmark (0.456 eV/atom)"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-ink-500 mt-1">
                  <span>0.000 eV (Graphene)</span>
                  <span className="text-terracotta-600 font-medium">Threshold: 0.456 eV</span>
                  <span>0.600 eV</span>
                </div>

                {/* Synthesis Status Badge */}
                <div className="mt-3 p-2.5 rounded bg-forest-50/70 border border-forest-800/15 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0" />
                  <div className="text-[11px] leading-tight text-forest-900 font-sans">
                    {isViable ? (
                      <span>
                        <strong>Thermodynamically Viable:</strong> ΔE is below the 0.456 eV/atom threshold, within reach of on-surface Ullmann coupling synthesis.
                      </span>
                    ) : (
                      <span>
                        <strong>High Formation Strain:</strong> Metastable high-energy phase requiring extreme nonequilibrium synthesis.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reference */}
              <div className="mt-4 pt-2 border-t border-forest-800/10 text-[10.5px] font-mono text-ink-500 flex items-center justify-between">
                <span>Literature Ground:</span>
                <span className="text-ink-700 italic truncate max-w-[240px]">
                  {selectedAllotrope.literatureRef}
                </span>
              </div>
            </div>

            {/* Seamless Transition Banner to Full App */}
            <a
              href="https://carlosraulps.github.io/2d-carbon-explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-lg bg-forest-900 text-ivory-50 border border-forest-800 hover:bg-forest-950 transition-all group flex items-center justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-forest-300 font-medium">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>PHOTH Quantum & Strain Lab</span>
                </div>
                <div className="text-sm font-serif font-normal text-white mt-0.5 group-hover:underline">
                  Explore Band Structures, HSE06 & Supercells →
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-forest-400 group-hover:translate-x-1 transition-transform" />
            </a>

          </div>
        </div>

      </div>
    </section>
  );
}
