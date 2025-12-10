/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- THIS IS THE MAGIC KEY. DON'T FORGET IT!
  theme: {
    extend: {},
  },
  plugins: [],
}