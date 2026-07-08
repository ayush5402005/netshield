import axios from 'axios';

export const apiBase = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080';
export const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://127.0.0.1:8080/live';

export const api = axios.create({ baseURL: `${apiBase}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('netshield_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const message = error.response?.data?.error ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  },
);
