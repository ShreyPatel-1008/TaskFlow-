import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('taskflow_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [token, setToken] = useState(() => {
        return localStorage.getItem('taskflow_token');
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initialToken = localStorage.getItem('taskflow_token');
        if (initialToken) {
            API.get('/auth/me')
                .then(res => {
                    // Server confirmed the token — update cached user
                    setUser(res.data.user);
                    localStorage.setItem('taskflow_user', JSON.stringify(res.data.user));
                })
                .catch((err) => {
                    const status = err.response?.status;
                    if (status === 401) {
                        // Token is genuinely invalid/expired — must log out
                        localStorage.removeItem('taskflow_token');
                        localStorage.removeItem('taskflow_user');
                        setUser(null);
                        setToken(null);
                    } else {
                        // Network error, timeout, or server cold-starting (5xx, no response).
                        // Keep the cached user so the user stays on their dashboard.
                        // The API interceptor will re-validate on the next real request.
                        const cachedUser = localStorage.getItem('taskflow_user');
                        if (cachedUser) {
                            setUser(JSON.parse(cachedUser));
                        } else {
                            setUser(null);
                        }
                    }
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('taskflow_token', res.data.token);
        localStorage.setItem('taskflow_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setToken(res.data.token);
        return res.data;
    }, []);

    const register = useCallback(async (name, email, password) => {
        const res = await API.post('/auth/register', { name, email, password });
        localStorage.setItem('taskflow_token', res.data.token);
        localStorage.setItem('taskflow_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setToken(res.data.token);
        return res.data;
    }, []);

    const googleLogin = useCallback(async (t) => {
        const res = await API.post('/auth/google', { token: t });
        localStorage.setItem('taskflow_token', res.data.token);
        localStorage.setItem('taskflow_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setToken(res.data.token);
        return res.data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
        setUser(null);
        setToken(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};
