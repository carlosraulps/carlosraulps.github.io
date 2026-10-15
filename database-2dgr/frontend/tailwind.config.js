/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F2E9', forest: '#143F35', deep: '#0D2C26', sage: '#B8CBB8',
        lime: '#D9EE8F', clay: '#D78D70', ink: '#1D2824', muted: '#79827B', line: '#D9DDD2'
      },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'], serif: ['Playfair Display', 'serif'], mono: ['DM Mono', 'monospace'] },
      boxShadow: { soft: '0 20px 60px rgba(22, 55, 45, .08)' }
    }
  },
  plugins: []
}
