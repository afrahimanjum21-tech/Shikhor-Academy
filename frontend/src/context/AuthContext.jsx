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
    const [token, setToken] = useState(localStorage.getItem('ACCESS_TOKEN'));

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'ACCESS_TOKEN' && !e.newValue) {
                setUser(null);
                setToken(null);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        if (!token) return;

        api.get('/user')
            .then(({ data }) => {
                setUser(data);
                localStorage.setItem('USER', JSON.stringify(data));
            })
            .catch(() => {
                if (!localStorage.getItem('ACCESS_TOKEN')) {
                    setUser(null);
                    setToken(null);
                }
            });
    }, [token]);

    const login = async (credentials) => {
        try {
            const { data } = await api.post('/login', credentials);
            
            setUser(data.user);
            setToken(data.token);
            
            localStorage.setItem('ACCESS_TOKEN', data.token);
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
        setToken(null);
        localStorage.removeItem('ACCESS_TOKEN');
        localStorage.removeItem('USER');
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

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
