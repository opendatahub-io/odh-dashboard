import React from 'react';
import { FeatureStoreContext } from '../FeatureStoreContext';
import { RegistryFeatureStore } from '../hooks/useRegistryFeatureStores';

export type UseFeatureStoreCRResult = {
  data: RegistryFeatureStore | null;
  loaded: boolean;
  error: Error | undefined;
};

export const useFeatureStoreCR = (): UseFeatureStoreCRResult => {
  const { activeFeatureStore, loaded, loadError } = React.useContext(FeatureStoreContext);

  return React.useMemo(
    () => ({
      data: activeFeatureStore,
      loaded,
      error: loadError,
    }),
    [activeFeatureStore, loaded, loadError],
  );
};
