import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        saffron: '#FF9933',
        indiagreen: '#138808',
        navy: '#0B1F3A',
      },
      fontFamily: {
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'sans-serif'],
        malayalam: ['Noto Sans Malayalam', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'sans-serif'],
        kannada: ['Noto Sans Kannada', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
