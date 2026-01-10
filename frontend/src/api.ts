import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const login = async (username: string, password: string) => {
    const response = await api.post('/auth/token', { username, password });
    return response.data;
};

export const getBooks = async (token: string) => {
    const response = await api.get('/books/', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export default api;
