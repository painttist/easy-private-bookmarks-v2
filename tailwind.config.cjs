/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{index,vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      transitionProperty: {
        'vertical': 'height, padding, border'
      }
    }
  },
  plugins: [],
}
