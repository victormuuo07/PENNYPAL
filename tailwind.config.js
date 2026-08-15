/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: "#5c0f10",
        red: {
          DEFAULT: "#a01d1d",
          bright: "#d4291f",
        },
        gold: {
          DEFAULT: "#f2b705",
          dark: "#b9860a",
        },
        cream: {
          DEFAULT: "#fff8ec",
          deep: "#fbead2",
        },
        ink: {
          DEFAULT: "#2a1710",
          soft: "#5c4436",
        },
      },
      borderRadius: {
        card: "14px",
        "card-lg": "26px",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(92, 15, 16, 0.14)",
      },
    },
  },
  plugins: [],
};
