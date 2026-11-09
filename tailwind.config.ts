import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06060a",
          900: "#0a0a0f",
          850: "#0e0e14",
          800: "#12121a",
          700: "#1a1a24",
          600: "#26262f",
        },
        flame: {
          300: "#ff7a86",
          400: "#ff3b4f",
          500: "#ec1228",
          600: "#c00b1e",
          700: "#8e0715",
        },
        gold: "#ffc94a",
        mint: "#22d17a",
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(236,18,40,0.55)",
        card: "0 18px 50px -30px rgba(0,0,0,0.9)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px)" },
          "40%": { transform: "translateX(4px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
      },
      animation: {
        rise: "rise 0.45s ease-out both",
        pulseGlow: "pulseGlow 2.8s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
