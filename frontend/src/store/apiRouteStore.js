import { create } from 'zustand';
import { api } from './authStore';

export const useApiRouteStore = create((set, get) => ({
  routes: [],
  currentRoute: null,
  isLoading: false,
  error: null,

  fetchRoutes: async (params = {}) => {
    set({ isLoading: true });
    try {
      const response = await api.get('/routes', { params });
      set({ routes: response.data.data.routes, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load API routes', isLoading: false });
    }
  },

  fetchRoute: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/routes/${id}`);
      set({ currentRoute: response.data.data.route, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load API route details', isLoading: false });
    }
  },

  createRoute: async (routeData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/routes', routeData);
      const newRoute = response.data.data.route;
      set((state) => ({
        routes: [newRoute, ...state.routes],
        isLoading: false,
      }));
      return newRoute;
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || 'Failed to create API route';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  updateRoute: async (id, routeData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/routes/${id}`, routeData);
      const updated = response.data.data.route;
      set((state) => ({
        routes: state.routes.map((r) => (r._id === id ? updated : r)),
        currentRoute: state.currentRoute?._id === id ? updated : state.currentRoute,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || 'Failed to update API route';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  deleteRoute: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/routes/${id}`);
      set((state) => ({
        routes: state.routes.filter((r) => r._id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err) {
      set({ error: 'Failed to delete API route', isLoading: false });
      return false;
    }
  },

  testRoute: async (id, testData) => {
    set({ isLoading: true });
    try {
      const response = await api.post(`/routes/${id}/test`, testData);
      set({ isLoading: false });
      return response.data.data.result;
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || 'Dynamic API test execution failed';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
