import React from 'react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { FeatureStoreKind } from '../k8sTypes';
import { listFeatureStores } from '../api/featureStores';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../const';

type UseExistingFeatureStoresReturn = {
  featureStores: FeatureStoreKind[];
  loaded: boolean;
  error?: Error;
  existingProjectNames: string[];
  existingResourceNames: string[];
  hasUILabeledStore: boolean;
  primaryStore: FeatureStoreKind | undefined;
  refresh: () => void;
};

const useExistingFeatureStores = (): UseExistingFeatureStoresReturn => {
  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const [featureStores, setFeatureStores] = React.useState<FeatureStoreKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!projectsLoaded) {
      return;
    }
    let cancelled = false;
    setLoaded(false);
    setError(undefined);
    const namespaces = projects.map((p: ProjectKind) => p.metadata.name);
    const emptyList: FeatureStoreKind[] = [];
    Promise.all(namespaces.map((ns) => listFeatureStores(ns).catch(() => emptyList)))
      .then((results) => {
        if (!cancelled) {
          setFeatureStores(results.flat());
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projects, projectsLoaded, refreshKey]);

  const existingProjectNames = React.useMemo(
    () => featureStores.map((fs) => fs.spec.feastProject),
    [featureStores],
  );

  const existingResourceNames = React.useMemo(
    () => featureStores.map((fs) => fs.metadata.name),
    [featureStores],
  );

  const hasUILabeledStore = React.useMemo(
    () =>
      featureStores.some(
        (fs) => fs.metadata.labels?.[FEATURE_STORE_UI_LABEL_KEY] === FEATURE_STORE_UI_LABEL_VALUE,
      ),
    [featureStores],
  );

  const primaryStore = React.useMemo(
    () =>
      featureStores.find(
        (fs) => fs.metadata.labels?.[FEATURE_STORE_UI_LABEL_KEY] === FEATURE_STORE_UI_LABEL_VALUE,
      ) || featureStores[0],
    [featureStores],
  );

  return {
    featureStores,
    loaded,
    error,
    existingProjectNames,
    existingResourceNames,
    hasUILabeledStore,
    primaryStore,
    refresh,
  };
};

export default useExistingFeatureStores;
