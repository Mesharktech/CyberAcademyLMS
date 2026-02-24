import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Determine the base URL based on environment (Mobile, Production Vercel/Netlify, or Local Dev)
// In production on Netlify, define VITE_API_URL in the dashboard pointing to your deployed Node.js backend
const baseURL = Capacitor.isNativePlatform()
    ? 'https://cyberacademylms.onrender.com/api'
    : import.meta.env.VITE_API_URL || import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://cyberacademylms.onrender.com/api';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
