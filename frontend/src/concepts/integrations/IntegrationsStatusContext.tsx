import * as React from 'react';
import { type IntegrationAppStatus } from '#~/types';
import { useComponentIntegrationsStatus } from '#~/concepts/integrations/useComponentIntegrationsStatus';

export type IntegrationsStatusContextType = {
  integrationStatus: Record<string, IntegrationAppStatus>;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<Record<string, IntegrationAppStatus> | undefined>;
};

export const IntegrationsStatusContext = React.createContext<IntegrationsStatusContextType>({
  integrationStatus: {},
  loaded: false,
  error: undefined,
  refresh: async () => undefined,
});

type IntegrationsStatusProviderProps = {
  children: React.ReactNode;
};

export const IntegrationsStatusProvider: React.FC<IntegrationsStatusProviderProps> = ({
  children,
}) => {
  const { data, loaded, error, refresh } = useComponentIntegrationsStatus();

  const contextValue = React.useMemo(
    () => ({ integrationStatus: data, loaded, error, refresh }),
    [data, loaded, error, refresh],
  );

  return (
    <IntegrationsStatusContext.Provider value={contextValue}>
      {children}
    </IntegrationsStatusContext.Provider>
  );
};
