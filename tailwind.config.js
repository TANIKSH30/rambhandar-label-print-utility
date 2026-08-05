/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        header: {
          bg: "#0B1B3A",
          accent: "#F59E0B"
        },
        brand: {
          navy: "#0B1B3A",
          amber: "#F59E0B",
          amberHover: "#D97706",
          green: "#16A34A",
          bg: "#F3F4F6",
          card: "#FFFFFF",
          border: "#D1D5DB",
          text: "#111827"
        }
      },
      borderRadius: {
        'card': '16px',
        'xl': '16px',
        '2xl': '16px'
      },
      boxShadow: {
        'enterprise': '0 4px 20px -2px rgba(11, 27, 58, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'preview': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }
    },
  },
  plugins: [],
}
