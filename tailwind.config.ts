import type { Config } from "tailwindcss"

const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sora: ['var(--font-sora)'],
        'advercase-bold': ['AdvercaseBold', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0281f2",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          purple: "#7c3aed",
        },
        pm: {
          indigo: '#6366F1',
          emerald: '#10B981',
          surface: '#F8FAFC',
          'bubble-user': '#EEF2FF',
          'bubble-ai': '#FFFFFF',
          'bubble-agent': '#F5F8FF'
        },
        // Modern chat design system
        chat: {
          // Background colors
          'bg-primary': '#FFFFFF',
          'bg-secondary': '#F8FAFC',
          'bg-user': '#EEF2FF',
          'bg-ai': '#FFFFFF',
          'bg-agent': '#F5F8FF',
          'bg-research': '#F0F9FF',
          'bg-concept': '#FEFCE8',
          'bg-error': '#FEF2F2',

          // Border colors
          'border-light': '#E2E8F0',
          'border-medium': '#CBD5E1',
          'border-accent': '#6366F1',

          // Text colors
          'text-primary': '#0F172A',
          'text-secondary': '#475569',
          'text-muted': '#64748B',
          'text-accent': '#6366F1',
          'text-success': '#059669',
          'text-warning': '#D97706',
          'text-error': '#DC2626',

          // Status colors
          'status-pending': '#94A3B8',
          'status-active': '#3B82F6',
          'status-completed': '#059669',
          'status-error': '#DC2626',

          // Shadow colors
          'shadow-light': 'rgba(0, 0, 0, 0.05)',
          'shadow-medium': 'rgba(0, 0, 0, 0.1)',
          'shadow-strong': 'rgba(0, 0, 0, 0.15)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-slide-in": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-fade-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "fade-blur-out": {
          from: { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
          to: { opacity: "0", transform: "scale(0.95)", filter: "blur(4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-slide-in": "fade-slide-in 0.25s cubic-bezier(0.4,0,0.2,1)",
        "scale-fade-in": "scale-fade-in 0.3s cubic-bezier(0.33,1,0.68,1)",
        "fade-blur-out": "fade-blur-out 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
