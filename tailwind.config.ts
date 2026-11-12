import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // Manual toggle (via ThemeToggle.tsx) rather than the "media" default, so
  // the user's explicit choice (persisted in localStorage) always wins over
  // the OS preference once they've picked one.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        saffron: '#FF9933',
        indiagreen: '#138808',
        navy: '#0B1F3A',
        // Warm redesign palette. "navy" is kept (many components still use
        // it) and now visually aliased to the new ink colour so old and new
        // components read consistently without a full find/replace.
        cream: {
          DEFAULT: '#FBF6EE',
          50: '#FFFDF9',
          100: '#FBF6EE',
          200: '#F5EBDA',
        },
        ink: {
          DEFAULT: '#1F2A24',
          700: '#33403A',
          500: '#5B6A62',
        },
        // Re-tuned toward the Indian flag's green (previously a teal hue)
        // so the site's primary accent reads as saffron/white/green rather
        // than saffron/white/teal. Kept the "teal" token name so every
        // existing `teal-*` class across the app (Header, PolicyCard,
        // buttons, the state map, the grid picker, Logo.tsx, the header's
        // gradient bar) re-colours from this one definition.
        teal: {
          DEFAULT: '#0F7A3D',
          50: '#EAF7EE',
          100: '#D2EEDA',
          600: '#138808',
          700: '#0C6606',
        },
        coral: {
          DEFAULT: '#E8744C',
          50: '#FDEEE7',
          500: '#E8744C',
          600: '#D1602F',
        },
      },
      boxShadow: {
        warm: '0 2px 10px -2px rgba(31, 42, 36, 0.08)',
        'warm-lg': '0 12px 32px -8px rgba(31, 42, 36, 0.16)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      fontFamily: {
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'sans-serif'],
        malayalam: ['Noto Sans Malayalam', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'sans-serif'],
        kannada: ['Noto Sans Kannada', 'sans-serif'],
      },
      keyframes: {
        'book-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'book-float': 'book-float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
