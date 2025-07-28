/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable camelcase */
import axios from 'axios';
import { authService, type OAuthConfig } from '@app/services/authService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.location
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('AuthService', () => {
  const mockOAuthConfig: OAuthConfig = {
    oauthEnabled: true,
    oauthClientId: 'test-client-id',
    oauthRedirectUri: 'http://localhost:3000/oauth/callback',
    oauthServerUrl: 'https://oauth.example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockLocation.href = '';
    // Reset the singleton instance by clearing token and forcing config reload
    authService.clearToken();
    // Force config to be reloaded by clearing the cached config
    (authService as unknown as { config?: OAuthConfig }).config = undefined;
    // Reset listeners array
    (authService as unknown as { listeners: (typeof authService)['addAuthListener'][] }).listeners =
      [];
  });

  describe('addAuthListener', () => {
    it('should add a listener and return unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = authService.addAuthListener(listener);

      expect(typeof unsubscribe).toBe('function');

      // Trigger notification
      authService.setToken('test-token');
      expect(listener).toHaveBeenCalledWith(true);

      // Unsubscribe and verify listener is not called
      unsubscribe();
      listener.mockClear();
      authService.clearToken();
      expect(listener).not.toHaveBeenCalled();
    });

    it('should call multiple listeners when auth state changes', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      authService.addAuthListener(listener1);
      authService.addAuthListener(listener2);

      authService.setToken('test-token');

      expect(listener1).toHaveBeenCalledWith(true);
      expect(listener2).toHaveBeenCalledWith(true);
    });
  });

  describe('loadConfig', () => {
    it('should load config from API and cache it', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockOAuthConfig });

      const config1 = await authService.loadConfig();
      const config2 = await authService.loadConfig();

      expect(config1).toEqual(mockOAuthConfig);
      expect(config2).toEqual(mockOAuthConfig);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/config');
    });

    it('should throw error when config cannot be loaded', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(authService.loadConfig()).rejects.toThrow('Network error');
    });

    it('should throw error when config response is undefined', async () => {
      mockedAxios.get.mockResolvedValue({ data: undefined });

      await expect(authService.loadConfig()).rejects.toThrow(
        'OAuth configuration could not be loaded',
      );
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      authService.setToken('test-token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when token is null', () => {
      authService.clearToken();

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token is empty string', () => {
      // Set an empty token directly to test the falsy behavior
      authService.setToken('');

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('isAuthenticationRequired', () => {
    it('should return true when OAuth is enabled', async () => {
      mockedAxios.get.mockResolvedValue({ data: { ...mockOAuthConfig, oauthEnabled: true } });

      const result = await authService.isAuthenticationRequired();

      expect(result).toBe(true);
    });

    it('should return false when OAuth is disabled', async () => {
      mockedAxios.get.mockResolvedValue({ data: { ...mockOAuthConfig, oauthEnabled: false } });

      const result = await authService.isAuthenticationRequired();

      expect(result).toBe(false);
    });
  });

  describe('handleAuthenticationCheck', () => {
    it('should return true when OAuth is disabled', async () => {
      mockedAxios.get.mockResolvedValue({ data: { ...mockOAuthConfig, oauthEnabled: false } });

      const result = await authService.handleAuthenticationCheck();

      expect(result).toBe(true);
    });

    it('should return true when OAuth is enabled and user is authenticated', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockOAuthConfig });
      authService.setToken('test-token');

      const result = await authService.handleAuthenticationCheck();

      expect(result).toBe(true);
    });

    it('should initiate login and return false when OAuth is enabled and user is not authenticated', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockOAuthConfig })
        .mockResolvedValueOnce({ data: { state: 'test-state' } });
      authService.clearToken();

      const result = await authService.handleAuthenticationCheck();

      expect(result).toBe(false);
      expect(mockLocation.href).toContain('oauth/authorize');
    });
  });

  describe('getToken and setToken', () => {
    it('should set and get token correctly', () => {
      const token = 'test-token';

      authService.setToken(token);

      expect(authService.getToken()).toBe(token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', token);
    });

    it('should notify listeners when setting token', () => {
      const listener = jest.fn();
      authService.addAuthListener(listener);

      authService.setToken('test-token');

      expect(listener).toHaveBeenCalledWith(true);
    });
  });

  describe('clearToken', () => {
    it('should clear token and remove from localStorage', () => {
      authService.setToken('test-token');

      authService.clearToken();

      expect(authService.getToken()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should notify listeners when clearing token', () => {
      const listener = jest.fn();
      authService.addAuthListener(listener);
      authService.setToken('test-token');
      listener.mockClear();

      authService.clearToken();

      expect(listener).toHaveBeenCalledWith(false);
    });
  });

  describe('handleCallback', () => {
    it('should handle OAuth callback successfully', async () => {
      const mockResponse = { data: { access_token: 'new-access-token' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      await authService.handleCallback('auth-code', 'oauth-state');

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/auth/callback', {
        code: 'auth-code',
        state: 'oauth-state',
      });
      expect(authService.getToken()).toBe('new-access-token');
    });

    it('should throw error when state parameter is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(authService.handleCallback('auth-code')).rejects.toThrow(
        'OAuth state parameter is missing',
      );
      consoleSpy.mockRestore();
    });

    it('should throw error when API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockedAxios.post.mockRejectedValue(new Error('API error'));

      await expect(authService.handleCallback('auth-code', 'oauth-state')).rejects.toThrow(
        'API error',
      );
      consoleSpy.mockRestore();
    });
  });

  describe('initiateLogin', () => {
    beforeEach(() => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockOAuthConfig })
        .mockResolvedValueOnce({ data: { state: 'test-state' } });
    });

    it('should initiate OAuth login with correct parameters', async () => {
      await authService.initiateLogin();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/config');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/auth/state');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('oauth_state', 'test-state');

      const expectedUrl =
        'https://oauth.example.com/oauth/authorize?' +
        'response_type=code&' +
        'client_id=test-client-id&' +
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fcallback&' +
        'scope=user%3Afull&' +
        'state=test-state';

      expect(mockLocation.href).toBe(expectedUrl);
    });

    it('should throw error when OAuth client ID is missing', async () => {
      mockedAxios.get.mockReset();
      mockedAxios.get.mockResolvedValue({ data: { ...mockOAuthConfig, oauthClientId: '' } });

      await expect(authService.initiateLogin()).rejects.toThrow('OAuth client ID is missing');
    });

    it('should throw error when OAuth redirect URI is missing', async () => {
      mockedAxios.get.mockReset();
      mockedAxios.get.mockResolvedValue({ data: { ...mockOAuthConfig, oauthRedirectUri: '' } });

      await expect(authService.initiateLogin()).rejects.toThrow('OAuth redirect URI is missing');
    });

    it('should throw error when OAuth server URL is missing', async () => {
      mockedAxios.get.mockReset();
      mockedAxios.get.mockResolvedValue({ data: { ...mockOAuthConfig, oauthServerUrl: '' } });

      await expect(authService.initiateLogin()).rejects.toThrow('OAuth server URL is missing');
    });

    it('should throw error when state parameter cannot be retrieved', async () => {
      mockedAxios.get.mockReset();
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockOAuthConfig })
        .mockResolvedValueOnce({ data: { state: null } });

      await expect(authService.initiateLogin()).rejects.toThrow(
        'Failed to get OAuth state parameter',
      );
    });
  });
  describe('error handling and edge cases', () => {
    it('should handle malformed config response gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      await expect(authService.loadConfig()).rejects.toThrow(
        'OAuth configuration could not be loaded',
      );
    });

    it('should handle network errors during config loading', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network unavailable'));

      await expect(authService.loadConfig()).rejects.toThrow('Network unavailable');
    });

    it('should handle state API failure during login initiation', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockOAuthConfig })
        .mockRejectedValueOnce(new Error('State API error'));

      await expect(authService.initiateLogin()).rejects.toThrow('State API error');
    });
  });
});
