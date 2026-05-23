import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        float: '0 16px 45px rgba(0, 0, 0, 0.35)'
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.62' },
          '50%': { transform: 'scale(1.35)', opacity: '0.08' }
        }
      },
      animation: {
        breathe: 'breathe 1.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
} satisfies Config;
