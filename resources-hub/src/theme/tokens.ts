export const DESIGN_TOKENS = {
  colors: {
    background: '#F4F2E9', // Warm Ivory
    surface: '#FFFFFF', // Crisp Paper
    surfaceMuted: '#EFECE1',
    primary: '#173D31', // Deep Forest Green
    primaryDark: '#0E271F',
    accent: '#4E8062', // Sage Green
    mutedGreen: '#E4EBDF',
    text: '#203A30', // Deep Forest Ink
    textMuted: '#526A60',
    terracotta: '#C85A32', // Numerical Accent
    borderSubtle: 'rgba(23, 61, 49, 0.12)',
    borderMedium: 'rgba(23, 61, 49, 0.22)',
  },
  fonts: {
    editorialSerif: 'Instrument Serif, Newsreader, Georgia, serif',
    sans: 'Geist, Inter, -apple-system, sans-serif',
    technicalMono: 'IBM Plex Mono, JetBrains Mono, monospace',
  },
  spring: {
    gentle: { type: 'spring', stiffness: 120, damping: 20 },
    snappy: { type: 'spring', stiffness: 200, damping: 25 },
    micro: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
} as const;
