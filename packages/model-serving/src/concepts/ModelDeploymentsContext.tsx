import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  Deployment,
  isModelServingPlatformWatchDeployments,
  type ModelServingPlatformWatchDeployments,
} from '../../extension-points';

type ModelDeploymentsContextType = {
  deployments?: Deployment[];
  loaded: boolean;
  errors?: Error[];
  projects?: ProjectKind[];
};

export const ModelDeploymentsContext = React.createContext<ModelDeploymentsContextType>({
  deployments: undefined,
  loaded: false,
  errors: undefined,
  projects: undefined,
});

type PlatformDeploymentWatcherProps = {
  platformId: string;
  watcher: ModelServingPlatformWatchDeployments;
  projects: ProjectKind[];
  onStateChange: (
    platformId: string,
    state: { deployments?: Deployment[]; loaded: boolean; error?: Error },
  ) => void;
  unloadPlatformDeployments: (platformId: string) => void;
  labelSelectors?: { [key: string]: string };
  mrName?: string;
};

const PlatformDeploymentWatcher: React.FC<PlatformDeploymentWatcherProps> = ({
  platformId,
  watcher,
  projects,
  labelSelectors,
  onStateChange,
  unloadPlatformDeployments,
  mrName,
}) => {
  const useWatchDeployments = watcher.properties.watch;

  // If there's only 1 project, scope the call to that project, otherwise call without project scoping
  const projectToScope = projects.length === 1 ? projects[0] : undefined;
  const [allDeployments, loaded, error] = useWatchDeployments(
    projectToScope,
    labelSelectors,
    mrName,
  );

  // Filter deployments to only include those from the specified projects
  const filteredDeployments = React.useMemo(() => {
    if (!allDeployments || projects.length === 1) {
      return allDeployments;
    }

    const projectNames = new Set(projects.map((p) => p.metadata.name));
    return allDeployments.filter((deployment) => {
      // Check if deployment belongs to one of our projects
      const deploymentNamespace = deployment.model.metadata.namespace;
      return deploymentNamespace && projectNames.has(deploymentNamespace);
    });
  }, [allDeployments, projects]);

  React.useEffect(() => {
    onStateChange(platformId, { deployments: filteredDeployments, loaded, error });
    return () => {
      unloadPlatformDeployments(platformId);
    };
  }, [platformId, filteredDeployments, loaded, error, onStateChange, unloadPlatformDeployments]);

  return null;
};

type ModelDeploymentsProviderProps = {
  projects: ProjectKind[];
  labelSelectors?: { [key: string]: string };
  children: React.ReactNode;
  mrName?: string;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  projects,
  labelSelectors,
  children,
  mrName,
}) => {
  const [deploymentWatchers, deploymentWatchersLoaded] = useResolvedExtensions(
    isModelServingPlatformWatchDeployments,
  );

  // Get all available platforms from the extensions
  const availablePlatforms = React.useMemo(
    () => deploymentWatchers.map((watcher) => watcher.properties.platform),
    [deploymentWatchers],
  );

  const [platformDeployments, setPlatformDeployments] = React.useState<{
    [platformId: string]: { deployments?: Deployment[]; loaded: boolean; error?: Error };
  }>(Object.fromEntries(availablePlatforms.map((platformId) => [platformId, { loaded: false }])));

  const updatePlatformDeployments = React.useCallback(
    (platformId: string, data: { deployments?: Deployment[]; loaded: boolean; error?: Error }) => {
      setPlatformDeployments((oldDeployments) => ({ ...oldDeployments, [platformId]: data }));
    },
    [],
  );

  const unloadPlatformDeployments = React.useCallback((platformId: string) => {
    setPlatformDeployments((oldDeployments) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
      const { [platformId]: _, ...rest } = oldDeployments;
      return rest;
    });
  }, []);

  const contextValue = React.useMemo<ModelDeploymentsContextType>(() => {
    const allDeployments: Deployment[] = [];
    const errors: Error[] = [];

    for (const platformId of availablePlatforms) {
      if (platformId in platformDeployments) {
        const state = platformDeployments[platformId];
        if (state.deployments) {
          allDeployments.push(...state.deployments);
        }
        if (state.error) {
          errors.push(state.error);
        }
      }
    }

    const allLoaded =
      deploymentWatchersLoaded &&
      availablePlatforms.every(
        (id) => id in platformDeployments && platformDeployments[id].loaded === true,
      );

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      errors,
      projects,
    };
  }, [projects, platformDeployments, deploymentWatchersLoaded, availablePlatforms]);

  return (
    <ModelDeploymentsContext.Provider value={contextValue}>
      {
        // the only way to dynamically call hooks (useWatchDeployments) is to render them in dynamic components
        deploymentWatchers.map((watcher) => {
          const platformId = watcher.properties.platform;

          if (!deploymentWatchersLoaded) {
            return null;
          }

          return (
            <PlatformDeploymentWatcher
              key={platformId}
              platformId={platformId}
              watcher={watcher}
              projects={projects}
              labelSelectors={labelSelectors}
              onStateChange={updatePlatformDeployments}
              unloadPlatformDeployments={unloadPlatformDeployments}
              mrName={mrName}
            />
          );
        })
      }
      {children}
    </ModelDeploymentsContext.Provider>
  );
};
