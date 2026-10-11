import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

// All page keys tracked by the notification system. Used to seed last-viewed
// timestamps on first login so brand-new users don't get counts for every
// item ever created.
const PAGE_KEYS = Object.keys(countKeyMap);

// Maps page keys to notification types so visiting a page marks those notifications as read
const pageToNotifType = {
    admissions: 'admission',
    payments: 'payment',
    messages: 'contact',
    leaves: 'leave',
    notices: 'notice',
    assignments: 'assignment',
    routine: 'routine',
    attendance: 'leave',
    exam_results: 'exam',
    library: 'material',
    calendar: 'event',
    gallery: 'album',
    e_learning: 'video',
    fees: 'payment',
    results: 'assignment',
    extra_curricular: 'event',
    attitude: 'event',
};

// Reverse lookup: notification type -> page key, so acknowledging a single
// notification (e.g. from the bell dropdown) also acknowledges the page-level
// business count that feeds the same bubble.
const notifTypeToPageKey = {
    admission: 'admissions',
    payment: 'payments',
    contact: 'messages',
    leave: 'leaves',
    assignment: 'reviews',
};

// Page keys whose counts are included in the bell bubble (`counts.notifications`)
// for each role, so visiting those pages drops the bubble immediately.
const BELL_PAGE_KEYS = {
    admin: ['admissions', 'payments', 'leaves', 'messages'],
    super_admin: ['admissions', 'payments', 'leaves', 'messages'],
    teacher: ['reviews'],
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
    const now = new Date().toISOString();
    PAGE_KEYS.forEach((key) => {
        if (!localStorage.getItem(LS_PREFIX + key)) {
            localStorage.setItem(LS_PREFIX + key, now);
        }
    });
    localStorage.setItem(INIT_DONE_KEY, '1');
}

export function NotificationProvider({ children }) {
    const { token, user } = useAuth();
    const [counts, setCounts] = useState({});
    const timerRef = useRef(null);
    const retryRef = useRef(null);

    const role = user?.role;
    const bellPageKeys = useMemo(() => BELL_PAGE_KEYS[role] || [], [role]);

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
            .then(({ data }) => {
                setCounts(data || {});
                if (retryRef.current) {
                    clearTimeout(retryRef.current);
                    retryRef.current = null;
                }
            })
            .catch(() => {
                // Retry sooner than the next poll so a transient backend error
                // (e.g. a database pool hiccup) doesn't blank the badges.
                if (retryRef.current) return;
                retryRef.current = setTimeout(() => {
                    retryRef.current = null;
                    fetchCounts();
                }, 15000);
            });
    }, [token]);

    const markViewed = useCallback((pageKey) => {
        markPageViewed(pageKey);
        const countKey = countKeyMap[pageKey];
        if (countKey) {
            setCounts(prev => {
                const drop = prev[countKey] || 0;
                const next = { ...prev, [countKey]: 0 };
                if (bellPageKeys.includes(pageKey)) {
                    next.notifications = Math.max(0, (prev.notifications || 0) - drop);
                }
                if (pageKey === 'admissions') {
                    const hold = prev.hold_admissions || 0;
                    next.hold_admissions = 0;
                    if (bellPageKeys.includes(pageKey)) {
                        next.notifications = Math.max(0, (next.notifications || 0) - hold);
                    }
                }
                return next;
            });
        }
        const notifType = pageToNotifType[pageKey];
        if (notifType) {
            api.post('/notifications/read-by-type', { type: notifType })
                .catch(() => {})
                .finally(() => {
                    // Row-only types (no business count key, e.g. notices) have
                    // no optimistic value to drop, so re-sync counts now
                    // instead of waiting for the next 60s poll.
                    if (!countKey) fetchCounts();
                });
        }
    }, [bellPageKeys, fetchCounts]);

    // Marks one notification row as read (optimistic; backend confirms).
    // For staff, the bell bubble also counts business-table items (contact
    // messages, pending admissions/payments/leaves), so reading a business
    // notification must ALSO acknowledge the underlying count — otherwise the
    // bubble never drops below the business count.
    const markNotificationRead = useCallback((id, type) => {
        const pageKey = type ? notifTypeToPageKey[type] : null;
        const isStaff = role === 'admin' || role === 'super_admin' || role === 'teacher';
        if (pageKey && isStaff) {
            markViewed(pageKey);
        } else {
            setCounts(prev => ({ ...prev, notifications: Math.max(0, (prev.notifications || 0) - 1) }));
        }
        api.post(`/notifications/${id}/read`).catch(() => {});
    }, [role, markViewed]);

    // Marks every notification row as read. For admins/teachers the bell also
    // includes business-table counts, which are acknowledged by advancing the
    // last-viewed timestamps (same semantics as visiting the page).
    const markNotificationAllRead = useCallback(() => {
        setCounts(prev => {
            const next = { ...prev, notifications: 0 };
            if (role === 'admin' || role === 'super_admin') {
                next.pending_admissions = 0;
                next.hold_admissions = 0;
                next.pending_payments = 0;
                next.pending_leave_requests = 0;
                next.unread_messages = 0;
            } else if (role === 'teacher') {
                next.pending_reviews = 0;
                next.pending_submissions = 0;
            }
            return next;
        });
        if (role === 'admin' || role === 'super_admin') {
            ['admissions', 'payments', 'leaves', 'messages'].forEach(markPageViewed);
        } else if (role === 'teacher') {
            markPageViewed('reviews');
        }
        api.post('/notifications/read-all').catch(() => {});
    }, [role]);

    useEffect(() => {
        if (!token) {
            setCounts({});
            return;
        }

        fetchCounts();
        timerRef.current = setInterval(fetchCounts, 60000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, [token, fetchCounts]);

    return (
        <NotificationContext.Provider value={{ counts, markViewed, markNotificationRead, markNotificationAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotificationCounts = () => useContext(NotificationContext);
