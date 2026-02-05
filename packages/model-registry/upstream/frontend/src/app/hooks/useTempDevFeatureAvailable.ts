/**
 * Temporary development hook for toggling incomplete features in the browser.
 *
 * This hook provides a browser storage-backed feature flag that can be toggled
 * via the browser console using:
 *     window.setTempDevCatalogHuggingFaceApiKeyFeatureAvailable(true/false);
 *     window.setTempDevRegistryStorageFeatureAvailable(true/false);
 * The state persists across page reloads using browser storage.
 *
 * Each TempDevFeature and corresponding window.set* here should be removed once that feature is ready.
 * This entire hook should be removed once all these features are ready.
 *
 * @returns {boolean} Whether the feature is enabled
 */

import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';
import { useTempDevFeatureFlagsOverrides } from '~/odh/extension-points';

declare global {
  interface Window {
    setTempDevCatalogHuggingFaceApiKeyFeatureAvailable?: (enabled: boolean) => void;
    setTempDevRegistryStorageFeatureAvailable?: (enabled: boolean) => void;
  }
}

export enum TempDevFeature {
  CatalogHuggingFaceApiKey = 'tempDevCatalogHuggingFaceApiKeyFeatureAvailable',
  RegistryStorage = 'tempDevRegistryStorageFeatureAvailable',
}

export const useTempDevFeatureAvailable = (feature: TempDevFeature): boolean => {
  const [localStorageValue, setIsAvailable] = useBrowserStorage(feature, false);

  // Check for ODH dev feature flag overrides from context
  const overrides = useTempDevFeatureFlagsOverrides();
  const contextOverride = overrides?.[feature];

  // Expose setter to window for easy toggling via browser console
  React.useEffect(() => {
    switch (feature) {
      case TempDevFeature.CatalogHuggingFaceApiKey:
        window.setTempDevCatalogHuggingFaceApiKeyFeatureAvailable = setIsAvailable;
        break;
      case TempDevFeature.RegistryStorage:
        window.setTempDevRegistryStorageFeatureAvailable = setIsAvailable;
        break;
    }
  }, [feature, setIsAvailable]);

  // Context override takes precedence, then localStorage
  return contextOverride ?? localStorageValue;
};
