/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          accent:   '#F06A6A',
          tertiary: '#457181',
          primary:  '#273347',
        },
        app: {
          bg:      'rgb(var(--app-bg-rgb) / <alpha-value>)',
          sidebar: 'rgb(var(--app-sidebar-rgb) / <alpha-value>)',
          card:    'rgb(var(--app-card-rgb) / <alpha-value>)',
          border:  'rgb(var(--app-border-rgb) / <alpha-value>)',
        },
      },
      keyframes: {
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: { 'slide-in': 'slide-in 0.2s ease-out' },
    },
  },
  plugins: [],
};
