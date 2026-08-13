/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'hero-bg':        '#F5EDD6',
        'reviews-bg':     '#E8F0E9',
        'card-bg':        '#F3F4F6',
        'divider-band':   '#C8DFC9',
        'accent-gold':    '#C9A84C',
        'accent-green':   '#2D6A4F',
        'star-gold':      '#F59E0B',
        'btn-primary':    '#1A1A1A',
        'btn-hover':      '#2D2D2D',
        'text-primary':   '#111111',
        'text-body':      '#374151',
        'text-muted':     '#6B7280',
        'badge-text':     '#2D6A4F',
        'price-badge':    '#B45309',
        'trust-bg':       '#FEF9EE',
      },
      fontFamily: {
        sans: [
          '"Be Vietnam Pro"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      fontSize: {
        'hero-desktop':   ['52px', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'hero-mobile':    ['34px', { lineHeight: '1.12', letterSpacing: '-0.01em' }],
        'section-desktop':['30px', { lineHeight: '1.2' }],
        'section-mobile': ['24px', { lineHeight: '1.25' }],
        'reviews-desktop':['38px', { lineHeight: '1.15' }],
        'reviews-mobile': ['28px', { lineHeight: '1.2' }],
        'body':           ['16px', { lineHeight: '1.7' }],
        'body-sm':        ['14px', { lineHeight: '1.65' }],
        'label':          ['12px', { lineHeight: '1.4', letterSpacing: '0.06em' }],
      },
      maxWidth: {
        'page': '920px',
      },
      spacing: {
        '18': '72px',
      },
      borderRadius: {
        'btn': '0px',
        'card': '12px',
        'avatar': '9999px',
        'badge': '4px',
      },
      boxShadow: {
        'card-hover': '0 8px 32px rgba(0,0,0,0.08)',
        'card':       '0 2px 12px rgba(0,0,0,0.04)',
      },
      transitionDuration: {
        'btn': '150ms',
      },
    },
  },
  plugins: [],
}
