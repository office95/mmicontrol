import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        brand: {
          50: '#f4f6ff',
          100: '#e6ebff',
          200: '#c5cdff',
          300: '#9eabff',
          400: '#6c7bff',
          500: '#4b5cff',
          600: '#3948e6',
          700: '#2f3bb4',
          800: '#273191',
          900: '#1d2466',
        }
      },
      borderRadius: {
        xl: '1.25rem'
      },
      boxShadow: {
        card: '0 20px 50px -24px rgba(15, 23, 42, 0.4)'
      }
    },
  },
  plugins: [],
}
export default config
