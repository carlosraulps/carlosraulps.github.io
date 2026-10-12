import React, { useState, useEffect } from 'react';
import { ProjectMetadata } from './types';
import { EditorialNavbar } from './components/Navigation/EditorialNavbar';
import { EditorialHero } from './components/Hero/EditorialHero';
import { CarbonAtlasShowcase } from './components/CarbonAtlas/CarbonAtlasShowcase';
import { ProjectDiscovery } from './components/Projects/ProjectDiscovery';
import { CategorySections } from './components/Category/CategorySections';
import { ProjectModal } from './components/Projects/ProjectModal';
import { EditorialFooter } from './components/Footer/EditorialFooter';

export function App() {
  const [selectedProject, setSelectedProject] = useState<ProjectMetadata | null>(null);

  return (
    <div className="min-h-screen bg-[#F4F2E9] text-[#203A30] flex flex-col selection:bg-[#173D31] selection:text-[#FAF8F3]">
      {/* Editorial Navigation */}
      <EditorialNavbar />

      {/* Main Content Flow */}
      <main className="flex-1">
        {/* 1. Overview & Hero */}
        <EditorialHero />

        {/* 2. Flagship: Carbon Atlas 3D WebGL Showcase */}
        <CarbonAtlasShowcase />

        {/* 3. Searchable Directory of all 15 Repositories */}
        <ProjectDiscovery onOpenDetails={setSelectedProject} />

        {/* 4. Deep-Dive Domain Sections with Embedded Interactive Schematics */}
        <CategorySections onOpenDetails={setSelectedProject} />
      </main>

      {/* Contextual Deep-Dive Project Modal */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* Academic Colophon & Footer */}
      <EditorialFooter />
    </div>
  );
}

export default App;
