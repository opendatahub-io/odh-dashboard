import React from 'react';
import { FeatureStoreKind } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStoreCRContext } from '../contexts/FeatureStoreContext';

type UseFeatureStoreCRResult = {
  data: FeatureStoreKind | null;
  loaded: boolean;
  error: Error | undefined;
};

export const useFeatureStoreCR = (): UseFeatureStoreCRResult => {
  const { activeFeatureStore, loaded, loadError } = React.useContext(FeatureStoreCRContext);

  return React.useMemo(
    () => ({
      data: activeFeatureStore,
      loaded,
      error: loadError,
    }),
    [activeFeatureStore, loaded, loadError],
  );
};
