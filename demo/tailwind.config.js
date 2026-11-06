/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0F1E',
          surface: '#111827',
          elevated: '#1A2235',
          overlay: '#1E2A40',
        },
        sidebar: '#0D1526',
        accent: '#1E3A5F',
        primary: {
          DEFAULT: '#4F8EF7',
          hover: '#6BA3FA',
          muted: 'rgba(79,142,247,0.15)',
        },
        success: {
          DEFAULT: '#34D399',
          muted: 'rgba(52,211,153,0.15)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          muted: 'rgba(251,191,36,0.15)',
        },
        danger: {
          DEFAULT: '#F87171',
          muted: 'rgba(248,113,113,0.15)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B',
          inverse: '#0A0F1E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
    },
  },
  plugins: [],
}
