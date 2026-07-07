/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1F4E79',        // আপনার দেওয়া কালার
        'primary-hover': '#163859', 
        'primary-light': '#F0F4F8', // খুব হালকা নীল ব্যাকগ্রাউন্ডের জন্য
        'text-main': '#2D3748',
        'text-muted': '#718096',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}