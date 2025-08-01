import React from 'react';
import { useResolvedExtensions, HookNotify } from '@odh-dashboard/plugin-core';
import { isModelRegistryVersionDeploymentsContextExtension } from '~/odh/extension-points/deploy';

export const useDeploymentsContext = () => {
  // Get deployments context extension
  const [deploymentsContextExtensions, deploymentsContextLoaded] = useResolvedExtensions(
    isModelRegistryVersionDeploymentsContextExtension,
  );

  const useDeploymentsHook = React.useMemo(
    () =>
      deploymentsContextLoaded &&
      deploymentsContextExtensions?.[0]?.properties.useDeploymentsContext,
    [deploymentsContextLoaded, deploymentsContextExtensions],
  );

  const DeploymentsProviderComponent = React.useMemo(
    () =>
      deploymentsContextLoaded && deploymentsContextExtensions?.[0]?.properties.DeploymentsProvider,
    [deploymentsContextLoaded, deploymentsContextExtensions],
  );

  const [deploymentsState, setDeploymentsState] = React.useState<{
    deployments?: any[];
    loaded: boolean;
    errors?: Error[];
    projects?: any[];
  }>({
    deployments: undefined,
    loaded: false,
    errors: undefined,
    projects: undefined,
  });

  const hookNotifyComponent = React.useMemo(
    () =>
      useDeploymentsHook && DeploymentsProviderComponent ? (
        <HookNotify
          useHook={useDeploymentsHook}
          onNotify={(value) => {
            if (value) {
              setDeploymentsState(value);
            }
          }}
        />
      ) : null,
    [useDeploymentsHook, DeploymentsProviderComponent],
  );

  return {
    deploymentsState,
    DeploymentsProviderComponent,
    hookNotifyComponent,
    isExtensionLoaded: deploymentsContextLoaded,
  };
};
