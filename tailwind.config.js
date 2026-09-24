/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blackboard green — the BS Creation brand colour.
        // (Key names kept identical to the old palette so admin pages keep working.)
        brand: {
          50: "#EEF6F1",
          100: "#D6EADF",
          200: "#B0D4C0",
          300: "#7FB79A",
          400: "#4F9877",
          500: "#2F8563",
          600: "#256B4F",
          700: "#1F4D3A",
          800: "#183D2E",
          900: "#122E23",
        },
        // Marigold — the single accent colour.
        marigold: {
          50: "#FFF7E3",
          100: "#FDEBC0",
          300: "#F7C75A",
          400: "#F2A516",
          500: "#D98C06",
          600: "#B26F03",
        },
        ink: "#15241D",
        paper: "#FAFAF7",
        line: "#E3E7E1",
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', '"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21,36,29,0.05), 0 4px 16px -6px rgba(21,36,29,0.10)",
        lift: "0 2px 4px rgba(21,36,29,0.06), 0 16px 32px -12px rgba(21,36,29,0.22)",
      },
    },
  },
  plugins: [],
};
