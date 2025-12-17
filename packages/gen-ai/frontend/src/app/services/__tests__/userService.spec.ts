import { getCurrentUser } from '~/app/services/userService';
import { URL_PREFIX } from '~/app/utilities/const';

// Mock mod-arch-core
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
}));

const { restGET } = jest.requireMock('mod-arch-core');
const mockedRestGET = restGET as jest.Mock;

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user data when API call succeeds', async () => {
      const mockUserData = { userId: 'testuser' };
      mockedRestGET.mockResolvedValueOnce({ data: mockUserData });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUserData);
      expect(mockedRestGET).toHaveBeenCalledWith(URL_PREFIX, '/api/v1/user', {}, {});
    });

    it('should return empty userId when API call succeeds with empty response', async () => {
      const mockUserData = { userId: '' };
      mockedRestGET.mockResolvedValueOnce({ data: mockUserData });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUserData);
      expect(mockedRestGET).toHaveBeenCalledWith(URL_PREFIX, '/api/v1/user', {}, {});
    });

    it('should throw error when API call fails', async () => {
      const mockError = new Error('Authentication failed');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getCurrentUser()).rejects.toThrow();
      expect(mockedRestGET).toHaveBeenCalledWith(URL_PREFIX, '/api/v1/user', {}, {});
    });

    it('should throw error when response format is invalid', async () => {
      mockedRestGET.mockResolvedValueOnce({ invalid: 'response' });

      await expect(getCurrentUser()).rejects.toThrow('Invalid response format');
      expect(mockedRestGET).toHaveBeenCalledWith(URL_PREFIX, '/api/v1/user', {}, {});
    });

    it('should pass custom options to restGET', async () => {
      const mockUserData = { userId: 'testuser' };
      const customOpts = { headers: { 'X-Custom': 'header' } };
      mockedRestGET.mockResolvedValueOnce({ data: mockUserData });

      const result = await getCurrentUser(customOpts);

      expect(result).toEqual(mockUserData);
      expect(mockedRestGET).toHaveBeenCalledWith(URL_PREFIX, '/api/v1/user', {}, customOpts);
    });
  });
});
