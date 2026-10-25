/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#Eef3f9',
          100: '#D4DEEC',
          200: '#A9BDD9',
          300: '#6E89B0',
          400: '#3C5A87',
          500: '#1B3A66',
          600: '#0B1F3A',
          700: '#08182E',
          800: '#06121F',
          900: '#040C16',
        },
        teal: {
          DEFAULT: '#14B8A6',
          50: '#E6FBF8',
          100: '#C7F6EF',
          200: '#90ECE0',
          300: '#5CDDD0',
          400: '#2FCFBF',
          500: '#14B8A6',
          600: '#0F8F80',
          700: '#0B6B60',
          800: '#084C44',
          900: '#05332E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
