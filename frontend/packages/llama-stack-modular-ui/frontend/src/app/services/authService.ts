/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable camelcase */
import axios from 'axios';

export type OAuthConfig = {
  oauthEnabled: boolean;
  oauthClientId: string;
  oauthRedirectUri: string;
  oauthServerUrl: string;
};

type AuthStateListener = (isAuthenticated: boolean) => void;

class AuthService {
  private token: string | null = null;
  private config?: OAuthConfig;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private listeners: AuthStateListener[] = [];

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  // Add listener for authentication state changes
  addAuthListener(listener: AuthStateListener): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all listeners of auth state change
  private notifyListeners() {
    const isAuthenticated = this.isAuthenticated();
    this.listeners.forEach((listener) => listener(isAuthenticated));
  }

  async loadConfig(): Promise<OAuthConfig> {
    if (!this.config) {
      const response = await axios.get('/api/v1/config');
      this.config = response.data;
    }
    if (!this.config) {
      throw new Error('OAuth configuration could not be loaded');
    }
    return this.config;
  }

  isAuthenticated(): boolean {
    const result = !!this.token;
    return result;
  }

  async isAuthenticationRequired(): Promise<boolean> {
    const config = await this.loadConfig();
    return config.oauthEnabled;
  }

  async handleAuthenticationCheck(): Promise<boolean> {
    const config = await this.loadConfig();

    // If OAuth is disabled, user always has access
    if (!config.oauthEnabled) {
      return true;
    }

    // If OAuth is enabled, check if user is authenticated
    if (this.isAuthenticated()) {
      return true;
    }

    // If OAuth is enabled and user is not authenticated, automatically redirect
    await this.initiateLogin();
    return false; // Return false since we're redirecting
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.notifyListeners();
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    this.notifyListeners();
  }

  // Handle OAuth callback
  async handleCallback(code: string, state?: string): Promise<void> {
    try {
      if (!state) {
        throw new Error('OAuth state parameter is missing');
      }

      const response = await axios.post('/api/v1/auth/callback', {
        code,
        state,
      });
      const { access_token } = response.data;
      this.setToken(access_token);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Frontend] Error handling OAuth callback:', error);
      throw error;
    }
  }

  // Initiate OAuth login
  async initiateLogin() {
    const config = await this.loadConfig();
    const { oauthClientId, oauthRedirectUri, oauthServerUrl } = config;

    // Validate all required config values
    if (!oauthClientId) {
      throw new Error('OAuth client ID is missing');
    }
    if (!oauthRedirectUri) {
      throw new Error('OAuth redirect URI is missing');
    }
    if (!oauthServerUrl) {
      throw new Error('OAuth server URL is missing');
    }

    // Get state parameter from backend
    const stateResponse = await axios.get('/api/v1/auth/state');
    const { state } = stateResponse.data;

    if (!state) {
      throw new Error('Failed to get OAuth state parameter');
    }

    localStorage.setItem('oauth_state', state);
    const authUrl =
      `${oauthServerUrl}/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(oauthClientId)}&` +
      `redirect_uri=${encodeURIComponent(oauthRedirectUri)}&` +
      `scope=${encodeURIComponent('user:full')}&` +
      `state=${encodeURIComponent(state)}`;
    window.location.href = authUrl;
  }

  // Logout
  logout() {
    this.clearToken();
    window.location.href = '/';
  }
}

export const authService = new AuthService();
