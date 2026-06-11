/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        surface: {
          DEFAULT: '#161b22',
          hover: '#1c2128',
          alt: '#21262d',
        },
        border: '#30363d',
        text: {
          DEFAULT: '#e6edf3',
          muted: '#8b949e',
        },
        accent: {
          DEFAULT: '#58a6ff',
          hover: '#79b8ff',
        },
        green: '#3fb950',
        red: '#f85149',
        yellow: '#d29922',
        purple: '#bc8cff',
        'badge-green': {
          bg: '#1a3a27',
          border: '#2a5a37',
        },
        'badge-red': {
          bg: '#3a1a1a',
          border: '#5a2a2a',
        },
        'badge-yellow': {
          bg: '#3a2e00',
          border: '#5a4a00',
        },
        'badge-purple': {
          bg: '#2a1a3a',
          border: '#4a2a5a',
        },
        'error-bg': '#3d1a1a',
        'error-text': '#ffa0a0',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
