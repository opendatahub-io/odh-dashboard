import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { EitherNotBoth } from '@odh-dashboard/internal/typeHelpers.js';
// import { KSERVE_ID } from 'const';
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
  watchParams: EitherNotBoth<
    {
      project: ProjectKind;
    },
    {
      registeredModelId: string;
      modelVersionId: string;
      mrName?: string;
    }
  >;
  watcher: ModelServingPlatformWatchDeployments;
  onStateChange: (
    state: { deployments?: Deployment[]; loaded: boolean; error?: Error },
    projectName?: string,
  ) => void;
  unloadProjectDeployments: (projectName?: string) => void;
};

const ProjectDeploymentWatcher: React.FC<ProjectDeploymentWatcherProps> = ({
  watchParams,
  watcher,
  onStateChange,
  unloadProjectDeployments,
}) => {
  const useWatchDeployments = watcher.properties.watch;
  const [deployments, loaded, error] = useWatchDeployments(watchParams);
  const projectName = watchParams.project?.metadata.name;

  React.useEffect(() => {
    onStateChange({ deployments, loaded, error }, projectName);
    return () => {
      unloadProjectDeployments(projectName);
    };
  }, [projectName, deployments, loaded, error, onStateChange, unloadProjectDeployments]);

  return null;
};

type ModelDeploymentsProviderProps = {
  watchParams: EitherNotBoth<
    {
      projects: ProjectKind[];
    },
    {
      registeredModelId: string;
      modelVersionId: string;
      mrName?: string;
    }
  >;
  modelServingPlatforms: ModelServingPlatform[];
  deploymentWatchers: ModelServingPlatformWatchDeployments[];
  children: React.ReactNode;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  watchParams,
  modelServingPlatforms,
  deploymentWatchers,
  children,
}) => {
  const [projectDeployments, setProjectDeployments] = React.useState<
    | {
        [key: string]: { deployments?: Deployment[]; loaded: boolean; error?: Error };
      }
    | { deployments?: Deployment[]; loaded: boolean; error?: Error }
  >({});

  const updateProjectDeployments = React.useCallback(
    (
      data: { deployments?: Deployment[]; loaded: boolean; error?: Error },
      projectName?: string,
    ) => {
      setProjectDeployments((oldDeployments) => {
        if (projectName) {
          return { ...oldDeployments, [projectName]: data };
        }
        return data;
      });
    },
    [],
  );

  const isMultipleProjectDeployments = (
    obj: unknown,
  ): obj is {
    [key: string]: { deployments?: Deployment[]; loaded: boolean; error?: Error };
  } =>
    typeof obj === 'object' &&
    obj !== null &&
    Object.values(obj).every((value) => 'deployments' in value);

  const isNoProjectDeployment = (
    obj: unknown,
  ): obj is { deployments?: Deployment[]; loaded: boolean; error?: Error } =>
    typeof obj === 'object' && obj !== null && 'deployments' in obj;

  const unloadProjectDeployments = React.useCallback((projectName?: string) => {
    setProjectDeployments((oldDeployments) => {
      if (projectName && isMultipleProjectDeployments(oldDeployments)) {
        // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
        const { [projectName]: _, ...rest } = oldDeployments;
        return rest;
      }
      return {};
    });
  }, []);

  const contextValue = React.useMemo<ModelDeploymentsContextType>(() => {
    const allDeployments: Deployment[] = [];
    const errors: Error[] = [];

    if (watchParams.projects) {
      for (const project of watchParams.projects) {
        if (project.metadata.name in projectDeployments) {
          if (isMultipleProjectDeployments(projectDeployments)) {
            const state = projectDeployments[project.metadata.name];
            if (state.deployments) {
              allDeployments.push(...state.deployments);
            }
            if (state.error) {
              errors.push(state.error);
            }
          }
        }
      }
    } else if (isNoProjectDeployment(projectDeployments)) {
      const state = projectDeployments;
      if (state.deployments) {
        allDeployments.push(...state.deployments);
      }
      if (state.error) {
        errors.push(state.error);
      }
    }

    const allLoaded = Object.values(projectDeployments).every((state) => state.loaded);

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      errors,
      projects: watchParams.projects ?? [],
    };
  }, [watchParams.projects, projectDeployments]);

  const renderKServeDeploymentWatcher = () => {
    const platform = modelServingPlatforms.find((m) => m.properties.id === 'kserve');
    const watcher = deploymentWatchers.find(
      (w) => w.properties.platform === platform?.properties.id,
    );
    if (!platform || !watcher || watchParams.projects) {
      return null;
    }

    return (
      <ProjectDeploymentWatcher
        watchParams={watchParams}
        watcher={watcher}
        onStateChange={updateProjectDeployments}
        unloadProjectDeployments={unloadProjectDeployments}
      />
    );
  };

  return (
    <ModelDeploymentsContext.Provider value={contextValue}>
      {
        // the only way to dynamically call hooks (useWatchDeployments) is to render them in dynamic components
        watchParams.projects
          ? watchParams.projects.map((project) => {
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
                  watchParams={{ ...watchParams, project }}
                  watcher={watcher}
                  onStateChange={updateProjectDeployments}
                  unloadProjectDeployments={unloadProjectDeployments}
                />
              );
            })
          : renderKServeDeploymentWatcher()
      }
      {children}
    </ModelDeploymentsContext.Provider>
  );
};
