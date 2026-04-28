import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        oldGold: {
          DEFAULT: "#D4AF37",
          50: "#FDF8E7",
          100: "#FAF0CC",
          200: "#F1DD8E",
          300: "#E5C75A",
          400: "#DCB845",
          500: "#D4AF37",
          600: "#B0902A",
          700: "#866D20",
          800: "#5C4A16",
          900: "#33280B",
        },
        charcoal: {
          DEFAULT: "#1A1A1A",
          50: "#F5F5F5",
          100: "#E5E5E5",
          200: "#A3A3A3",
          300: "#737373",
          400: "#525252",
          500: "#404040",
          600: "#262626",
          700: "#1A1A1A",
          800: "#0F0F0F",
          900: "#0A0A0A",
        },
        // Status colors (Bölüm 10.2)
        statusAvailable: "#16A34A",
        statusBusy: "#DC2626",
        statusClosed: "#A3A3A3",
        statusPending: "#EAB308",
        statusConfirmed: "#2563EB",
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Montserrat"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Playfair Display"', "Georgia", "serif"],
        body: ['"Montserrat"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-hover":
          "0 10px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.05)",
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
