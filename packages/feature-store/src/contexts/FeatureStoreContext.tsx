import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { FeatureStoreKind, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../const';

const labelSelector = `${FEATURE_STORE_UI_LABEL_KEY}=${FEATURE_STORE_UI_LABEL_VALUE}`;

const isFeatureStoreAccessibleProject = (
  projectName: string,
  dashboardNamespace: string,
): boolean =>
  !(
    projectName.startsWith('openshift-') ||
    projectName.startsWith('kube-') ||
    // Note: We DO allow 'default' for FeatureStore access (unlike regular ProjectsContext)
    projectName === 'system' ||
    projectName === 'openshift' ||
    projectName === dashboardNamespace
  );

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
  const [accessibleProjects, setAccessibleProjects] = React.useState<ProjectKind[]>([]);
  const [projectsLoaded, setProjectsLoaded] = React.useState(false);

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();

        const filteredProjects = allProjects.filter((project) =>
          isFeatureStoreAccessibleProject(project.metadata.name, ''),
        );

        setAccessibleProjects(filteredProjects);
        setProjectsLoaded(true);
      } catch (error) {
        console.error('Failed to load projects for FeatureStore context:', error);
        setProjectsLoaded(true);
      }
    };

    loadProjects();
  }, []);

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
    return filteredFeatureStores.length > 0 ? filteredFeatureStores[0] : null;
  }, [filteredFeatureStores]);

  const contextValue = React.useMemo(
    () => ({
      featureStores: filteredFeatureStores,
      activeFeatureStore,
      accessibleProjects,
      loaded: loaded && projectsLoaded,
      loadError,
    }),
    [
      filteredFeatureStores,
      activeFeatureStore,
      accessibleProjects,
      loaded,
      projectsLoaded,
      loadError,
    ],
  );

  return (
    <FeatureStoreCRContext.Provider value={contextValue}>{children}</FeatureStoreCRContext.Provider>
  );
};

export default FeatureStoreCRContextProvider;
