/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf7ff',
          100: '#f3edff',
          200: '#e8deff',
          300: '#d4c1ff',
          400: '#b794f6',
          500: '#a78bfa',
          600: '#9370db',
          700: '#7c5cbf',
          800: '#6349a0',
          900: '#4c3880',
        },
        surface: {
          950: '#1a1528',
          900: '#241e36',
          800: '#342d4d',
          700: '#4a4168',
          muted: '#b8a9d4',
          soft: '#e9e0f8',
        },
      },
    },
  },
  plugins: [],
}
