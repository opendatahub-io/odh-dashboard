import React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useDeploymentAccess } from './useDeploymentAccess';
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
    state: { deployments?: Deployment[]; loaded: boolean; errors?: Error[] },
  ) => void;
  unloadPlatformDeployments: (platformId: string) => void;
  labelSelectors?: { [key: string]: string };
  filterFn?: (model: Deployment['model']) => boolean;
};

const ProjectDeploymentWatcher: React.FC<PlatformDeploymentWatcherProps> = ({
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
  const [deployments, loaded, errors] = useWatchDeployments(project, labelSelectors, filterFn);

  React.useEffect(() => {
    onStateChange(platformId, { deployments, loaded, errors });
    return () => {
      unloadPlatformDeployments(platformId);
    };
  }, [platformId, deployments, loaded, errors, onStateChange, unloadPlatformDeployments]);

  return null;
};

const PlatformDeploymentWatcher: React.FC<PlatformDeploymentWatcherProps> = (props) => {
  const { project, onStateChange, platformId, unloadPlatformDeployments } = props;
  const list = useDeploymentAccess('list', project.metadata.name);
  const watch = useDeploymentAccess('watch', project.metadata.name);
  const allowed = list.allowed && watch.allowed;
  const loaded = list.loaded && watch.loaded;
  const reason = list.reason ?? watch.reason;
  React.useEffect(() => {
    if (allowed) {
      return undefined;
    }
    onStateChange(platformId, {
      loaded,
      errors: loaded && reason ? [new Error(reason)] : undefined,
    });
    return () => unloadPlatformDeployments(platformId);
  }, [allowed, loaded, reason, onStateChange, platformId, unloadPlatformDeployments]);
  return allowed ? <ProjectDeploymentWatcher {...props} /> : null;
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
    [platformId: string]:
      | { deployments?: Deployment[]; loaded: boolean; errors?: Error[] }
      | undefined;
  }>({});

  const updatePlatformDeployments = React.useCallback(
    (
      platformId: string,
      data: { deployments?: Deployment[]; loaded: boolean; errors?: Error[] },
    ) => {
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

    let allLoaded = deploymentWatchersLoaded;
    for (const platform of availablePlatforms) {
      for (const project of projects) {
        const state = platformDeployments[`${platform}/${project.metadata.name}`];
        if (!state?.loaded) {
          allLoaded = false;
        }
        if (state?.deployments) {
          allDeployments.push(...state.deployments);
        }
        if (state?.errors) {
          errors.push(...state.errors);
        }
      }
    }

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      // sort errors so they are always in the same order
      errors: errors.toSorted((a, b) => a.message.localeCompare(b.message)),
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

        return projects.map((project) => (
          <PlatformDeploymentWatcher
            key={`${platformId}-${project.metadata.name}`}
            platformId={`${platformId}/${project.metadata.name}`}
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
