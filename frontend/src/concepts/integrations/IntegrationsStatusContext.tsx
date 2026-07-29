import * as React from 'react';
import { IntegrationsContext } from '@odh-dashboard/plugin-core/integrations';
import { useComponentIntegrationsStatus } from '#~/concepts/integrations/useComponentIntegrationsStatus';

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
    <IntegrationsContext.Provider value={contextValue}>{children}</IntegrationsContext.Provider>
  );
};
