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
const USER_LOOKUP_RECOVERY_DELAYS_MS = [2000, 5000];

const lookupUsername = async (): Promise<string | undefined> => {
  for (let attempt = 0; attempt < USER_LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      const res = await getCurrentUser({});
      if (res.userId) {
        return res.userId;
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
  return undefined;
};

const UserContextProvider: React.FunctionComponent<UserContextProviderProps> = ({ children }) => {
  const [username, setUsername] = React.useState<string | undefined>(undefined);

  const refreshUser = React.useCallback(async () => {
    setUsername(await lookupUsername());
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const recoverLater = (delays: number[]) => {
      if (cancelled || delays.length === 0) {
        return;
      }
      const [delay, ...remaining] = delays;
      const timer = setTimeout(() => {
        void (async () => {
          const userId = await lookupUsername();
          if (cancelled) {
            return;
          }
          if (userId) {
            setUsername(userId);
            return;
          }
          recoverLater(remaining);
        })();
      }, delay);
      timers.push(timer);
    };

    void (async () => {
      const userId = await lookupUsername();
      if (cancelled) {
        return;
      }
      setUsername(userId);
      if (!userId) {
        recoverLater([...USER_LOOKUP_RECOVERY_DELAYS_MS]);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

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
