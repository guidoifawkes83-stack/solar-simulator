/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        solar: {
          yellow: '#F59E0B',
          orange: '#F97316',
          blue: '#3B82F6',
          green: '#10B981',
          dark: '#0F172A',
          panel: '#1E293B',
          card: '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
