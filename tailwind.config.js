/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'burgundy':        '#631521',
        'burgundy-dark':   '#4A0D17',
        'burgundy-deep':   '#3B0A12',
        'burgundy-light':  '#7A1D2B',
        'mocha':           '#2C201A',
        'mocha-dark':      '#1E1510',
        'mocha-light':     '#3D2E26',
        'gold':            '#D4AF37',
        'gold-dark':       '#B8860B',
        'gold-light':      '#F4ECE1',
        'brand-ivory':     '#FAF8F5',
        'brand-sand':      '#E8DFD5',
      },
      fontFamily: {
        serif: [
          '"Cormorant Garamond"',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'serif',
        ],
        sans: [
          'Inter',
          '"Plus Jakarta Sans"',
          '"Be Vietnam Pro"',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      fontSize: {
        'display-xl':     ['68px', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
        'display-lg':     ['54px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-md':     ['40px', { lineHeight: '1.10', letterSpacing: '-0.01em' }],
        'hero-desktop':   ['58px', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'hero-mobile':    ['38px', { lineHeight: '1.08', letterSpacing: '-0.01em' }],
        'section-desktop':['36px', { lineHeight: '1.15' }],
        'section-mobile': ['28px', { lineHeight: '1.20' }],
      },
      boxShadow: {
        'luxury': '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
        'luxury-hover': '0 30px 60px -12px rgba(0, 0, 0, 0.35)',
        'gold-glow': '0 0 25px rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
}
