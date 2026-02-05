import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';
import { TempDevFeatureFlagsContext, TempDevFeatureFlagsOverrides } from '~/odh/extension-points';

// The session storage key used by ODH dev feature flags
const ODH_FEATURE_FLAGS_SESSION_KEY = 'odh-feature-flags';

// The temp dev feature flag keys that can be overridden by ODH dev flags
const TEMP_DEV_FEATURE_KEYS = [
  'tempDevCatalogHuggingFaceApiKeyFeatureAvailable',
  'tempDevRegistryStorageFeatureAvailable',
] as const;

/**
 * ODH-specific provider component that reads dev feature flags from session storage
 * and provides them to the TempDevFeatureFlagsContext for use by useTempDevFeatureAvailable.
 *
 * ODH stores its dev feature flags in session storage with key 'odh-feature-flags'.
 * This component reads from that storage and extracts the relevant temp dev feature flags,
 * allowing the ODH dev flags modal to override upstream temp dev features.
 */
const OdhDevFeatureFlagOverridesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read ODH dev feature flags from session storage
  const [odhDevFlags] = useBrowserStorage<Record<string, boolean> | null>(
    ODH_FEATURE_FLAGS_SESSION_KEY,
    null,
    true, // isSessionStorage
  );

  const overrides = React.useMemo<TempDevFeatureFlagsOverrides>(() => {
    if (!odhDevFlags) {
      return null;
    }

    const result: Record<string, boolean> = {};
    let hasOverrides = false;

    TEMP_DEV_FEATURE_KEYS.forEach((key) => {
      if (key in odhDevFlags && typeof odhDevFlags[key] === 'boolean') {
        result[key] = odhDevFlags[key];
        hasOverrides = true;
      }
    });

    return hasOverrides ? result : null;
  }, [odhDevFlags]);

  return (
    <TempDevFeatureFlagsContext.Provider value={overrides}>
      {children}
    </TempDevFeatureFlagsContext.Provider>
  );
};

export default OdhDevFeatureFlagOverridesProvider;
