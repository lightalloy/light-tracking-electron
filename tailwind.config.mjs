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
          900: 'var(--surface-900)',
          800: 'var(--surface-800)',
          700: 'var(--surface-700)',
          600: 'var(--surface-600)',
          500: 'var(--surface-500)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          cyan: 'var(--accent-cyan)',
        },
        neutral: {
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
        }
      }
    },
  },
  plugins: [],
}

