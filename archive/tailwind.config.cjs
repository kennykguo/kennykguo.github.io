/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Share Tech Mono', 'monospace'],
      },
      colors: {
        gray: {
          900: '#121212',
          800: '#1f1f1f',
          700: '#2e2e2e',
          400: '#9ca3af',
          300: '#d1d5db',
        },
        cyan: {
          500: '#06b6d4',
          700: '#0e7490',
          900: '#164e63',
        },
      },
      fontSize: {
        '2xs': '0.5rem',
      },
    },
  },
  plugins: [],
}