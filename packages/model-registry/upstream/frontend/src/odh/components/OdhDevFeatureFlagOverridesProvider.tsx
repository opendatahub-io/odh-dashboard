import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';
import { TempDevFeatureFlagsContext, TempDevFeatureFlagsOverrides } from '~/odh/extension-points';

// The session storage key used by ODH dev feature flags
const ODH_FEATURE_FLAGS_SESSION_KEY = 'odh-feature-flags';

// Mapping from ODH session storage keys (display names) to upstream technical keys
const DEV_FLAG_MAPPINGS: Record<string, string> = {
  'KF MR Upstream: Catalog HuggingFace API Key': 'tempDevCatalogHuggingFaceApiKeyFeatureAvailable',
  'KF MR Upstream: Registry OCI Storage': 'tempDevRegistryStorageFeatureAvailable',
};

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

    Object.entries(DEV_FLAG_MAPPINGS).forEach(([displayName, technicalKey]) => {
      if (displayName in odhDevFlags && typeof odhDevFlags[displayName] === 'boolean') {
        result[technicalKey] = odhDevFlags[displayName];
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
