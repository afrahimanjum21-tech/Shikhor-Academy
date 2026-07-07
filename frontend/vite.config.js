import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // এই লাইনটিই ম্যাজিক করবে। এটি Vite-কে বলবে লিঙ্ক করা ফাইলের পথ অনুসরণ না করতে।
    preserveSymlinks: true,
  },
  server: {
    host: true
  }
})