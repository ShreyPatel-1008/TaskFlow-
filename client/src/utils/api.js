import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    // 30s timeout — gives Render's free tier time to wake up from cold start
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - attach token
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('taskflow_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - ONLY clear auth on a real 401 Unauthorized.
// Network errors, timeouts, and 5xx errors must NOT log the user out,
// because the Render backend may simply be cold-starting.
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Server explicitly rejected the token — it's invalid/expired
            localStorage.removeItem('taskflow_token');
            localStorage.removeItem('taskflow_user');
            window.location.href = '/login';
        }
        // For network errors / timeouts: do NOT clear token, just propagate
        return Promise.reject(error);
    }
);

export default API;
