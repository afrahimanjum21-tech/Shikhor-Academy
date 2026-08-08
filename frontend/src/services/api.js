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
    if (config.data instanceof FormData) {
        if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
        }
    }
    return config;
});

const UNWRAP_ENDPOINTS = [
    '/admin/students',
    '/admin/teachers',
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

// Endpoints that ALWAYS wrap their payload in { data: ... } (array or object).
// These must be unwrapped so pages receive the payload directly.
const UNWRAP_ALWAYS_ENDPOINTS = [
    '/admin/faculty/',
    '/student/dashboard',
    '/student/results',
    '/student/attendance/stats',
    '/student/routine',
    '/student/payments',
    '/student/payment/initiate',
    '/student/payment/status',
    '/student/documents',
    '/student/assignments',
    '/student/assignment-results',
    '/public/events',
    '/public/e-learning',
    '/notifications/counts',
    '/notifications/unread-count',
    '/recent-activity',
    '/teacher/dashboard',
    '/teacher/batches',
    '/teacher/students',
    '/teacher/profile',
    '/teacher/attendance/students/',
    '/teacher/exams',
    '/teacher/materials',
    '/teacher/assignments',
];

api.interceptors.response.use(
    (response) => {
        try {
            const payload = response.data;
            const url = (response.config && response.config.url) || '';
            if (
                payload &&
                payload.data !== undefined &&
                payload.data !== null &&
                (
                    UNWRAP_ALWAYS_ENDPOINTS.some(ep => url.includes(ep)) ||
                    (
                        Array.isArray(payload.data) &&
                        UNWRAP_ENDPOINTS.some(ep => url.includes(ep))
                    )
                )
            ) {
                response.data = payload.data;
            }
        } catch (e) {
            // Silently ignore interceptor errors
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            const wasLoggedIn = localStorage.getItem('ACCESS_TOKEN');
            localStorage.removeItem('ACCESS_TOKEN');
            localStorage.removeItem('USER');
            if (wasLoggedIn && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
