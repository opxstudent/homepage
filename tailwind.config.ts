import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#18181A",
        surface: "#202022",
        active: "#2C2C2E",
        border: "#2E2E30",
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
        },
        accent: {
          red: "#DE3C4B",
          blue: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;
