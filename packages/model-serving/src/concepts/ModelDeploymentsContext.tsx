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
  project: ProjectKind;
  onStateChange: (
    platformId: string,
    state: { deployments?: Deployment[]; loaded: boolean; error?: Error },
  ) => void;
  unloadPlatformDeployments: (platformId: string) => void;
  labelSelectors?: { [key: string]: string };
  filterFn?: (model: Deployment['model']) => boolean;
};

const PlatformDeploymentWatcher: React.FC<PlatformDeploymentWatcherProps> = ({
  platformId,
  watcher,
  project,
  labelSelectors,
  onStateChange,
  unloadPlatformDeployments,
  filterFn,
}) => {
  const useWatchDeployments = watcher.properties.watch;

  // Scope the call to the single project
  const [deployments, loaded, error] = useWatchDeployments(project, labelSelectors, filterFn);

  React.useEffect(() => {
    onStateChange(platformId, { deployments, loaded, error });
    return () => {
      unloadPlatformDeployments(platformId);
    };
  }, [platformId, deployments, loaded, error, onStateChange, unloadPlatformDeployments]);

  return null;
};

type ModelDeploymentsProviderProps = {
  projects: ProjectKind[];
  labelSelectors?: { [key: string]: string };
  children: React.ReactNode;
  filterFn?: (model: Deployment['model']) => boolean;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  projects,
  labelSelectors,
  children,
  filterFn,
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

    for (const key in platformDeployments) {
      const state = platformDeployments[key];
      if (state.deployments) {
        allDeployments.push(...state.deployments);
      }
      if (state.error) {
        errors.push(state.error);
      }
    }

    const allLoaded =
      deploymentWatchersLoaded &&
      availablePlatforms.every((platformId) => {
        const platformKeys = Object.keys(platformDeployments).filter((key) =>
          key.startsWith(`${platformId}-project-`),
        );
        return (
          platformKeys.length > 0 &&
          platformKeys.every((key) => platformDeployments[key].loaded === true)
        );
      });

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      errors,
      projects,
    };
  }, [projects, platformDeployments, deploymentWatchersLoaded, availablePlatforms]);

  return (
    <ModelDeploymentsContext.Provider value={contextValue}>
      {deploymentWatchers.map((watcher) => {
        const platformId = watcher.properties.platform;

        if (!deploymentWatchersLoaded) {
          return null;
        }

        return projects.map((project, index) => (
          <PlatformDeploymentWatcher
            key={`${platformId}-${project.metadata.name}`}
            platformId={`${platformId}-project-${index}`}
            watcher={watcher}
            project={project}
            labelSelectors={labelSelectors}
            onStateChange={updatePlatformDeployments}
            unloadPlatformDeployments={unloadPlatformDeployments}
            filterFn={filterFn}
          />
        ));
      })}
      {children}
    </ModelDeploymentsContext.Provider>
  );
};
