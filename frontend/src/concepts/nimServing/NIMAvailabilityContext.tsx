import * as React from 'react';
import { useIsNIMAvailable } from '~/pages/modelServing/screens/projects/useIsNIMAvailable';

export type NIMAvailabilityContextType = {
  isNIMAvailable: boolean;
  loaded: boolean;
};

type NIMAvailabilityContextProviderProps = {
  children: React.ReactNode;
};

export const NIMAvailabilityContext = React.createContext<NIMAvailabilityContextType>({
  isNIMAvailable: false,
  loaded: false,
});

export const NimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({
  children,
  ...props
}) => <EnabledNimContextProvider {...props}>{children}</EnabledNimContextProvider>;

const EnabledNimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({ children }) => {
  const [isNIMAvailable, loaded] = useIsNIMAvailable();

  const contextValue = React.useMemo(() => ({ isNIMAvailable, loaded }), [isNIMAvailable, loaded]);

  return (
    <NIMAvailabilityContext.Provider value={contextValue}>
      {children}
    </NIMAvailabilityContext.Provider>
  );
};
