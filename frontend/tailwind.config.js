/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1F4E79',        // আপনার দেওয়া কালার
        'primary-hover': '#163859',
        'primary-light': '#F0F4F8', // খুব হালকা নীল ব্যাকগ্রাউন্ডের জন্য
        'text-main': '#2D3748',
        'text-muted': '#718096',
        // Premium / result-driven palette (UI redesign 2026-10) — additive, so
        // existing pages that use `primary` etc. are unchanged.
        ink: '#0E2338',            // deep navy — hero background + display headlines
        'ink-700': '#17344F',
        brass: '#C8A14A',          // merit/achievement accent (results, toppers, key CTAs)
        'brass-600': '#B4893A',
        'brass-100': '#F6EBCB',
        paper: '#EEF2F7',          // soft off-white surface (used instead of stark white across redesigned pages)
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        // Fraunces for Latin; Tiro Bangla fallback so mixed EN/Bangla display
        // headings (e.g. "About উত্তরণ কোচিং সেন্টার") render Bangla glyphs
        // consistently instead of a browser default serif.
        display: ['Fraunces', '"Tiro Bangla"', 'Georgia', 'serif'],
        bangla: ['"Tiro Bangla"', 'serif'],           // elegant Bengali headlines
      },
      boxShadow: {
        card: '0 4px 20px rgba(14,35,56,0.06)',
        'card-lg': '0 20px 50px rgba(14,35,56,0.12)',
      },
    },
  },
  plugins: [],
}
