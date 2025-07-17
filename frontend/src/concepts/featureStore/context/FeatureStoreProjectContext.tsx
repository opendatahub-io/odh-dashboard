import * as React from 'react';
import { FeatureStoreProject } from '#~/concepts/featureStore/types';
import useFeatureStoreEnabled from '#~/concepts/featureStore/useFeatureStoreEnabled';

export interface FeatureStoreContextType {
  featureStoreProjectLoaded: boolean;
  featureStoreProjectLoadError?: Error;
  featureStoreProjects: FeatureStoreProject[];
  selectedFeatureStoreProject: FeatureStoreProject | null;
  updateFeatureStoreProject: (featureStoreProject: FeatureStoreProject | undefined) => void;
  // refresh: () => void;
}

type FeatureStoreProjectContextProviderProps = {
  children: React.ReactNode;
};

export const FeatureStoreProjectContext = React.createContext<FeatureStoreContextType>({
  featureStoreProjectLoaded: false,
  featureStoreProjectLoadError: undefined,
  featureStoreProjects: [],
  selectedFeatureStoreProject: null,
  updateFeatureStoreProject: () => undefined,
  // refresh: () => undefined,
});

export const FeatureStoreProjectContextProvider: React.FC<
  FeatureStoreProjectContextProviderProps
> = ({ children, ...props }) => {
  if (useFeatureStoreEnabled()) {
    return (
      <EnabledFeatureStoreProjectContextProvider {...props}>
        {children}
      </EnabledFeatureStoreProjectContextProvider>
    );
  }
  return children;
};

const EnabledFeatureStoreProjectContextProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [featureStoreProject, setFeatureStoreProject] = React.useState<FeatureStoreProject | null>(
    null,
  );

  const updateFeatureStoreProject = React.useCallback(
    (fSProject: FeatureStoreProject | undefined) => {
      setFeatureStoreProject(fSProject || null);
    },
    [],
  );

  // Replace this with data from API
  const featureStoreProjects: FeatureStoreProject[] = React.useMemo(
    () => [
      {
        spec: {
          name: 'project1',
        },
        meta: {
          createdTimestamp: '',
          lastUpdatedTimestamp: '',
        },
      },
      {
        spec: {
          name: 'project2',
        },
        meta: {
          createdTimestamp: '',
          lastUpdatedTimestamp: '',
        },
      },
    ],
    [],
  );

  const isLoaded = true;
  const error = undefined;

  // uncomment Refresh to contextValue once you fetch projects fro
  const contextValue = React.useMemo(
    () => ({
      featureStoreProjectLoaded: isLoaded,
      featureStoreProjectLoadError: error,
      featureStoreProjects,
      selectedFeatureStoreProject: featureStoreProject,
      updateFeatureStoreProject,
      // refresh,
    }),
    [
      isLoaded,
      error,
      featureStoreProjects,
      updateFeatureStoreProject,
      // refresh,
      featureStoreProject,
    ],
  );

  return (
    <FeatureStoreProjectContext.Provider value={contextValue}>
      {children}
    </FeatureStoreProjectContext.Provider>
  );
};
