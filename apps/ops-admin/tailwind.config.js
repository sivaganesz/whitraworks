/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          850: '#1e1e22',
          950: '#09090b',
        },
      },
    },
  },
  plugins: [],
};

