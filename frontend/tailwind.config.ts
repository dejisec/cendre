import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          black: '#0a0a0a',
          green: {
            DEFAULT: '#00ff00',
            dim: '#00cc00',
            bright: '#33ff33',
            glow: '#00ff00',
          },
          amber: {
            DEFAULT: '#ffb000',
            dim: '#cc8800',
            bright: '#ffc633',
          },
          cyan: {
            DEFAULT: '#00ffff',
            dim: '#00cccc',
            bright: '#33ffff',
          },
          red: {
            DEFAULT: '#ff0040',
            dim: '#cc0033',
            bright: '#ff3366',
          },
        },
      },
      fontFamily: {
        'mono': ['"Fira Code"', '"Cascadia Code"', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 3s infinite',
        'scan': 'scan 8s linear infinite',
        'typewriter': 'typewriter 0.5s steps(1) infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.98' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        typewriter: {
          '0%, 50%': { borderColor: 'transparent' },
          '50.1%, 100%': { borderColor: '#00ff00' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '50.1%, 100%': { opacity: '0' },
        },
      },
      boxShadow: {
        'terminal-glow': '0 0 20px rgba(0, 255, 0, 0.5)',
        'terminal-glow-sm': '0 0 10px rgba(0, 255, 0, 0.3)',
        'terminal-glow-lg': '0 0 30px rgba(0, 255, 0, 0.6)',
        'amber-glow': '0 0 20px rgba(255, 176, 0, 0.5)',
        'cyan-glow': '0 0 20px rgba(0, 255, 255, 0.5)',
        'red-glow': '0 0 20px rgba(255, 0, 64, 0.5)',
      },
    }
  },
  plugins: []
};

export default config;


