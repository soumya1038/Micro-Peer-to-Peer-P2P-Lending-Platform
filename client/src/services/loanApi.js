import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5500/api";

const api = axios.create({
    baseURL: API_URL + "/loans",
});

// Add token to each request dynamically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    // console.log('Interceptor - Token:', token);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // console.log('Interceptor - Authorization header set:', config.headers.Authorization);
    } else {
        // console.log('Interceptor - No token found in localStorage');
    }
    return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
    (response) => {
        // console.log('API Response:', response);
        return response;
    },
    (error) => {
        // // console.log('API Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
    }
);

export default api;