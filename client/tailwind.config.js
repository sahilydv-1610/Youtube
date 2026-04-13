/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        youtube: {
          bg: '#0f0f0f',
          header: '#0f0f0f',
          hover: '#272727',
          gray: '#aaaaaa',
          red: '#ff0000',
        }
      }
    },
  },
  plugins: [],
}
