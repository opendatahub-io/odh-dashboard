import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getProjectServingPlatform, ModelServingPlatform } from './useProjectServingPlatform';
import { Deployment, type ModelServingPlatformWatchDeployments } from '../../extension-points';

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

type ModelDeploymentsProviderProps = {
  projects: ProjectKind[];
  modelServingPlatforms: ModelServingPlatform[];
  deploymentWatchers: ModelServingPlatformWatchDeployments[];
  children: React.ReactNode;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  projects,
  modelServingPlatforms,
  deploymentWatchers,
  children,
}) => {
  const [projectDeployments, setProjectDeployments] = React.useState<{
    [key: string]: { deployments?: Deployment[]; loaded: boolean; error?: Error };
  }>({});

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

    const allLoaded = Object.values(projectDeployments).every((state) => state.loaded);

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      errors,
      projects,
    };
  }, [projects, projectDeployments]);

  return (
    <ModelDeploymentsContext.Provider value={contextValue}>
      {
        // the only way to dynamically call hooks (useWatchDeployments) is to render them in dynamic components
        projects.map((project) => {
          const platform = getProjectServingPlatform(project, modelServingPlatforms);
          const watcher = deploymentWatchers.find(
            (w) => w.properties.platform === platform?.properties.id,
          );

          if (!platform || !watcher) {
            return null;
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
