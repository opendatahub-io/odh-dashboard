import React from 'react';
import { DeploymentsStateContext } from '~/odh/hooks/useDeploymentsState';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryVersionDeploymentsContextExtension } from '~/odh/extension-points/deploy';

interface MRDeploymentsContextProviderProps {
  children: React.ReactNode;
  labelSelectors?: { [key: string]: string };
}

/**
 * Provider component that automatically wraps children with deployments context if available.
 * Uses extensions to provide the deployments provider.
 */
export const MRDeploymentsContextProvider: React.FC<MRDeploymentsContextProviderProps> = ({
  children,
  labelSelectors,
}) => {
  const [deploymentsContextExtensions, deploymentsContextLoaded] = useResolvedExtensions(
    isModelRegistryVersionDeploymentsContextExtension,
  );

  const DeploymentsProviderComponent = React.useMemo(
    () =>
      deploymentsContextLoaded && deploymentsContextExtensions?.[0]?.properties.DeploymentsProvider,
    [deploymentsContextLoaded, deploymentsContextExtensions],
  );

  if (deploymentsContextLoaded && DeploymentsProviderComponent) {
    return (
      <DeploymentsProviderComponent labelSelectors={labelSelectors}>
        {
          (deploymentsContextValue) => (
              <DeploymentsStateContext.Provider value={deploymentsContextValue}>
                {children}
              </DeploymentsStateContext.Provider>
          )
        }
      </DeploymentsProviderComponent>
    );
  }

  return children;
};
