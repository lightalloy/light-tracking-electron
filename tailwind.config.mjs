/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          900: '#0d0d0d',
          800: '#151515',
          700: '#1a1a1a',
          600: '#242424',
        },
        accent: {
          green: '#22c55e',
          lime: '#84cc16',
          cyan: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}

