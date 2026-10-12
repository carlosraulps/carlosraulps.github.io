import React, { useState } from 'react';
import { Activity, Binary, ArrowUpRight, Sliders } from 'lucide-react';

export function NumericalConvergencePlot() {
  const [stepSize, setStepSize] = useState<number>(0.1);

  // Theoretical error scaling for standard test problem dy/dt = -y, y(0)=1 on [0, 1]
  // Exact solution: y(1) = e^(-1) ≈ 0.36787944117
  // Euler error ~ C1 * h (O(h))
  // RK4 error ~ C2 * h^4 (O(h^4))
  const eulerError = Math.min(1.0, 0.5 * stepSize);
  const rk4Error = Math.max(1e-12, 0.04 * Math.pow(stepSize, 4));

  // Compute points for SVG log-log curve
  // Steps h from 0.02 to 0.5
  const sampleSteps = [0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5];
  
  // Coordinate mapping for SVG: x: [40, 360] representing h in [0.01, 0.5]
  // y: [20, 160] representing log10(error) from -8 to 0
  const mapX = (h: number) => 40 + ((Math.log10(h) - Math.log10(0.01)) / (Math.log10(0.5) - Math.log10(0.01))) * 320;
  const mapY = (err: number) => {
    const logErr = Math.max(-8, Math.log10(err));
    return 20 + ((0 - logErr) / 8) * 140;
  };

  const eulerPoints = sampleSteps.map((h) => `${mapX(h)},${mapY(0.5 * h)}`).join(' ');
  const rk4Points = sampleSteps.map((h) => `${mapX(h)},${mapY(Math.max(1e-8, 0.04 * Math.pow(h, 4)))}`).join(' ');

  const currentX = mapX(stepSize);
  const currentEulerY = mapY(eulerError);
  const currentRk4Y = mapY(rk4Error);

  return (
    <div className="rounded-lg border border-forest-800/15 bg-white p-5 shadow-editorial">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-forest-800/10">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-forest-700" />
          <h4 className="text-sm font-serif font-bold text-forest-900">
            Algorithmic Error Convergence · Fortran Kernels
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-800/15">
          O(h⁴) vs O(h) Asymptotics
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* SVG Log-Log Convergence Plot */}
        <div className="md:col-span-7 bg-ivory-50/70 p-3 rounded border border-forest-800/15">
          <svg viewBox="0 0 380 180" className="w-full h-auto select-none" aria-label="Error Convergence Plot">
            {/* Grid Lines */}
            <line x1="40" y1="20" x2="360" y2="20" stroke="rgba(23, 61, 49, 0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="55" x2="360" y2="55" stroke="rgba(23, 61, 49, 0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="90" x2="360" y2="90" stroke="rgba(23, 61, 49, 0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="125" x2="360" y2="125" stroke="rgba(23, 61, 49, 0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="160" x2="360" y2="160" stroke="#173D31" strokeWidth="1.5" />
            <line x1="40" y1="20" x2="40" y2="160" stroke="#173D31" strokeWidth="1.5" />

            {/* Y-axis labels */}
            <text x="32" y="24" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="end" fill="#526A60">10⁰</text>
            <text x="32" y="75" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="end" fill="#526A60">10⁻³</text>
            <text x="32" y="125" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="end" fill="#526A60">10⁻⁶</text>
            <text x="32" y="162" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="end" fill="#526A60">10⁻⁸</text>

            {/* X-axis labels */}
            <text x="40" y="174" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="middle" fill="#526A60">0.01</text>
            <text x="200" y="174" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="middle" fill="#526A60">0.10</text>
            <text x="360" y="174" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="middle" fill="#526A60">0.50</text>

            {/* Euler Curve (Terracotta, slope 1) */}
            <polyline fill="none" stroke="#C85A32" strokeWidth="2" points={eulerPoints} />

            {/* RK4 Curve (Forest Green, slope 4) */}
            <polyline fill="none" stroke="#173D31" strokeWidth="2.5" points={rk4Points} />

            {/* Current Scrub Indicator */}
            <line x1={currentX} y1="20" x2={currentX} y2="160" stroke="#4E8062" strokeWidth="1" strokeDasharray="2 2" />
            
            {/* Intersection dots */}
            <circle cx={currentX} cy={currentEulerY} r="4" fill="#C85A32" />
            <circle cx={currentX} cy={currentRk4Y} r="4" fill="#173D31" />
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-between text-[10px] font-mono mt-2 pt-1 border-t border-forest-800/10">
            <span className="flex items-center gap-1.5 text-forest-900 font-medium">
              <span className="w-2.5 h-1 bg-forest-900 inline-block"></span>
              <span>Runge-Kutta 4th Order: Slope 4 (O(h⁴))</span>
            </span>
            <span className="flex items-center gap-1.5 text-terracotta-600 font-medium">
              <span className="w-2.5 h-1 bg-terracotta-500 inline-block"></span>
              <span>Euler Forward: Slope 1 (O(h))</span>
            </span>
          </div>
        </div>

        {/* Interactive Scrubbing Controls & Readout */}
        <div className="md:col-span-5 flex flex-col justify-between h-full text-xs font-mono">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-ink-700 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-forest-700" />
                <span>Integration Step Size (h)</span>
              </span>
              <span className="font-bold text-forest-900 bg-forest-100 px-2 py-0.5 rounded text-[11px]">
                h = {stepSize.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.02"
              max="0.5"
              step="0.01"
              value={stepSize}
              onChange={(e) => setStepSize(parseFloat(e.target.value))}
              className="w-full accent-forest-800 cursor-pointer mb-4"
              aria-label="Adjust numerical step size h"
            />

            <div className="space-y-2.5">
              <div className="p-2.5 rounded bg-ivory-50 border border-forest-800/15">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-forest-900 font-semibold">RK4 Global Error</span>
                  <span className="font-mono text-forest-700 font-bold">
                    {rk4Error.toExponential(3)}
                  </span>
                </div>
                <div className="text-[10px] text-ink-500 font-sans mt-0.5">
                  High-order Taylor expansion cancellation ensures negligible drift.
                </div>
              </div>

              <div className="p-2.5 rounded bg-ivory-50 border border-forest-800/15">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-terracotta-600 font-semibold">Euler Global Error</span>
                  <span className="font-mono text-terracotta-600 font-bold">
                    {eulerError.toExponential(3)}
                  </span>
                </div>
                <div className="text-[10px] text-ink-500 font-sans mt-0.5">
                  First-order truncation accumulates linearly with step size.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[10.5px] text-ink-600 font-sans leading-tight">
            Implemented in Carlos's <code className="font-mono text-forest-800">fortran-numerical-methods</code> with strict double-precision IEEE-754 arithmetic.
          </div>
        </div>
      </div>
    </div>
  );
}
