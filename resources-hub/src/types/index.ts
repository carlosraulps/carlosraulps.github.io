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
  schematicType?: 'vasp-workflow' | 'numerical-convergence' | 'hpc-cluster' | 'latex-axiomatizer';
  stars?: number;
  featured?: boolean;
  citationBibtex?: string;
}

export interface MetricItem {
  label: string;
  value: string;
  change?: string;
  description: string;
}
