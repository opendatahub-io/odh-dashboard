import React from 'react';
import { useParams } from 'react-router-dom';
import { FeatureStoreAPIs } from '#~/pages/featureStore/types.ts';
import { SupportedArea } from '#~/concepts/areas/types.ts';
import { conditionalArea } from '#~/concepts/areas';
import { useFeatureStoreCR } from '#~/pages/featureStore/apiHooks/useFeatureStoreCR.tsx';
import useFeatureStoreAPIState, {
  FeatureStoreAPIState,
} from '#~/pages/featureStore/apiHooks/useFeatureStoreAPIState.tsx';

export type FeatureStoreContextType = {
  apiState: FeatureStoreAPIState;
  refreshAPIState: () => void;
  currentProject: string | undefined;
  setCurrentProject: (project?: string) => void;
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
});

export const FeatureStoreContextProvider = conditionalArea<FeatureStoreContextProviderProps>(
  SupportedArea.FEATURE_STORE,
  true,
)(({ children }) => {
  const { featureStoreCR } = useFeatureStoreCR();
  const hostPath = featureStoreCR
    ? `/api/service/featurestore/${featureStoreCR.metadata.namespace}/${featureStoreCR.metadata.name}`
    : null;

  const [apiState, refreshAPIState] = useFeatureStoreAPIState(hostPath);

  const { fsProjectName } = useParams<{ fsProjectName: string }>();
  const [currentProject, setCurrentProject] = React.useState<string | undefined>(fsProjectName);

  React.useEffect(() => {
    setCurrentProject(fsProjectName);
  }, [fsProjectName]);

  return (
    <FeatureStoreContext.Provider
      value={{
        apiState,
        refreshAPIState,
        currentProject,
        setCurrentProject,
      }}
    >
      {children}
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
} => {
  const { currentProject, setCurrentProject } = React.useContext(FeatureStoreContext);

  return {
    currentProject,
    setCurrentProject,
  };
};
