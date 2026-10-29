import * as React from 'react';
import { getCurrentUser } from '~/app/services/userService';

type UserContextValue = {
  username: string | undefined;
  refreshUser: () => Promise<void>;
};

const defaultContextValue: UserContextValue = {
  username: undefined,
  refreshUser: async () => Promise.resolve(),
};

const UserContext = React.createContext<UserContextValue>(defaultContextValue);

type UserContextProviderProps = {
  children: React.ReactNode;
};

const USER_LOOKUP_ATTEMPTS = 3;
const USER_LOOKUP_RETRY_MS = 200;

const UserContextProvider: React.FunctionComponent<UserContextProviderProps> = ({ children }) => {
  const [username, setUsername] = React.useState<string | undefined>(undefined);

  const refreshUser = React.useCallback(async () => {
    for (let attempt = 0; attempt < USER_LOOKUP_ATTEMPTS; attempt += 1) {
      try {
        const res = await getCurrentUser({});
        if (res.userId) {
          setUsername(res.userId);
          return;
        }
      } catch {
        // A timeout or empty id is retried before the session keeps uploads disabled.
      }
      if (attempt < USER_LOOKUP_ATTEMPTS - 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, USER_LOOKUP_RETRY_MS);
        });
      }
    }
    setUsername(undefined);
  }, []);

  React.useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = React.useMemo<UserContextValue>(
    () => ({ username, refreshUser }),
    [username, refreshUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

const useUserContext = (): UserContextValue => React.useContext(UserContext);

// New exports
export { UserContextProvider, useUserContext };

// Backwards-compatible aliases (do not remove until all imports are migrated)
export { UserContextProvider as ProjectContextProvider, useUserContext as useProjectContext };
