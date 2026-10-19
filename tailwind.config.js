/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6446E0",
          soft: "#CFC5F8",
          dark: "#4B31B8",
        },
        accent: {
          DEFAULT: "#F7C948",
          soft: "#FDE9A8",
        },
        ink: "#111111",
        muted: "#6B6B7B",
        surface: {
          soft: "#F4F3F9",
        },
      },
      fontFamily: {
        sans: ["Peyda", "Tahoma", "system-ui", "sans-serif"],
        mono: ["Vazirmatn Mono", "IBM Plex Mono", "Consolas", "monospace"],
      },
      fontWeight: {
        normal: "400",
        medium: "400",
        semibold: "700",
        bold: "700",
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        soft: "0 18px 45px -24px rgba(17, 17, 17, 0.28)",
        pop: "0 22px 55px -20px rgba(100, 70, 224, 0.45)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        wiggle: "wiggle 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
