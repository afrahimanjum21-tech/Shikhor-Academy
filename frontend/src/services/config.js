/**
 * 🔥 শেয়ার্ড কনফিগ — Backend URL (Vite proxy ব্যবহার করে)
 *
 * ডিফল্টভাবে API কল ও ফাইল `/api` ও `/storage` পাথে যায়,
 * আর Vite proxy সেগুলোকে ব্যাকএন্ডে (port 8000) ফরোয়ার্ড করে।
 * এর ফলে শুধু port 5173 ওপেন থাকলেই সব ডিভাইস থেকে কাজ করে।
 *
 * প্রোডাকশনে VITE_API_URL ও VITE_BACKEND_URL এনভ ভেরিয়েবল সেট করলেই হবে।
 */

// ১) পূর্ণ API বেস URL (api.js-এর জন্য)
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ২) Backend এর রুট URL (ছবি/ফাইল পাথের জন্য, "/api" ছাড়া)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * রিলেটিভ পাথকে সম্পূর্ণ URL-এ রূপান্তর করে।
 * যেমন: "uploads/admission_photos/photo.jpg" → "http://192.168.0.101:8000/uploads/..."
 *
 * @param {string|null|undefined} path - রিলেটিভ পাথ (ইতিমধ্যে সম্পূর্ণ http URL হলে অপরিবর্তিত ফেরত দেয়)
 * @returns {string|null} সম্পূর্ণ URL অথবা null
 */
export const buildAssetUrl = (path) => {
    if (!path) return null;

    // Strip localhost / 127.0.0.1 prefix from backend URLs so they become
    // relative and go through the Vite proxy.  This avoids mixed-content
    // warnings when the frontend is served over HTTPS, and also fixes
    // broken images on network devices (where localhost wouldn't resolve).
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//;
    if (isLocal.test(path)) {
        path = path.replace(isLocal, '');
    }

    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // ডবল স্ল্যাশ এড়াতে leading slash কেটে দেওয়া
    const cleanPath = path.replace(/^\/+/, '');
    // storage/app/public/ এ থাকা ফাইলগুলোর জন্য /storage/ prefix দরকার (symlink)
    if (cleanPath.startsWith('faculty/') || cleanPath.startsWith('teacher_photos/') || cleanPath.startsWith('gallery/') || cleanPath.startsWith('elearning/') || cleanPath.startsWith('assignments/') || cleanPath.startsWith('assignment_submissions/') || cleanPath.startsWith('study_materials/')) {
        return `${BACKEND_URL}/storage/${cleanPath}`;
    }
    return `${BACKEND_URL}/${cleanPath}`;
};
