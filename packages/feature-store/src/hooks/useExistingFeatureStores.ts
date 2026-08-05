import React from 'react';
import { ProjectKind } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { FeatureStoreKind } from '../k8sTypes';
import { listFeatureStores } from '../api/featureStores';
import {
  FEAST_NAMESPACE_LABEL_KEY,
  FEAST_NAMESPACE_LABEL_VALUE,
  FEATURE_STORE_UI_LABEL_KEY,
  FEATURE_STORE_UI_LABEL_VALUE,
} from '../const';

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

    const fetchAll = async () => {
      try {
        const feastProjects = projects.filter(
          (p: ProjectKind) =>
            p.metadata.labels?.[FEAST_NAMESPACE_LABEL_KEY] === FEAST_NAMESPACE_LABEL_VALUE,
        );
        const namespaces = feastProjects.map((p: ProjectKind) => p.metadata.name);
        const emptyList: FeatureStoreKind[] = [];
        const failures: string[] = [];
        const results = await Promise.all(
          namespaces.map((ns) =>
            listFeatureStores(ns).catch((e: unknown) => {
              const isRbacDenied =
                e != null &&
                typeof e === 'object' &&
                'code' in e &&
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                (e as { code: number }).code === 403;
              if (!isRbacDenied) {
                failures.push(ns);
              }
              return emptyList;
            }),
          ),
        );

        if (!cancelled) {
          setFeatureStores(results.flat());
          if (failures.length > 0) {
            setError(
              new Error(`Failed to list FeatureStores in namespace(s): ${failures.join(', ')}`),
            );
          }
          setLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoaded(true);
        }
      }
    };

    fetchAll();
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
      ) || featureStores.toSorted((a, b) => a.metadata.name.localeCompare(b.metadata.name))[0],
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
