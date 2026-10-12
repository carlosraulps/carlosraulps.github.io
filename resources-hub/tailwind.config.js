/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FAF8F3',
          100: '#F4F2E9', // Base background
          200: '#EBE7D8',
          300: '#DDD7C1',
        },
        forest: {
          950: '#0B1D17',
          900: '#0E271F',
          800: '#173D31', // Primary brand
          700: '#1F4F40',
          600: '#2A6653',
          500: '#4E8062', // Accent
          400: '#6FA082',
          300: '#99BFA7',
          200: '#C2DBCB',
          100: '#E4EBDF', // Muted green
          50: '#F2F6F0',
        },
        ink: {
          900: '#13231D',
          800: '#203A30', // Text primary
          700: '#2E5043',
          600: '#46685B',
          500: '#5F8073',
          400: '#839F93',
          300: '#AEC1B8',
          200: '#D5DFDB',
        },
        terracotta: {
          600: '#A84521',
          500: '#C85A32', // Numerical accent
          400: '#D9714B',
          300: '#E69374',
          100: '#F8E2D9',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Instrument Serif', 'Newsreader', 'EB Garamond', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle, rgba(23, 61, 49, 0.12) 1px, transparent 1px)",
      },
      boxShadow: {
        'editorial': '0 1px 3px rgba(23, 61, 49, 0.05), 0 8px 24px rgba(23, 61, 49, 0.04)',
        'editorial-hover': '0 4px 12px rgba(23, 61, 49, 0.08), 0 16px 36px rgba(23, 61, 49, 0.08)',
        'modal': '0 25px 50px -12px rgba(11, 29, 23, 0.25)',
      },
    },
  },
  plugins: [],
}
