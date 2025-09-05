import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { FeatureStoreKind, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../const';
import { useFeatureStoreAccessibleProjects } from '../hooks/useFeatureStoreAccessibleProjects';

const labelSelector = `${FEATURE_STORE_UI_LABEL_KEY}=${FEATURE_STORE_UI_LABEL_VALUE}`;

type FeatureStoreFetchState = FetchStateObject<FeatureStoreKind[]>;

type FeatureStoreCRContextType = {
  featureStores: FeatureStoreKind[];
  activeFeatureStore: FeatureStoreKind | null;
  accessibleProjects: ProjectKind[];
  loaded: FeatureStoreFetchState['loaded'];
  loadError: FeatureStoreFetchState['error'];
};

export const FeatureStoreCRContext = React.createContext<FeatureStoreCRContextType>({
  featureStores: [],
  activeFeatureStore: null,
  accessibleProjects: [],
  loaded: false,
  loadError: new Error('Not in FeatureStoreCR provider'),
});

type FeatureStoreCRProviderProps = {
  children: React.ReactNode;
};

const FeatureStoreCRContextProvider: React.FC<FeatureStoreCRProviderProps> = ({ children }) => {
  const { accessibleProjects, projectsLoaded, projectsError } = useFeatureStoreAccessibleProjects();

  const [featureStoreData, setFeatureStoreData] = React.useState<FeatureStoreKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (!projectsLoaded || accessibleProjects.length === 0) {
      setLoaded(projectsLoaded);
      return;
    }

    const loadFeatureStores = async () => {
      try {
        const allFeatureStores: FeatureStoreKind[] = [];

        for (const project of accessibleProjects) {
          try {
            const featureStores = await k8sListResource<FeatureStoreKind>({
              model: FeatureStoreModel,
              queryOptions: {
                ns: project.metadata.name,
                queryParams: { labelSelector },
              },
            });

            if (featureStores.items.length > 0) {
              allFeatureStores.push(...featureStores.items);
            }
          } catch (error) {
            console.warn(`No FeatureStore access in namespace ${project.metadata.name}:`, error);
          }
        }

        setFeatureStoreData(allFeatureStores);
        setLoaded(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error : new Error('Failed to load FeatureStores'));
        setLoaded(true);
      }
    };

    loadFeatureStores();
  }, [projectsLoaded, accessibleProjects, labelSelector]);

  const filteredFeatureStores = React.useMemo(() => {
    if (!projectsLoaded) return [];

    const accessibleNamespaces = new Set(accessibleProjects.map((p) => p.metadata.name));

    return featureStoreData.filter(
      (fs: FeatureStoreKind) =>
        fs.metadata.namespace && accessibleNamespaces.has(fs.metadata.namespace),
    );
  }, [featureStoreData, accessibleProjects, projectsLoaded]);

  const activeFeatureStore = React.useMemo(() => {
    //INFO: For GA we are only allowing one FeatureStore and hence we are picking the first one
    return filteredFeatureStores.length > 0 ? filteredFeatureStores[0] : null;
  }, [filteredFeatureStores]);

  const contextValue = React.useMemo(
    () => ({
      featureStores: filteredFeatureStores,
      activeFeatureStore,
      accessibleProjects,
      loaded: loaded && projectsLoaded,
      loadError: loadError || projectsError,
    }),
    [
      filteredFeatureStores,
      activeFeatureStore,
      accessibleProjects,
      loaded,
      projectsLoaded,
      loadError,
      projectsError,
    ],
  );

  return (
    <FeatureStoreCRContext.Provider value={contextValue}>{children}</FeatureStoreCRContext.Provider>
  );
};

export default FeatureStoreCRContextProvider;
