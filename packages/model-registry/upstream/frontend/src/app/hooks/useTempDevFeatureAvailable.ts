/**
 * Temporary development hook for toggling incomplete features in the browser.
 *
 * This hook provides a browser storage-backed feature flag that can be toggled
 * via the browser console using:
 *     window.setTempFeatureFlagAvailable(true/false);
 * The state persists across page reloads using browser storage.
 *
 * Each TempDevFeature and corresponding window.set* here should be removed once that feature is ready.
 * This entire hook should be removed once all these features are ready.
 *
 * @returns {boolean} Whether the feature is enabled
 */

import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';
import { useOdhDevFeatureFlagOverrides } from '~/odh/extension-points';

declare global {
  interface Window {
    setTempFeatureFlagAvailable?: (enabled: boolean) => void;
  }
}

export enum TempDevFeature {
  CatalogHuggingFaceApiKey = 'tempDevCatalogHuggingFaceApiKeyFeatureAvailable',
}

export const useTempDevFeatureAvailable = (feature: TempDevFeature): boolean => {
  const [localStorageValue, setIsAvailable] = useBrowserStorage(feature, false);

  // Check for ODH dev feature flag overrides from context
  const overrides = useOdhDevFeatureFlagOverrides();
  const contextOverride = overrides?.[feature];

  React.useEffect(() => {
    // Placeholder console API for the temporary feature using this hook.
    window.setTempFeatureFlagAvailable = setIsAvailable;
  }, [feature, setIsAvailable]);

  // Context override takes precedence, then localStorage
  return contextOverride ?? localStorageValue;
};
