import { create } from 'zustand';
import axios from 'axios';

// Create a globally accessible axios instance for all APIs
export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('orchestai_user')) || null,
  accessToken: localStorage.getItem('orchestai_token') || null,
  refreshToken: localStorage.getItem('orchestai_refresh_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem('orchestai_token', accessToken);
      localStorage.setItem('orchestai_refresh_token', refreshToken);
      localStorage.setItem('orchestai_user', JSON.stringify(user));

      set({ accessToken, refreshToken, user, isLoading: false });
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.errors?.[0]?.message || 'Authentication failed';
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // Swallowing logout network failures to guarantee client side cleanup
    }

    localStorage.removeItem('orchestai_token');
    localStorage.removeItem('orchestai_refresh_token');
    localStorage.removeItem('orchestai_user');

    set({ accessToken: null, refreshToken: null, user: null });
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return null;

    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data.data;

      localStorage.setItem('orchestai_token', accessToken);
      set({ accessToken });
      return accessToken;
    } catch (err) {
      // Refresh token invalid, clear session
      get().logout();
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));

// Configure Request Interceptor to attach JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Configure Response Interceptor to handle Token Expiry (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      const newToken = await useAuthStore.getState().refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
