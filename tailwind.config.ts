import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        border: "var(--border)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px var(--primary), 0 12px 40px -12px var(--accent)",
      },
    },
  },
  plugins: [],
};
export default config;
