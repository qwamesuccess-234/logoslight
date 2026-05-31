/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#fdf8ec',100:'#faedc8',200:'#f5d98d',300:'#f0c04e',
          400:'#eba924',500:'#d4900f',600:'#b97108',700:'#94530a',
          800:'#7a420f',900:'#673711',950:'#3b1c07',
        },
        secondary: {
          50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',
          400:'#818cf8',500:'#4f46e5',600:'#4338ca',700:'#3730a3',
          800:'#312e81',900:'#1e1b4b',950:'#0f0d2e',
        },
        parchment: {
          50:'#fdfbf7',100:'#faf5eb',200:'#f5ecd4',
          300:'#ecddb8',400:'#d9c48a',500:'#c4a85a',600:'#9a7a3a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"','Georgia','serif'],
        body:    ['"Source Serif 4"','Georgia','serif'],
        ui:      ['"DM Sans"','system-ui','sans-serif'],
        mono:    ['"JetBrains Mono"','monospace'],
      },
      spacing: {'18':'4.5rem','88':'22rem','128':'32rem'},
      animation: {
        'fade-in':  'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:  {'0%':{opacity:'0'},'100%':{opacity:'1'}},
        slideUp: {'0%':{transform:'translateY(20px)',opacity:'0'},'100%':{transform:'translateY(0)',opacity:'1'}},
      },
    },
  },
  plugins: [],
}