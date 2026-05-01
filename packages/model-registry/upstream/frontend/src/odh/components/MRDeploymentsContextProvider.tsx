import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { DeploymentsStateContext } from '~/odh/hooks/useDeploymentsState';
import { isModelRegistryVersionDeploymentsContextExtension } from '~/odh/extension-points/deploy';

interface MRDeploymentsContextProviderProps {
  children: React.ReactNode;
  labelSelectors?: { [key: string]: string };
  mrName?: string;
}

/**
 * Provider component that automatically wraps children with deployments context if available.
 * Uses extensions to provide the deployments provider.
 */
export const MRDeploymentsContextProvider: React.FC<MRDeploymentsContextProviderProps> = ({
  children,
  labelSelectors,
  mrName,
}) => {
  const [deploymentsContextExtensions, deploymentsContextLoaded] = useResolvedExtensions(
    isModelRegistryVersionDeploymentsContextExtension,
  );

  const DeploymentsProviderComponent = React.useMemo(
    () =>
      deploymentsContextLoaded && deploymentsContextExtensions[0]?.properties.DeploymentsProvider,
    [deploymentsContextLoaded, deploymentsContextExtensions],
  );

  // Default to "loaded with no deployments" when no extension provides a real provider (standalone mode).
  const defaultValue = React.useMemo(() => ({ loaded: true, deployments: [] }), []);

  if (deploymentsContextLoaded && DeploymentsProviderComponent) {
    return (
      <DeploymentsProviderComponent labelSelectors={labelSelectors} mrName={mrName}>
        {(deploymentsContextValue) => (
          <DeploymentsStateContext.Provider value={deploymentsContextValue}>
            {children}
          </DeploymentsStateContext.Provider>
        )}
      </DeploymentsProviderComponent>
    );
  }

  return (
    <DeploymentsStateContext.Provider value={defaultValue}>
      {children}
    </DeploymentsStateContext.Provider>
  );
};
