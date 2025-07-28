// eslint-disable-next-line no-restricted-imports
import axios from 'axios';
import { authService } from '@app/services/authService';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Only add auth token to API requests, not static assets
    const isApiRequest = config.url?.startsWith('/api/') || config.url?.startsWith('/llama-stack/');

    if (isApiRequest) {
      const token = authService.getToken();
      if (token) {
        // eslint-disable-next-line no-param-reassign
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Special case: Don't redirect to login for models endpoint 401/403 errors
    // These should be handled gracefully as permission errors
    const isModelsEndpoint = error.config?.url?.includes('/api/llama-stack/v1/models');

    // Only handle 401 (Unauthorized) as authentication failure, except for models endpoint
    // 403 (Forbidden) should be handled by individual API calls for permission errors
    if (error.response?.status === 401 && !isModelsEndpoint) {
      // Clear token and redirect to login
      authService.clearToken();
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
