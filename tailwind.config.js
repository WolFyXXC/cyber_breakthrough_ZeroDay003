/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      colors: {
        'matte-dark': 'rgba(33, 32, 31)',
        'matte-gray': 'rgba(43, 42, 42)',
        'matte-gold': '#6A5500', 
        'matte-dark-grey': 'rgba(255, 255, 255, 0.1)',
       // 'matte-bottom': 'rgba(43, 42, 42)'.      #FFD700,
        

      }
    },
  },
  plugins: [],
}

