import axios from '~/app/utilities/axios';
import { getCurrentUser } from '~/app/services/userService';

// Mock axios
jest.mock('~/app/utilities/axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('userService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCurrentUser', () => {
    it('should return user data when API call succeeds', async () => {
      const mockUserData = { userId: 'testuser' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockUserData });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUserData);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/user');
    });

    it('should return empty userId when API call succeeds with empty response', async () => {
      const mockUserData = { userId: '' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockUserData });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUserData);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/user');
    });

    it('should throw error with API error message when API call fails with error response', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Authentication failed',
            },
          },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getCurrentUser()).rejects.toThrow('Authentication failed');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/user');
    });

    it('should throw error with generic message when API call fails without error response', async () => {
      const mockError = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getCurrentUser()).rejects.toThrow('Network error');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/user');
    });

    it('should throw error with fallback message when API call fails with no message', async () => {
      const mockError = {};
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getCurrentUser()).rejects.toThrow('Failed to fetch user');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/user');
    });

    it('uses URL_PREFIX when provided (e.g., "/gen-ai")', async () => {
      jest.resetModules();
      process.env.URL_PREFIX = '/gen-ai';

      const axiosModule = await import('~/app/utilities/axios');
      const localMockedAxios = axiosModule.default as unknown as { get: jest.Mock };
      localMockedAxios.get.mockResolvedValueOnce({ data: { userId: 'testuser' } });

      const { getCurrentUser: getWithPrefix } = await import('~/app/services/userService');

      await getWithPrefix();
      expect(localMockedAxios.get).toHaveBeenCalledWith('/gen-ai/api/v1/user');
    });
  });
});
