
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},				// Custom gaming theme colors
				gaming: {
					primary: '#DC2626', // Red (main brand color)
					secondary: '#B91C1C', // Darker red
					accent: '#F59E0B', // Amber/Gold
					background: '#0F0F0F', // Very dark background
					card: '#1F1F1F', // Dark cards
					text: '#F9FAFB', // Light text
					gold: '#FCD34D', // Gold highlights
					red: {
						light: '#EF4444',
						DEFAULT: '#DC2626',
						dark: '#B91C1C'
					}
				},
				// Class-specific colors for Rucoy
				pally: {
					primary: 'hsl(var(--pally-primary))',
					light: 'hsl(var(--pally-light))',
					dark: 'hsl(var(--pally-dark))',
					bg: 'hsl(var(--pally-bg))'
				},
				kina: {
					primary: 'hsl(var(--kina-primary))',
					light: 'hsl(var(--kina-light))',
					dark: 'hsl(var(--kina-dark))',
					bg: 'hsl(var(--kina-bg))'
				},				mage: {
					primary: 'hsl(var(--mage-primary))',
					light: 'hsl(var(--mage-light))',
					dark: 'hsl(var(--mage-dark))',
					bg: 'hsl(var(--mage-bg))'
				},
				itens: {
					primary: 'hsl(var(--itens-primary))',
					light: 'hsl(var(--itens-light))',
					dark: 'hsl(var(--itens-dark))',
					bg: 'hsl(var(--itens-bg))'
				},
				geral: {
					primary: 'hsl(var(--geral-primary))',
					light: 'hsl(var(--geral-light))',
					dark: 'hsl(var(--geral-dark))',
					bg: 'hsl(var(--geral-bg))'
				},
				divulgacoes: {
					primary: 'hsl(var(--divulgacoes-primary))',
					light: 'hsl(var(--divulgacoes-light))',
					dark: 'hsl(var(--divulgacoes-dark))',
					bg: 'hsl(var(--divulgacoes-bg))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},				'pulse-slow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' },
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-slow': 'pulse-slow 3s infinite'
			},			backgroundImage: {
				'gradient-gaming': 'linear-gradient(to right, #DC2626, #F59E0B)', // Red to Gold
				'gradient-hero': 'linear-gradient(135deg, #DC2626, #B91C1C, #7F1D1D)', // Red gradient
				'gradient-card': 'linear-gradient(to bottom, #1F1F1F, #0F0F0F)' // Dark card gradient
			}		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
