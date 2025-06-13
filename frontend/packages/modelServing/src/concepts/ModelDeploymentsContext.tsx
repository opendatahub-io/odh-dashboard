import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingPlatform } from './useProjectServingPlatform';
import { Deployment } from '../../extension-points';

type ModelDeploymentsContextType = {
  deployments?: Deployment[];
  loaded: boolean;
  error?: Error;
};

type WatcherProps = {
  platform: ModelServingPlatform;
  project?: ProjectKind;
  onUpdate: (key: string, result: [Deployment[] | undefined, boolean, Error | undefined]) => void;
};

const DeploymentWatcherComponent: React.FC<WatcherProps> = ({ platform, project, onUpdate }) => {
  const watchDeployments = platform.properties.deployments.watch;

  const result = project ? watchDeployments(project) : watchDeployments(undefined);

  const key = project
    ? `${platform.properties.id}-${project.metadata.name}`
    : `${platform.properties.id}-global`;

  React.useEffect(() => {
    onUpdate(key, result);
  }, [key, result, onUpdate]);

  return null;
};

const DeploymentWatcher = React.memo(DeploymentWatcherComponent);

export const ModelDeploymentsContext = React.createContext<ModelDeploymentsContextType>({
  deployments: undefined,
  loaded: false,
  error: undefined,
});

type ModelDeploymentsProviderProps = {
  projects?: ProjectKind | ProjectKind[];
  modelServingPlatform?: ModelServingPlatform | ModelServingPlatform[];
  children: React.ReactNode;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  projects,
  modelServingPlatform,
  children,
}) => {
  const platforms = React.useMemo(
    () =>
      modelServingPlatform
        ? Array.isArray(modelServingPlatform)
          ? modelServingPlatform
          : [modelServingPlatform]
        : [],
    [modelServingPlatform],
  );
  const singleProject = projects && !Array.isArray(projects) ? projects : undefined;

  const watchList = React.useMemo(() => {
    if (singleProject) {
      return platforms.map((platform) => ({
        key: `${platform.properties.id}-${singleProject.metadata.name}`,
        platform,
        project: singleProject,
      }));
    }

    return platforms.map((platform) => ({
      key: `${platform.properties.id}-global`,
      platform,
      project: undefined,
    }));
  }, [platforms, singleProject]);

  const [results, setResults] = React.useState<
    Record<string, [Deployment[] | undefined, boolean, Error | undefined]>
  >({});

  const handleUpdate = React.useCallback(
    (key: string, result: [Deployment[] | undefined, boolean, Error | undefined]) => {
      setResults((prevResults) => {
        if (JSON.stringify(prevResults[key]) === JSON.stringify(result)) {
          return prevResults;
        }
        return { ...prevResults, [key]: result };
      });
    },
    [],
  );

  const contextValue = React.useMemo<ModelDeploymentsContextType>(() => {
    const allResults = Object.values(results);
    const deployments = allResults.flatMap(([d]) => d || []);
    const isLoaded =
      watchList.length === Object.keys(results).length && allResults.every(([, l]) => l);
    const error = allResults.find(([, , e]) => e)?.[2];
    return { deployments, loaded: isLoaded, error };
  }, [results, watchList]);

  return (
    <>
      {watchList.map(({ key, platform, project }) => (
        <DeploymentWatcher
          key={key}
          platform={platform}
          project={project}
          onUpdate={handleUpdate}
        />
      ))}
      <ModelDeploymentsContext.Provider value={contextValue}>
        {children}
      </ModelDeploymentsContext.Provider>
    </>
  );
};
