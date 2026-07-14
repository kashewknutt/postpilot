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
          50: '#ffffff',
          100: '#fbf9ff',
          200: '#f4f0fb',
          300: '#ebe4f7',
          400: '#ddd3ef',
          ink: '#221833',
          muted: '#6f6485',
          soft: '#3d3354',
        },
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
        sans: ['"Avenir Next"', 'Avenir', '"Century Gothic"', 'Futura', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(76, 56, 128, 0.08)',
      },
    },
  },
  plugins: [],
}
