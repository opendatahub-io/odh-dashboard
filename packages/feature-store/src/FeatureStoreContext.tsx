import React from 'react';
import { useParams } from 'react-router-dom';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import { conditionalArea } from '@odh-dashboard/internal/concepts/areas/AreaComponent';
import { FeatureStoreAPIs } from './types/global';
import { ProjectList } from './types/featureStoreProjects';
import { useFeatureStoreCR } from './apiHooks/useFeatureStoreCR';
import useFeatureStoreAPIState, { FeatureStoreAPIState } from './apiHooks/useFeatureStoreAPIState';
import EnsureFeatureStoreAPIAvailability from './EnsureAPIAvailability';
import { DEFAULT_PROJECT_LIST } from './const';
import useFeatureStoreProjectsAPI from './apiHooks/useFeatureStoreProjectsAPI';

export type FeatureStoreContextType = {
  apiState: FeatureStoreAPIState;
  refreshAPIState: () => void;
  currentProject: string | undefined;
  setCurrentProject: (project?: string) => void;
  preferredFeatureStoreProject: string | null;
  updatePreferredFeatureStoreProject: (project: string | null) => void;
  featureStoreProjects: ProjectList;
  featureStoreProjectsLoaded: boolean;
  featureStoreProjectsError: Error | undefined;
  refreshFeatureStoreProjects: () => void;
};

type FeatureStoreContextProviderProps = {
  children: React.ReactNode;
};

export const FeatureStoreContext = React.createContext<FeatureStoreContextType>({
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as FeatureStoreAPIs },
  refreshAPIState: () => undefined,
  currentProject: undefined,
  setCurrentProject: () => undefined,
  preferredFeatureStoreProject: null,
  updatePreferredFeatureStoreProject: () => undefined,
  featureStoreProjects: DEFAULT_PROJECT_LIST,
  featureStoreProjectsLoaded: false,
  featureStoreProjectsError: undefined,
  refreshFeatureStoreProjects: () => undefined,
});

export const FeatureStoreContextProvider = conditionalArea<FeatureStoreContextProviderProps>(
  SupportedArea.FEATURE_STORE,
  true,
)(({ children }) => {
  const { data: featureStoreCR } = useFeatureStoreCR();
  const hostPath = featureStoreCR
    ? `/api/service/featurestore/${featureStoreCR.metadata.namespace}/${featureStoreCR.metadata.name}`
    : null;

  const [apiState, refreshAPIState] = useFeatureStoreAPIState(hostPath);

  const {
    data: featureStoreProjects,
    loaded: featureStoreProjectsLoaded,
    error: featureStoreProjectsError,
    refresh: refreshFeatureStoreProjects,
  } = useFeatureStoreProjectsAPI(apiState);

  const { fsProjectName } = useParams<{ fsProjectName: string }>();
  const [preferredFeatureStoreProject, setPreferredFeatureStoreProject] = React.useState<
    string | null
  >(null);

  const currentProject = React.useMemo(() => {
    if (fsProjectName !== undefined) {
      return fsProjectName;
    }
    return preferredFeatureStoreProject || undefined;
  }, [fsProjectName, preferredFeatureStoreProject]);

  const setCurrentProject = React.useCallback(
    (project?: string) => {
      setPreferredFeatureStoreProject(project || null);
    },
    [setPreferredFeatureStoreProject],
  );

  const contextValue = React.useMemo(
    () => ({
      apiState,
      refreshAPIState,
      currentProject,
      setCurrentProject,
      preferredFeatureStoreProject,
      updatePreferredFeatureStoreProject: setPreferredFeatureStoreProject,
      featureStoreProjects,
      featureStoreProjectsLoaded,
      featureStoreProjectsError,
      refreshFeatureStoreProjects,
    }),
    [
      apiState,
      refreshAPIState,
      currentProject,
      setCurrentProject,
      preferredFeatureStoreProject,
      setPreferredFeatureStoreProject,
      featureStoreProjects,
      featureStoreProjectsLoaded,
      featureStoreProjectsError,
      refreshFeatureStoreProjects,
    ],
  );

  return (
    <FeatureStoreContext.Provider value={contextValue}>
      <EnsureFeatureStoreAPIAvailability>{children}</EnsureFeatureStoreAPIAvailability>
    </FeatureStoreContext.Provider>
  );
});

type UseFeatureStoreAPI = FeatureStoreAPIState & {
  refreshAllAPI: () => void;
};

export const useFeatureStoreAPI = (): UseFeatureStoreAPI => {
  const { apiState, refreshAPIState: refreshAllAPI } = React.useContext(FeatureStoreContext);

  return {
    refreshAllAPI,
    ...apiState,
  };
};

export const useFeatureStoreProject = (): {
  currentProject?: string;
  setCurrentProject: (project?: string) => void;
  preferredFeatureStoreProject: string | null;
  updatePreferredFeatureStoreProject: (project: string | null) => void;
} => {
  const {
    currentProject,
    setCurrentProject,
    preferredFeatureStoreProject,
    updatePreferredFeatureStoreProject,
  } = React.useContext(FeatureStoreContext);

  return {
    currentProject,
    setCurrentProject,
    preferredFeatureStoreProject,
    updatePreferredFeatureStoreProject,
  };
};
