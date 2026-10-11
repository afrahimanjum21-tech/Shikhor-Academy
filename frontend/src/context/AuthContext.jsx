import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import logger from '../services/logger';

const AuthContext = createContext({
    user: null,
    token: null,
    login: (payload) => {},
    logout: () => {},
    refreshUser: () => {},
});

export const AuthProvider = ({ children }) => {
    // সেফটি চেক: যদি লোকাল স্টোরেজে ভুল ডাটা থাকে
    const getStoredUser = () => {
        try {
            return JSON.parse(localStorage.getItem('USER'));
        } catch {
            return null;
        }
    };

    const [user, setUser] = useState(getStoredUser());
    // J: the JWT now lives ONLY in a HttpOnly cookie (not readable by JS), so we
    // no longer keep it in localStorage. `authed` is a non-secret flag mirroring
    // "do we believe there is a session?" — seeded from the cached USER profile.
    // The cookie is what actually authenticates every request.
    const [authed, setAuthed] = useState(() => !!getStoredUser());

    useEffect(() => {
        const handleStorageChange = (e) => {
            // Cross-tab logout: another tab cleared the cached profile.
            if (e.key === 'USER' && !e.newValue) {
                setUser(null);
                setAuthed(false);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        if (!authed) return;

        // Validate the cookie session and refresh the profile. A 401 means the
        // cookie is gone/expired → clear the optimistic session.
        api.get('/user')
            .then(({ data }) => {
                setUser(data);
                localStorage.setItem('USER', JSON.stringify(data));
            })
            .catch((err) => {
                if (err?.response?.status === 401) {
                    setUser(null);
                    setAuthed(false);
                    localStorage.removeItem('USER');
                }
            });
    }, [authed]);

    const login = async (credentials) => {
        try {
            const { data } = await api.post('/login', credentials);

            setUser(data.user);
            setAuthed(true);
            // NOTE: data.token is intentionally NOT stored — the HttpOnly cookie
            // set by the server authenticates subsequent requests.
            localStorage.setItem('USER', JSON.stringify(data.user));

            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Login failed' };
        }
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            logger.error(e);
        }
        setUser(null);
        setAuthed(false);
        localStorage.removeItem('USER');
        localStorage.removeItem('ACCESS_TOKEN'); // drop any legacy stored token
    };

    const refreshUser = async () => {
        try {
            const { data } = await api.get('/user');
            setUser(data);
            localStorage.setItem('USER', JSON.stringify(data));
        } catch {
            // ignore
        }
    };

    // `token` is kept in the context shape for backward compatibility with
    // existing route guards; it is now a non-secret presence flag, NOT the JWT.
    const token = authed ? 'cookie' : null;

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
