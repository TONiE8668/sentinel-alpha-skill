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
      boxShadow: {
        premium: "0 24px 80px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;

