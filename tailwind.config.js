/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        elevated: token('elevated'),
        label: token('label'),
        'label-2': token('label-2'),
        'label-3': token('label-3'),
        separator: token('separator'),
        fill: token('fill'),
        tint: token('tint'),
        'tint-text': token('tint-text'),
        'on-tint': token('on-tint'),
        green: token('green'),
        'green-fill': token('green-fill'),
        red: token('red'),
        'red-fill': token('red-fill'),
        'chat-bg': token('chat-bg'),
        'bubble-bg': token('bubble-bg'),
        'bubble-text': token('bubble-text')
      },
      // Opacidades usadas nos preenchimentos do iOS (fill 12–24%)
      opacity: {
        6: '0.06',
        12: '0.12',
        16: '0.16',
        18: '0.18',
        22: '0.22',
        24: '0.24'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Helvetica Neue"', 'sans-serif']
      },
      borderRadius: {
        // Raios contínuos do iOS: cartões 12–14, sheets 14–20, botões 12
        card: '12px',
        sheet: '16px'
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04)',
        float: '0 8px 30px rgb(0 0 0 / 0.12), 0 1px 3px rgb(0 0 0 / 0.08)',
        sheet: '0 -10px 40px rgb(0 0 0 / 0.18)'
      }
    }
  },
  plugins: []
};
