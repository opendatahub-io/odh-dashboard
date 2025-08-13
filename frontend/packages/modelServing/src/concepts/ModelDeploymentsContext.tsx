import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { getProjectServingPlatform, ModelServingPlatform } from './useProjectServingPlatform';
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

type ProjectDeploymentWatcherProps = {
  project: ProjectKind;
  watcher: ModelServingPlatformWatchDeployments;
  onStateChange: (
    projectName: string,
    state: { deployments?: Deployment[]; loaded: boolean; error?: Error },
  ) => void;
  unloadProjectDeployments: (projectName: string) => void;
};

const ProjectDeploymentWatcher: React.FC<ProjectDeploymentWatcherProps> = ({
  project,
  watcher,
  onStateChange,
  unloadProjectDeployments,
}) => {
  const useWatchDeployments = watcher.properties.watch;
  const [deployments, loaded, error] = useWatchDeployments(project);
  const projectName = project.metadata.name;

  React.useEffect(() => {
    onStateChange(projectName, { deployments, loaded, error });
    return () => {
      unloadProjectDeployments(projectName);
    };
  }, [projectName, deployments, loaded, error, onStateChange, unloadProjectDeployments]);

  return null;
};

const EmptyProjectWatcher: React.FC<{
  projectName: string;
  onStateChange: (
    projectName: string,
    state: { deployments?: Deployment[]; loaded: boolean; error?: Error },
  ) => void;
  unloadProjectDeployments: (projectName: string) => void;
}> = ({ projectName, onStateChange, unloadProjectDeployments }) => {
  React.useEffect(() => {
    onStateChange(projectName, { deployments: [], loaded: true, error: undefined });
    return () => {
      unloadProjectDeployments(projectName);
    };
  }, [projectName, onStateChange, unloadProjectDeployments]);

  return null;
};

type ModelDeploymentsProviderProps = {
  projects: ProjectKind[];
  modelServingPlatforms: ModelServingPlatform[];
  children: React.ReactNode;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  projects,
  modelServingPlatforms,
  children,
}) => {
  const [deploymentWatchers, deploymentWatchersLoaded] = useResolvedExtensions(
    isModelServingPlatformWatchDeployments,
  );

  const [projectDeployments, setProjectDeployments] = React.useState<{
    [key: string]: { deployments?: Deployment[]; loaded: boolean; error?: Error };
  }>(Object.fromEntries(projects.map((p) => [p.metadata.name, { loaded: false }])));

  const updateProjectDeployments = React.useCallback(
    (projectName: string, data: { deployments?: Deployment[]; loaded: boolean; error?: Error }) => {
      setProjectDeployments((oldDeployments) => ({ ...oldDeployments, [projectName]: data }));
    },
    [],
  );

  const unloadProjectDeployments = React.useCallback((projectName: string) => {
    setProjectDeployments((oldDeployments) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
      const { [projectName]: _, ...rest } = oldDeployments;
      return rest;
    });
  }, []);

  const contextValue = React.useMemo<ModelDeploymentsContextType>(() => {
    const allDeployments: Deployment[] = [];
    const errors: Error[] = [];

    for (const project of projects) {
      if (project.metadata.name in projectDeployments) {
        const state = projectDeployments[project.metadata.name];
        if (state.deployments) {
          allDeployments.push(...state.deployments);
        }
        if (state.error) {
          errors.push(state.error);
        }
      }
    }

    const allLoaded =
      deploymentWatchersLoaded && Object.values(projectDeployments).every((state) => state.loaded);

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      errors,
      projects,
    };
  }, [projects, projectDeployments, deploymentWatchersLoaded]);

  return (
    <ModelDeploymentsContext.Provider value={contextValue}>
      {
        // the only way to dynamically call hooks (useWatchDeployments) is to render them in dynamic components
        projects.map((project) => {
          const platform = getProjectServingPlatform(project, modelServingPlatforms, true);
          const watcher = deploymentWatchers.find(
            (w) => w.properties.platform === platform?.properties.id,
          );

          if (!platform || !watcher) {
            // If the project doesn't have model serving, this will set the loaded state to true for it
            return (
              <EmptyProjectWatcher
                key={project.metadata.name}
                projectName={project.metadata.name}
                onStateChange={updateProjectDeployments}
                unloadProjectDeployments={unloadProjectDeployments}
              />
            );
          }

          return (
            <ProjectDeploymentWatcher
              key={project.metadata.name}
              project={project}
              watcher={watcher}
              onStateChange={updateProjectDeployments}
              unloadProjectDeployments={unloadProjectDeployments}
            />
          );
        })
      }
      {children}
    </ModelDeploymentsContext.Provider>
  );
};
