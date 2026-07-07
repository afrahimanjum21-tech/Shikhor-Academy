/**
 * 🔥 শেয়ার্ড কনফিগ — Backend URL স্বয়ংক্রিয়ভাবে নির্ধারণ করে
 *
 * এটি যেকোনো নেটওয়ার্ক/IP-তে কাজ করে (localhost, LAN IP, production domain)।
 * ব্রাউজার যে হোস্ট থেকে সাইট খোলে, সেই হোস্টের সাথে port 8000 যুক্ত করে।
 *
 * উদাহরণ:
 *   - http://localhost:5173     → http://localhost:8000
 *   - http://192.168.0.101:5173 → http://192.168.0.101:8000
 *   - https://mysite.com        → https://mysite.com
 */

// ১) পূর্ণ API বেস URL (api.js-এর জন্য)
export const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000/api`;

// ২) Backend এর রুট URL (ছবি/ফাইল পাথের জন্য, "/api" ছাড়া)
export const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

/**
 * রিলেটিভ পাথকে সম্পূর্ণ URL-এ রূপান্তর করে।
 * যেমন: "uploads/admission_photos/photo.jpg" → "http://192.168.0.101:8000/uploads/..."
 *
 * @param {string|null|undefined} path - রিলেটিভ পাথ (ইতিমধ্যে সম্পূর্ণ http URL হলে অপরিবর্তিত ফেরত দেয়)
 * @returns {string|null} সম্পূর্ণ URL অথবা null
 */
export const buildAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // ডবল স্ল্যাশ এড়াতে leading slash কেটে দেওয়া
    const cleanPath = path.replace(/^\/+/, '');
    return `${BACKEND_URL}/${cleanPath}`;
};
