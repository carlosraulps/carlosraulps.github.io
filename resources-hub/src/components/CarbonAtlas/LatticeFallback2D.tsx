import React from 'react';
import { AllotropeData, AllotropeAtom } from '../../types';

interface LatticeFallback2DProps {
  allotrope: AllotropeData;
  selectedAtom: AllotropeAtom | null;
  onSelectAtom: (atom: AllotropeAtom) => void;
}

export function LatticeFallback2D({ allotrope, selectedAtom, onSelectAtom }: LatticeFallback2DProps) {
  // Normalize atom coordinates to SVG viewport [40, 40] to [360, 260]
  const xs = allotrope.atoms.map((a) => a.cart_coords[0]);
  const ys = allotrope.atoms.map((a) => a.cart_coords[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const scaleX = (x: number) => 60 + ((x - minX) / (maxX - minX || 1)) * 280;
  const scaleY = (y: number) => 220 - ((y - minY) / (maxY - minY || 1)) * 160;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <svg
        viewBox="0 0 400 280"
        className="w-full h-full max-h-[300px] select-none"
        aria-label={`2D Lattice projection of ${allotrope.name}`}
      >
        {/* Background Grid Pattern */}
        <defs>
          <pattern id="grid2d" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(23, 61, 49, 0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="280" fill="url(#grid2d)" rx="8" />

        {/* Bonds */}
        {allotrope.bonds.map((bond, idx) => {
          const x1 = scaleX(bond.start[0]);
          const y1 = scaleY(bond.start[1]);
          const x2 = scaleX(bond.end[0]);
          const y2 = scaleY(bond.end[1]);
          return (
            <line
              key={`bond-2d-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#8FA899"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Atoms */}
        {allotrope.atoms.map((atom, idx) => {
          const cx = scaleX(atom.cart_coords[0]);
          const cy = scaleY(atom.cart_coords[1]);
          const isSelected = selectedAtom?.site === atom.site;
          const isTerracotta = atom.bader_charge > 0.02;
          const isDeepForest = atom.bader_charge < -0.02;
          const fillColor = isTerracotta ? '#C85A32' : isDeepForest ? '#173D31' : '#4E8062';

          return (
            <g
              key={`atom-2d-${idx}`}
              className="cursor-pointer transition-transform duration-150 hover:scale-125"
              onClick={() => onSelectAtom(atom)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectAtom(atom);
                }
              }}
              aria-label={`Select ${atom.site}`}
            >
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7 : 5.5}
                fill={fillColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={cy - 9}
                textAnchor="middle"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fill="#203A30"
                className="pointer-events-none select-none font-medium"
              >
                {atom.site.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] font-mono text-ink-600 mt-2 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-forest-800"></span>
        <span>2D Topological Projection · Click atoms to inspect Wyckoff charges</span>
      </div>
    </div>
  );
}
