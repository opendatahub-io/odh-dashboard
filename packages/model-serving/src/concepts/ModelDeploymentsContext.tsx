import React from 'react';
import type { HardwareProfileKind, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useWatchHardwareProfiles } from '@odh-dashboard/internal/utilities/useWatchHardwareProfiles';
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
  projectHardwareProfiles?: HardwareProfileKind[];
  projectHardwareProfilesLoaded: boolean;
  projectHardwareProfilesError?: Error;
};

export const ModelDeploymentsContext = React.createContext<ModelDeploymentsContextType>({
  deployments: undefined,
  loaded: false,
  errors: undefined,
  projects: undefined,
  projectHardwareProfiles: undefined,
  projectHardwareProfilesLoaded: false,
  projectHardwareProfilesError: undefined,
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

const HardwareProfileWatcher: React.FC<{
  namespace: string;
  onStateChange: (
    namespace: string,
    state: { profiles?: HardwareProfileKind[]; loaded: boolean; error?: Error },
  ) => void;
  unloadProfiles: (namespace: string) => void;
}> = ({ namespace, onStateChange, unloadProfiles }) => {
  const [profiles, loaded, error] = useWatchHardwareProfiles(namespace);

  React.useEffect(() => {
    onStateChange(namespace, { profiles, loaded, error });
    return () => {
      unloadProfiles(namespace);
    };
  }, [namespace, profiles, loaded, error, onStateChange, unloadProfiles]);

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

  const [projectProfiles, setProjectProfiles] = React.useState<{
    [namespace: string]:
      | { profiles?: HardwareProfileKind[]; loaded: boolean; error?: Error }
      | undefined;
  }>({});

  const updateProjectProfiles = React.useCallback(
    (
      namespace: string,
      data: { profiles?: HardwareProfileKind[]; loaded: boolean; error?: Error },
    ) => {
      setProjectProfiles((oldProfiles) => ({ ...oldProfiles, [namespace]: data }));
    },
    [],
  );

  const unloadProjectProfiles = React.useCallback((namespace: string) => {
    setProjectProfiles((oldProfiles) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-unused-vars
      const { [namespace]: _, ...rest } = oldProfiles;
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
      (projects.length === 0 ||
        availablePlatforms.every((platformId) => {
          const platformKeys = Object.keys(platformDeployments).filter((key) =>
            key.startsWith(`${platformId}-project-`),
          );
          return (
            platformKeys.length > 0 &&
            platformKeys.every((key) => platformDeployments[key].loaded === true)
          );
        }));

    const allProfiles: HardwareProfileKind[] = [];
    let profilesError: Error | undefined;

    for (const project in projectProfiles) {
      const state = projectProfiles[project];
      if (state) {
        if (state.profiles) {
          allProfiles.push(...state.profiles);
        }
        if (state.error) {
          profilesError = profilesError || state.error;
        }
      }
    }

    const projectsWithNamespaces = projects.filter((project) => project.metadata.name);
    const profilesLoaded =
      projectsWithNamespaces.length > 0 &&
      projectsWithNamespaces.every((project) => {
        const namespace = project.metadata.name;
        return projectProfiles[namespace]?.loaded === true;
      });

    return {
      deployments: allLoaded ? allDeployments : undefined,
      loaded: allLoaded,
      errors,
      projects,
      projectHardwareProfiles: profilesLoaded ? allProfiles : undefined,
      projectHardwareProfilesLoaded: profilesLoaded,
      projectHardwareProfilesError: profilesError,
    };
  }, [
    projects,
    platformDeployments,
    deploymentWatchersLoaded,
    availablePlatforms,
    projectProfiles,
  ]);

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
      {projects.map((project) => {
        const namespace = project.metadata.name;
        if (!namespace) {
          return null;
        }
        return (
          <HardwareProfileWatcher
            key={`hwp-${namespace}`}
            namespace={namespace}
            onStateChange={updateProjectProfiles}
            unloadProfiles={unloadProjectProfiles}
          />
        );
      })}
      {children}
    </ModelDeploymentsContext.Provider>
  );
};
