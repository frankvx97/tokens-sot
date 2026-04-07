import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1200px'
      }
    },
    extend: {
      colors: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        muted: {
          DEFAULT: '#1e293b',
          foreground: '#94a3b8'
        },
        accent: {
          DEFAULT: '#1d4ed8',
          foreground: '#f8fafc'
        },
        border: '#1e293b'
      },
      borderRadius: {
        lg: '0.6rem',
        md: 'calc(0.6rem - 2px)',
        sm: 'calc(0.6rem - 4px)'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        elevation: '0 10px 30px rgba(15, 23, 42, 0.35)'
      },
      keyframes: {
        'dialog-overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'dialog-content-in': {
          from: { opacity: '0', scale: '0.96' },
          to: { opacity: '1', scale: '1' }
        }
      },
      animation: {
        'dialog-overlay-in': 'dialog-overlay-in 150ms ease-out',
        'dialog-content-in': 'dialog-content-in 200ms ease-out'
      }
    }
  }
};

export default config;
