import * as React from 'react';
import { useParams } from 'react-router-dom';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import { conditionalArea } from '@odh-dashboard/internal/concepts/areas/AreaComponent';
import { useRegistryFeatureStores, RegistryFeatureStore } from './hooks/useRegistryFeatureStores';
import { FeatureStoreAPIs } from './types/global';
import { ProjectList } from './types/featureStoreProjects';
import useFeatureStoreAPIState, { FeatureStoreAPIState } from './apiHooks/useFeatureStoreAPIState';
import EnsureFeatureStoreAPIAvailability from './EnsureAPIAvailability';
import { DEFAULT_PROJECT_LIST } from './const';
import useFeatureStoreProjectsAPI from './apiHooks/useFeatureStoreProjectsAPI';

type FeatureStoreFetchState = {
  loaded: boolean;
  error: Error | undefined;
};

export type FeatureStoreContextType = {
  // Registry-based discovery
  featureStores: RegistryFeatureStore[];
  activeFeatureStore: RegistryFeatureStore | null;
  loaded: FeatureStoreFetchState['loaded'];
  loadError: FeatureStoreFetchState['error'];
  refresh: () => Promise<void>;
  selectedFeatureStoreName: string | null;
  setCurrentFeatureStore: (featureStoreName?: string) => void;
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

export const FeatureStoreContext = React.createContext<FeatureStoreContextType>({
  // Registry-based discovery defaults
  featureStores: [],
  activeFeatureStore: null,
  loaded: false,
  loadError: new Error('Not in FeatureStore provider'),
  refresh: async () => undefined,
  selectedFeatureStoreName: null,
  setCurrentFeatureStore: () => undefined,

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

type FeatureStoreContextProviderProps = {
  children: React.ReactNode;
};

const FeatureStoreContextProviderComponent: React.FC<FeatureStoreContextProviderProps> = ({
  children,
}) => {
  const {
    featureStores: registryFeatureStores,
    loaded: registryLoaded,
    error: registryError,
    refresh: refreshRegistry,
  } = useRegistryFeatureStores();

  const [selectedFeatureStoreName, setSelectedFeatureStoreName] = React.useState<string | null>(
    null,
  );

  const apiActiveFeatureStore = React.useMemo(() => {
    // Use the selected feature store, or fall back to the first one
    if (selectedFeatureStoreName) {
      return registryFeatureStores.find((fs) => fs.name === selectedFeatureStoreName) || null;
    }
    // NOTE: Currently limited to one FeatureStore. Selecting the first enabled available one.
    return registryFeatureStores.length > 0 ? registryFeatureStores[0] : null;
  }, [registryFeatureStores, selectedFeatureStoreName]);

  // Use backend proxy to access registry services
  const hostPath = apiActiveFeatureStore
    ? `/api/featurestores/${apiActiveFeatureStore.namespace || 'default'}/${
        apiActiveFeatureStore.name
      }`
    : null;

  const [apiState, refreshAPIState] = useFeatureStoreAPIState(hostPath);

  const {
    data: featureStoreProjects,
    loaded: featureStoreProjectsLoaded,
    error: featureStoreProjectsError,
    refresh: refreshFeatureStoreProjects,
  } = useFeatureStoreProjectsAPI(apiState);

  // Force refresh when hostPath changes
  React.useEffect(() => {
    if (hostPath && apiState.apiAvailable) {
      refreshFeatureStoreProjects();
    }
  }, [hostPath, apiState.apiAvailable, refreshFeatureStoreProjects]);

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

  const setCurrentFeatureStore = React.useCallback(
    (featureStoreName?: string) => {
      setSelectedFeatureStoreName(featureStoreName || null);
    },
    [setSelectedFeatureStoreName],
  );

  const filteredFeatureStores = registryFeatureStores;

  const activeFeatureStore = React.useMemo(() => {
    //INFO: For GA we are only allowing one FeatureStore and hence we are picking the first one
    return filteredFeatureStores.length > 0 ? filteredFeatureStores[0] : null;
  }, [filteredFeatureStores]);

  const refreshFeatureStores = React.useCallback(async () => {
    await refreshRegistry();
  }, [refreshRegistry]);

  const contextValue = React.useMemo(
    () => ({
      // Registry-based discovery
      featureStores: filteredFeatureStores,
      activeFeatureStore,
      loaded: registryLoaded && featureStoreProjectsLoaded,
      loadError: registryError || featureStoreProjectsError,
      refresh: refreshFeatureStores,
      selectedFeatureStoreName,
      setCurrentFeatureStore,
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
      filteredFeatureStores,
      activeFeatureStore,
      registryLoaded,
      registryError,
      refreshFeatureStores,
      selectedFeatureStoreName,
      setCurrentFeatureStore,
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
};

export const FeatureStoreContextProvider = conditionalArea<FeatureStoreContextProviderProps>(
  SupportedArea.FEATURE_STORE,
  true,
)(FeatureStoreContextProviderComponent);

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

export const useFeatureStoreSelection = (): {
  selectedFeatureStoreName: string | null;
  setCurrentFeatureStore: (featureStoreName?: string) => void;
} => {
  const { selectedFeatureStoreName, setCurrentFeatureStore } =
    React.useContext(FeatureStoreContext);
  return { selectedFeatureStoreName, setCurrentFeatureStore };
};
