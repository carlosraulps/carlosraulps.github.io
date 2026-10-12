export type ProjectCategory = 
  | 'all'
  | 'featured'
  | 'dft'
  | 'numerical'
  | 'ai'
  | 'hpc'
  | 'academic';

export interface ProjectMetadata {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: ProjectCategory;
  primaryLanguage: string;
  languageColor: string;
  techStack: string[];
  githubUrl: string;
  liveDemoUrl?: string;
  paperUrl?: string;
  downloadUrl?: string;
  highlights: string[];
  scientificDomain: string;
  schematicType?: 'carbon-atlas' | 'vasp-workflow' | 'numerical-convergence' | 'hpc-cluster' | 'latex-axiomatizer';
  stars?: number;
  featured?: boolean;
  citationBibtex?: string;
}

export interface AllotropeAtom {
  site: string;
  cart_coords: [number, number, number];
  bader_charge: number; // Signed net charge Q_net
}

export interface AllotropeBond {
  start: [number, number, number];
  end: [number, number, number];
  length: number; // in Angstroms
}

export interface AllotropeData {
  id: string;
  code: string;
  name: string;
  symbol: string;
  formula: string;
  crystal_system: string;
  space_group: string;
  wallpaper_group: string;
  formation_energy_delta: number; // ΔE vs Graphene (eV/atom)
  synthesis_viable: boolean; // ΔE < 0.456 eV/atom
  ring_topology: string; // Girão ring notation, e.g., h6_1, c4_1 r8_1
  polygon_types: number[]; // e.g., [4, 6, 8]
  atoms: AllotropeAtom[];
  bonds: AllotropeBond[];
  description: string;
  literatureRef: string;
}

export interface MetricItem {
  label: string;
  value: string;
  change?: string;
  description: string;
}
