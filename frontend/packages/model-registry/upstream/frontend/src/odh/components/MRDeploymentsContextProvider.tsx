import React from 'react';
import { useDeploymentsContext } from '~/odh/hooks/useDeploymentsContext';
import { DeploymentsStateContext } from '~/odh/hooks/useDeploymentsState';

interface MRDeploymentsContextProviderProps {
  children: React.ReactNode;
  labelSelectors?: { [key: string]: string };
}

/**
 * Provider component that automatically wraps children with deployments context if available.
 * Uses extensions to provide the deployments provider and hook.
 */
export const MRDeploymentsContextProvider: React.FC<MRDeploymentsContextProviderProps> = ({
  children,
  labelSelectors,
}) => {
  const { DeploymentsProviderComponent, hookNotifyComponent, deploymentsState, isExtensionLoaded } =
    useDeploymentsContext();

  // Create context value for deployments state
  const deploymentsContextValue = React.useMemo(
    () => ({
      deployments: deploymentsState.deployments,
      loaded: deploymentsState.loaded,
      errors: deploymentsState.errors,
      projects: deploymentsState.projects,
      isExtensionLoaded,
    }),
    [deploymentsState, isExtensionLoaded],
  );

  const content = (
    <DeploymentsStateContext.Provider value={deploymentsContextValue}>
      {hookNotifyComponent}
      {children}
    </DeploymentsStateContext.Provider>
  );

  // Wrap with provider if available
  if (DeploymentsProviderComponent) {
    return (
      <DeploymentsProviderComponent labelSelectors={labelSelectors}>
        {content}
      </DeploymentsProviderComponent>
    );
  }

  return content;
};
