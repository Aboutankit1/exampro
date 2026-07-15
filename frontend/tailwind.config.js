/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0F1E",
          800: "#0F1424",
          700: "#161D33",
          600: "#1E2740",
          500: "#2A3454",
        },
        surface: {
          DEFAULT: "#161D33",
          light: "#F6F7FB",
        },
        accent: {
          DEFAULT: "#E8A33D",
          light: "#F4C374",
          dark: "#C7841F",
        },
        success: "#34D399",
        danger: "#F16063",
        warning: "#F4C374",
        muted: "#8B93AC",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(11, 15, 30, 0.37)",
        glow: "0 0 24px 0 rgba(232, 163, 61, 0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseRing: { "0%": { boxShadow: "0 0 0 0 rgba(232,163,61,0.4)" }, "70%": { boxShadow: "0 0 0 12px rgba(232,163,61,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(232,163,61,0)" } },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out",
        pulseRing: "pulseRing 2s infinite",
      },
    },
  },
  plugins: [],
};
