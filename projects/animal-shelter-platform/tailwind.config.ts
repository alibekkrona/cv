import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shelter: {
          ink: "rgb(var(--shelter-ink) / <alpha-value>)",
          moss: "rgb(var(--shelter-moss) / <alpha-value>)",
          leaf: "rgb(var(--shelter-leaf) / <alpha-value>)",
          cream: "rgb(var(--shelter-cream) / <alpha-value>)",
          clay: "rgb(var(--shelter-clay) / <alpha-value>)"
        }
      }
    }
  },
  plugins: []
};

export default config;
