/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:   '#0D1F3C',
        red:    '#C8102E',
        orange: '#F47920',
        slate:  '#F4F6FA',
        border: '#D1D9E6',
      },
      fontFamily: {
        condensed: ['"Barlow Condensed"', 'sans-serif'],
        body:      ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
