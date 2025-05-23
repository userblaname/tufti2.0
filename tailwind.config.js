/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'; // Import default theme for fonts

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': '0.75rem',    // 12px
        'sm': '0.8125rem',  // 13px
        'base': '0.875rem', // 14px
        'lg': '1rem',       // 16px
        'xl': '1.125rem',   // 18px
        '2xl': '1.25rem',   // 20px
        '3xl': '1.5rem',    // 24px
        '4xl': '1.875rem'   // 30px
      },
      colors: {
        tufti: {
          red: '#B82E27',       // Brightened burgundy for better contrast
          black: '#0A0A0F',     // Darker black for stronger contrast
          white: '#FFFFFF',     // Pure white for maximum contrast
          silver: '#E5E5E7',    // Lightened silver
          gold: '#D4B494',      // Brightened gold
          accent: '#B82E27',    // Matches brightened red
          muted: '#6A6A6F',     // Lightened muted tone
          filmstrip: '#2A2A2D', // Film strip color
          baroque: '#F0F0F0',   // Lightened neutral
          shadow: '#050507',    // Darker shadow
          surface: '#1A1A1F',   // Darkened surface
          highlight: '#F0D5C4', // Brightened highlight
          ambient: '#3A3A3F',   // Ambient background
        },
        'input-bg': '#f0eee5',
        'input-text': '#181528',
        'navy-deep': '#1A2A40', 
        'teal-accent': '#38B2AC', // Teal-500
        'tufti-black': '#100804',
        'tufti-red': '#E53E3E', // Example Red
        'tufti-gold': '#D69E2E', // Example Gold
        'tufti-white': '#F7FAFC', // Example Off-white
        'tufti-surface': '#1A202C', // Example Surface Dark Gray
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
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
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', ...defaultTheme.fontFamily.sans],
        serif: ['Cinzel Decorative', ...defaultTheme.fontFamily.serif],
        baroque: ['Cinzel Decorative', 'serif'],
        modern: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        baroque: ['"Playfair Display"', 'serif'],
        modern: ['"Poppins"', 'sans-serif'],
      },
      backgroundImage: {
        'baroque-pattern': "url('data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0c27.614 0 50 22.386 50 50s-22.386 50-50 50S0 77.614 0 50 22.386 0 50 0zm0 10c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zm0 10c16.569 0 30 13.431 30 30 0 16.569-13.431 30-30 30-16.569 0-30-13.431-30-30 0-16.569 13.431-30 30-30z' fill='%23FFFFFF' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E')",
      },
      boxShadow: {
        'baroque': '0 1px 3px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'baroque-float': 'baroqueFloat 6s ease-in-out infinite',
        'film-roll': 'filmRoll 120s linear infinite',
        'fade-in-out': 'fadeInOut 8s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        baroqueFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '50%': { transform: 'translateY(-5px) rotate(0.5deg)' }
        },
        filmRoll: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '200px 200px' }
        },
        fadeInOut: {
          '0%, 100%': { opacity: 0.03 },
          '50%': { opacity: 0.05 }
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        'accordion-up': {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            'h1': {
              fontFamily: theme('fontFamily.baroque').join(', '),
              fontWeight: '700',
            },
          },
        },
      }),
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
}