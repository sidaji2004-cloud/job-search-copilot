import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "surface-4": "var(--surface-4)",
        hairline: "var(--hairline)",
        "hairline-strong": "var(--hairline-strong)",
        "hairline-tertiary": "var(--hairline-tertiary)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-subtle": "var(--ink-subtle)",
        "ink-tertiary": "var(--ink-tertiary)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-focus": "var(--primary-focus)",
        "brand-secure": "var(--brand-secure)",
        success: "var(--success)",
        overlay: "var(--overlay)",
        "on-primary": "var(--on-primary)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "SF Pro Display", "-apple-system", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["80px", { lineHeight: "1.05", letterSpacing: "-3px", fontWeight: "600" }],
        "display-lg": ["56px", { lineHeight: "1.10", letterSpacing: "-1.8px", fontWeight: "600" }],
        "display-md": ["40px", { lineHeight: "1.15", letterSpacing: "-1px", fontWeight: "600" }],
        headline: ["28px", { lineHeight: "1.20", letterSpacing: "-0.6px", fontWeight: "600" }],
        "card-title": ["22px", { lineHeight: "1.25", letterSpacing: "-0.4px", fontWeight: "500" }],
        subhead: ["20px", { lineHeight: "1.40", letterSpacing: "-0.2px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.50", letterSpacing: "-0.1px", fontWeight: "400" }],
        body: ["16px", { lineHeight: "1.50", letterSpacing: "-0.05px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.50", letterSpacing: "0", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.40", letterSpacing: "0", fontWeight: "400" }],
        button: ["14px", { lineHeight: "1.20", letterSpacing: "0", fontWeight: "500" }],
        eyebrow: ["13px", { lineHeight: "1.30", letterSpacing: "0.4px", fontWeight: "500" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "24px",
        pill: "9999px",
      },
      spacing: {
        section: "96px",
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
