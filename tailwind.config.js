/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Royal navy — the BS Creation brand colour.
        // (Key names kept identical to the old palette so every page picks the new colour up.)
        brand: {
          50: "#EEF3FC",
          100: "#DCE6F8",
          200: "#B8CCF1",
          300: "#8CAAE6",
          400: "#5C84D6",
          500: "#2F5FC4",
          600: "#1F489F",
          700: "#173A80",
          800: "#102C63",
          900: "#0A1F4A",
        },
        // Sunshine yellow — the single accent colour.
        marigold: {
          50: "#FFF8E1",
          100: "#FFEFB8",
          300: "#FFD25A",
          400: "#FDB913",
          500: "#E39F00",
          600: "#B87A00",
        },
        ink: "#0E1A38",
        paper: "#F3F6FC",
        line: "#E0E7F3",
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', '"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,31,74,0.06), 0 6px 20px -8px rgba(10,31,74,0.14)",
        lift: "0 2px 4px rgba(10,31,74,0.08), 0 22px 40px -14px rgba(10,31,74,0.30)",
        deep: "0 40px 70px -28px rgba(5,15,45,0.65)",
      },
    },
  },
  plugins: [],
};
