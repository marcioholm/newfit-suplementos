/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        newfit: {
          dark: '#090A0C',
          card: '#16171B',
          cardHover: '#1c1e23',
          surface: '#121316',
          border: 'rgba(255, 255, 255, 0.08)',
          borderFocus: 'rgba(245, 166, 35, 0.4)',
          accent: '#F5A623', // Amarelo Âmbar clássico New Fit
          accentHover: '#e5971a',
          emerald: '#10B981',
          muted: '#8E8E93',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
