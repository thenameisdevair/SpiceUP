/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background:    "#0D0D0D",
        surface:       "#141414",
        "surface-alt": "#1A1A1A",
        border:        "#222222",
        accent:        "#7B5EA7",
        "accent-dim":  "#4A3870",
        success:       "#4CAF50",
        error:         "#EF4444",
      },
      fontFamily: {
        sans:     ["Inter-Regular"],
        medium:   ["Inter-Medium"],
        semibold: ["Inter-SemiBold"],
        bold:     ["Inter-Bold"],
      },
    },
  },
  plugins: [],
};
