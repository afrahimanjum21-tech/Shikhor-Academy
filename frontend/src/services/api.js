import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set the correct Content-Type (with boundary) for file uploads
    if (config.data instanceof FormData) {
        if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
        }
    }
    return config;
});

// Endpoints whose `{ data: [...] }` wrapper should auto-unwrap to bare array.
// __IMPORTANT__: Do NOT add `/admin/contact-messages` or similar paginated
// endpoints here — those components need the pagination metadata at the top level.
const UNWRAP_ENDPOINTS = [
    '/admin/students',
    '/admin/batches',
    '/admin/course-categories',
    '/admin/events',
    '/public/notices',
    '/admin/payments',
    '/public/teachers',
    '/public/gallery',
    '/public/materials',
    '/public/courses',
    '/public/course-categories',
    '/public/faculty',
    '/admin/admissions',
    '/admin/faculty',
    '/admin/faculty/',
    '/admin/e-learning',
    '/admin/exams',
    '/admin/courses',
    '/admin/attendance/leave-requests',
    '/admin/routines',
    '/admin/student/',
];

api.interceptors.response.use((response) => {
    try {
        if (
            response.data &&
            Array.isArray(response.data.data)
        ) {
            const url = (response.config && response.config.url) || '';
            if (UNWRAP_ENDPOINTS.some(ep => url.includes(ep))) {
                response.data = response.data.data;
            }
        }
    } catch (e) {
        // Silently ignore interceptor errors — never let the interceptor
        // break a valid response from reaching the caller.
    }
    return response;
});

export default api;
