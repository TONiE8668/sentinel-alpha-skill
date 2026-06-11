import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07090d",
        panel: "#10151c",
        panelSoft: "#151c24",
        line: "#26313d",
        mist: "#94a3b8",
        signal: "#4fd1c5",
        amber: "#f6c453",
        danger: "#ff6b6b"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "var(--font-inter)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0, 0, 0, 0.45)",
        "glow-teal": "0 0 36px rgba(79, 209, 197, 0.18)",
        "glow-amber": "0 0 36px rgba(246, 196, 83, 0.16)",
        "glow-danger": "0 0 36px rgba(255, 107, 107, 0.18)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.82)" }
        },
        "draw-line": {
          "0%": { strokeDashoffset: "1200" },
          "100%": { strokeDashoffset: "0" }
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(2) rotate(-14deg)" },
          "55%": { opacity: "1", transform: "scale(0.92) rotate(-7deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-8deg)" }
        },
        "guard-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "pulse-dot": "pulse-dot 2.2s ease-in-out infinite",
        "draw-line": "draw-line 1.6s ease-out both",
        "stamp-in": "stamp-in 0.5s cubic-bezier(0.2, 1.3, 0.4, 1) both",
        "guard-in": "guard-in 0.3s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
