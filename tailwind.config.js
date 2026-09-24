/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1F4091',
          light: '#19B4EA',
          orange: '#EE773D',
        },
      },
      fontFamily: {
        heading: ['"Mona Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 64, 145, 0.04), 0 8px 24px rgba(31, 64, 145, 0.06)',
        pop: '0 12px 32px rgba(31, 64, 145, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
