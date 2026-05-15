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
          bg:      '#131c2b',
          sidebar: '#273347',
          card:    '#1a2535',
          border:  '#2d3d52',
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
