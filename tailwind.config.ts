import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--hn-background))',
        foreground: 'hsl(var(--hn-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--hn-primary))',
          foreground: 'hsl(var(--hn-primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--hn-secondary))',
          foreground: 'hsl(var(--hn-secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--hn-muted))',
          foreground: 'hsl(var(--hn-muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--hn-accent))',
          foreground: 'hsl(var(--hn-accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--hn-destructive))',
          foreground: 'hsl(var(--hn-destructive-foreground))'
        },
        border: 'hsl(var(--hn-border))',
        input: 'hsl(var(--hn-input))',
        ring: 'hsl(var(--hn-ring))'
      },
      borderRadius: {
        lg: 'var(--hn-radius-lg)',
        md: 'var(--hn-radius-md)',
        sm: 'var(--hn-radius-sm)'
      }
    }
  },
  plugins: []
}

export default config
