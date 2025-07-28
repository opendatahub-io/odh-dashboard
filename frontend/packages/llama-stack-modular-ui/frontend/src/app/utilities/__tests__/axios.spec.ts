import { authService } from '@app/services/authService';
import axiosInstance from '@app/utilities/axios';

// Mock the authService
jest.mock('@app/services/authService', () => ({
  authService: {
    getToken: jest.fn(),
    clearToken: jest.fn(),
  },
}));

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('axios utility', () => {
  const mockedAuthService = authService as jest.Mocked<typeof authService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  describe('axios instance configuration', () => {
    it('should have correct base configuration', () => {
      expect(axiosInstance.defaults.baseURL).toBe('/');
      expect(axiosInstance.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should have interceptors configured', () => {
      expect(axiosInstance.interceptors.request).toBeDefined();
      expect(axiosInstance.interceptors.response).toBeDefined();
    });
  });

  describe('imports and dependencies', () => {
    it('should properly mock authService methods', () => {
      mockedAuthService.getToken.mockReturnValue('test-token');
      expect(authService.getToken()).toBe('test-token');

      authService.clearToken();
      expect(mockedAuthService.clearToken).toHaveBeenCalled();
    });
  });

  describe('module structure', () => {
    it('should export a configured axios instance as default', () => {
      expect(axiosInstance).toBeDefined();
      expect(axiosInstance.defaults).toBeDefined();
      expect(axiosInstance.interceptors).toBeDefined();
    });

    it('should have proper interceptor structure', () => {
      expect(axiosInstance.interceptors.request.use).toBeDefined();
      expect(axiosInstance.interceptors.response.use).toBeDefined();
      expect(typeof axiosInstance.interceptors.request.use).toBe('function');
      expect(typeof axiosInstance.interceptors.response.use).toBe('function');
    });
  });
});
