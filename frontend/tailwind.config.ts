import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          blue: '#2C6BED',
          'blue-hover': '#1E56D0',
          dark: '#121212',
          card: '#1E1E1E',
          sidebar: '#171717',
          border: '#2A2A2A',
          muted: '#8E8E93',
        },
      },
    },
  },
  plugins: [],
};

export default config;
