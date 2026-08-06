import * as React from 'react';
import type { IntegrationAppStatus } from './types';

export type IntegrationsStatusContextType = {
  integrationStatus: Record<string, IntegrationAppStatus>;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<Record<string, IntegrationAppStatus> | undefined>;
};

/**
 * Shared React context for component integration status.
 *
 * Main app provides the context:
 *   <IntegrationsContext.Provider value={statusValue}>
 *
 * Federated modules consume it:
 *   const { integrationStatus, loaded } = React.useContext(IntegrationsContext);
 */
export const IntegrationsContext = React.createContext<IntegrationsStatusContextType>({
  integrationStatus: {},
  loaded: false,
  error: undefined,
  refresh: async () => undefined,
});
