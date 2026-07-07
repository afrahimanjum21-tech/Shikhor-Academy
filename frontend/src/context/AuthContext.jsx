import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext({
    user: null,
    token: null,
    login: (payload) => {},
    logout: () => {},
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
        if (!token) return;

        api.get('/user')
            .then(({ data }) => {
                setUser(data);
                localStorage.setItem('USER', JSON.stringify(data));
            })
            .catch(() => {
                setUser(null);
                setToken(null);
                localStorage.removeItem('ACCESS_TOKEN');
                localStorage.removeItem('USER');
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
            console.error(e);
        }
        setUser(null);
        setToken(null);
        localStorage.removeItem('ACCESS_TOKEN');
        localStorage.removeItem('USER');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
