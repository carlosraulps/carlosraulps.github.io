import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { RotateCw, Eye, Sparkles } from 'lucide-react';
import { AllotropeData, AllotropeAtom } from '../../types';
import { LatticeViewer3D } from './LatticeViewer3D';
import { LatticeFallback2D } from './LatticeFallback2D';

interface LatticeCanvasProps {
  allotrope: AllotropeData;
  selectedAtom: AllotropeAtom | null;
  onSelectAtom: (atom: AllotropeAtom) => void;
}

export function LatticeCanvas({ allotrope, selectedAtom, onSelectAtom }: LatticeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [webglSupported, setWebglSupported] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [autoRotate, setAutoRotate] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Detect WebGL capability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        setViewMode('2d');
      }
    } catch {
      setWebglSupported(false);
      setViewMode('2d');
    }
  }, []);

  // IntersectionObserver to suspend WebGL rendering when offscreen
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[360px] md:h-[420px] rounded-lg border border-forest-800/15 bg-white overflow-hidden shadow-editorial"
    >
      {/* Canvas Top Bar HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ivory-50/90 backdrop-blur-sm border border-forest-800/10 text-[11px] font-mono text-ink-800">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600 animate-pulse"></span>
            {viewMode === '3d' ? '3D WebGL Lattice' : '2D Topological Projection'}
          </span>
          <span className="hidden sm:inline-block px-2 py-1 rounded bg-ivory-50/80 border border-forest-800/10 text-[10px] font-mono text-ink-600">
            {allotrope.wallpaper_group} · {allotrope.space_group.split(' ')[0]}
          </span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {webglSupported && (
            <button
              onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-ivory-50 hover:bg-forest-100 border border-forest-800/15 text-ink-800 transition-colors flex items-center gap-1 shadow-sm"
              title="Toggle between 3D WebGL and 2D Projection"
            >
              <Eye className="w-3.5 h-3.5 text-forest-700" />
              <span>{viewMode === '3d' ? '2D View' : '3D View'}</span>
            </button>
          )}

          {viewMode === '3d' && (
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-1.5 rounded border border-forest-800/15 transition-colors ${
                autoRotate ? 'bg-forest-100 text-forest-800' : 'bg-ivory-50 text-ink-600'
              }`}
              title="Toggle Auto-Rotation"
              aria-label="Toggle auto-rotation"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Visualizer Area */}
      {viewMode === '3d' && webglSupported && !hasError ? (
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center bg-ivory-50">
              <Sparkles className="w-6 h-6 text-forest-600 animate-spin" />
              <span className="text-[11px] font-mono text-ink-600 mt-2">Loading 3D Crystal Mesh...</span>
            </div>
          }
        >
          <Canvas
            frameloop={isIntersecting ? 'always' : 'never'}
            camera={{ position: [0, -3.2, 4.0], fov: 45 }}
            onError={() => {
              setHasError(true);
              setViewMode('2d');
            }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <LatticeViewer3D
              allotrope={allotrope}
              selectedAtom={selectedAtom}
              onSelectAtom={onSelectAtom}
              autoRotate={autoRotate}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        </Suspense>
      ) : (
        <LatticeFallback2D
          allotrope={allotrope}
          selectedAtom={selectedAtom}
          onSelectAtom={onSelectAtom}
        />
      )}

      {/* Canvas Bottom Legend */}
      <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-[10px] font-mono text-ink-600 pointer-events-none">
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded border border-forest-800/10 pointer-events-auto">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]"></span>
            <span>+Q (Depletion)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#173D31]"></span>
            <span>-Q (Accumulation)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#4E8062]"></span>
            <span>Neutral</span>
          </span>
        </div>
        <span className="hidden md:inline-block bg-white/80 px-2 py-0.5 rounded border border-forest-800/10">
          Drag to rotate · Scroll to zoom
        </span>
      </div>
    </div>
  );
}
