import * as React from 'react';
import { type IntegrationAppStatus } from '#~/types';
import { useComponentIntegrationsStatus } from './useComponentIntegrations';

export type NIMAvailabilityContextType = {
  integrationStatus: Record<string, IntegrationAppStatus>;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<Record<string, IntegrationAppStatus> | undefined>;
};

type NIMAvailabilityContextProviderProps = {
  children: React.ReactNode;
};

export const NIMAvailabilityContext = React.createContext<NIMAvailabilityContextType>({
  integrationStatus: {},
  loaded: false,
  error: undefined,
  refresh: async () => undefined,
});

export const NimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({
  children,
  ...props
}) => <EnabledNimContextProvider {...props}>{children}</EnabledNimContextProvider>;

const EnabledNimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({ children }) => {
  const { data, loaded, error, refresh } = useComponentIntegrationsStatus();

  const contextValue = React.useMemo(
    () => ({ integrationStatus: data, loaded, error, refresh }),
    [data, loaded, error, refresh],
  );

  console.log('contextValue', contextValue);
  return (
    <NIMAvailabilityContext.Provider value={contextValue}>
      {children}
    </NIMAvailabilityContext.Provider>
  );
};
