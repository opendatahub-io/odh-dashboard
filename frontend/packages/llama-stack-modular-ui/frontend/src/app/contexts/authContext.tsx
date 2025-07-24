import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '@app/services/authService';

// Auth context types
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOAuthEnabled: boolean | null;
  handleAuthenticationCheck: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOAuthEnabled, setIsOAuthEnabled] = useState<boolean | null>(null);

  const handleAuthenticationCheck = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authService.handleAuthenticationCheck();
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AuthProvider] Authentication check failed:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    // Initialize OAuth config
    const initializeAuth = async () => {
      try {
        const config = await authService.loadConfig();
        setIsOAuthEnabled(config.oauthEnabled);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[AuthProvider] Failed to load OAuth config:', error);
        setIsOAuthEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to authentication state changes
    const unsubscribe = authService.addAuthListener((authenticated) => {
      setIsAuthenticated(authenticated);
    });

    return unsubscribe;
  }, []);

  const contextValue: AuthContextType = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      isOAuthEnabled,
      handleAuthenticationCheck,
    }),
    [isAuthenticated, isLoading, isOAuthEnabled, handleAuthenticationCheck],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
