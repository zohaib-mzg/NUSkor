import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          DEFAULT: "#F5C518",
          soft: "#FBE9A0",
          hover: "#D9AC00",
          deep: "#B98A00",
          faint: "#FDF6DE",
        },
        ink: {
          DEFAULT: "#111111",
          soft: "#1C1C1C",
          muted: "#2A2A2A",
        },
        paper: {
          DEFAULT: "#FAF9F5",
          card: "#FFFFFF",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(17,17,17,0.06), 0 1px 2px rgba(17,17,17,0.04)",
        lift: "0 4px 16px rgba(17,17,17,0.08)",
        gold: "0 2px 12px rgba(245,197,24,0.45)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;