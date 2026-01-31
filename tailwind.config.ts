import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--brand-primary)",
          primaryLight: "var(--brand-primary-light)",
          bgSoft: "var(--brand-bg-soft)",
          text: "var(--brand-text)",
          textMuted: "var(--brand-text-muted)",
          borderSubtle: "var(--brand-border-subtle)",
          accentAmber: "var(--brand-accent-amber)",
          success: "var(--brand-success)",
          danger: "var(--brand-danger)",
        },
      },
      fontFamily: {
        brand: ["var(--brand-font)"],
      },
      letterSpacing: {
        base: "var(--letter-spacing-base)",
        label: "var(--letter-spacing-label)",
        heading: "var(--letter-spacing-heading)",
      },
    },
  },
  plugins: [],
} satisfies Config;
