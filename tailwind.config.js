/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        liquid: {
          bg: '#F3F4F6',
          text: '#1E293B',
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          accent: '#06B6D4',
          glass: 'rgba(255, 255, 255, 0.7)',
          glassDark: 'rgba(255, 255, 255, 0.4)',
          border: 'rgba(255, 255, 255, 0.8)',
        },
      },
      boxShadow: {
        'liquid-card': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'liquid-glow': '0 0 15px rgba(59, 130, 246, 0.5)',
        'liquid-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'liquid-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'liquid': '1.25rem',
      },
    },
  },
  plugins: [],
}
