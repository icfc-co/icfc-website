// tailwind.config.js

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        title: ['"Bebas Neue"', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#006400',  // Deep Green
        },
        secondary: {
          DEFAULT: '#FFD700',  // Gold
        },
      },
    },
  },
  plugins: [],
}
