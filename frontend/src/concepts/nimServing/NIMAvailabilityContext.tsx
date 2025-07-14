import * as React from 'react';
import { useIsNIMAvailable } from '#~/pages/modelServing/screens/projects/useIsNIMAvailable';

export type NIMAvailabilityContextType = {
  isNIMAvailable: boolean;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<boolean | undefined>;
};

type NIMAvailabilityContextProviderProps = {
  children: React.ReactNode;
};

export const NIMAvailabilityContext = React.createContext<NIMAvailabilityContextType>({
  isNIMAvailable: false,
  loaded: false,
  error: undefined,
  refresh: async () => undefined,
});

export const NimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({
  children,
  ...props
}) => <EnabledNimContextProvider {...props}>{children}</EnabledNimContextProvider>;

const EnabledNimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({ children }) => {
  const [isNIMAvailable, loaded, error, refresh] = useIsNIMAvailable();

  const contextValue = React.useMemo(
    () => ({ isNIMAvailable, loaded, error, refresh }),
    [isNIMAvailable, loaded, error, refresh],
  );

  return (
    <NIMAvailabilityContext.Provider value={contextValue}>
      {children}
    </NIMAvailabilityContext.Provider>
  );
};
