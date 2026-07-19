import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const LS_PREFIX = 'last_viewed_';

// Maps page keys to the count keys returned by the backend
const countKeyMap = {
    assignments: 'pending_assignments',
    results: 'recently_reviewed',
    reviews: 'pending_reviews',
    admissions: 'pending_admissions',
    leaves: 'pending_leave_requests',
    payments: 'pending_payments',
    library: 'new_materials',
    gallery: 'new_albums',
    exam_results: 'new_exam_results',
    routine: 'updated_routine',
    calendar: 'new_events',
    attendance: 'attendance_updates',
    fees: 'pending_fees',
    extra_curricular: 'new_activities',
    attitude: 'new_activities',
    e_learning: 'new_videos',
    messages: 'unread_messages',
};

// Maps page keys to notification types so visiting a page marks those notifications as read
const pageToNotifType = {
    admissions: 'admission',
    payments: 'payment',
    messages: 'message',
    leaves: 'leave',
    assignments: 'assignment',
    routine: 'routine',
    attendance: 'attendance',
    exam_results: 'exam',
    library: 'material',
    calendar: 'event',
};

export function getLastViewed(key) {
    return localStorage.getItem(LS_PREFIX + key) || '';
}

export function markPageViewed(key) {
    localStorage.setItem(LS_PREFIX + key, new Date().toISOString());
}

const NotificationContext = createContext({});

const INIT_DONE_KEY = LS_PREFIX + '_init_done';

function ensureLastViewed() {
    if (localStorage.getItem(INIT_DONE_KEY)) return;
    localStorage.setItem(INIT_DONE_KEY, '1');
}

export function NotificationProvider({ children }) {
    const { token } = useAuth();
    const [counts, setCounts] = useState({});
    const timerRef = useRef(null);

    const fetchCounts = useCallback(() => {
        if (!token) return;

        ensureLastViewed();

        const since = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith(LS_PREFIX) && !k.endsWith('_init_done')) {
                since['since_' + k.slice(LS_PREFIX.length)] = localStorage.getItem(k);
            }
        }

        api.get('/notifications/counts', { params: since })
            .then(({ data }) => setCounts(data || {}))
            .catch(() => {});
    }, [token]);

    const markViewed = useCallback((pageKey) => {
        markPageViewed(pageKey);
        const countKey = countKeyMap[pageKey];
        if (countKey) {
            setCounts(prev => ({ ...prev, [countKey]: 0 }));
        }
        const notifType = pageToNotifType[pageKey];
        if (notifType) {
            api.post('/notifications/read-by-type', { type: notifType }).catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (!token) {
            setCounts({});
            return;
        }

        fetchCounts();
        timerRef.current = setInterval(fetchCounts, 30000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [token, fetchCounts]);

    return (
        <NotificationContext.Provider value={{ counts, markViewed }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotificationCounts = () => useContext(NotificationContext);
