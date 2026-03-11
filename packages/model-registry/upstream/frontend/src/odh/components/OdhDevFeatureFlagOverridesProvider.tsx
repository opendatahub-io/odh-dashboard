import * as React from 'react';
import { OdhDevFeatureFlagOverridesContext, OdhDevFeatureFlagOverrides } from '~/odh/extension-points';

// The session storage key used by ODH dev feature flags
const ODH_FEATURE_FLAGS_SESSION_KEY = 'odh-feature-flags';

// Mapping from ODH session storage keys (display names) to upstream technical keys
const DEV_FLAG_MAPPINGS: Record<string, string> = {
  'KF MR Upstream: Catalog HuggingFace API Key': 'tempDevCatalogHuggingFaceApiKeyFeatureAvailable',
  registryOciStorage: 'tempDevRegistryStorageFeatureAvailable',
};

type OdhDevFeatureFlagOverridesProviderProps = {
  children: React.ReactNode;
  /** CRD-based feature flag overrides from the ODH dashboard config (odhdashboardconfig). */
  crdOverrides?: Partial<Record<string, boolean>> | null;
};

/**
 * Read and parse ODH dev flags from session storage.
 */
const readOdhDevFlags = (): Record<string, boolean> | null => {
  try {
    const stored = sessionStorage.getItem(ODH_FEATURE_FLAGS_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * ODH-specific provider component that provides feature flag overrides to the
 * OdhDevFeatureFlagOverridesContext for use by useTempDevFeatureAvailable.
 *
 * Supports two sources of overrides with the following priority (highest to lowest):
 * 1. Dev flag overrides from session storage (for per-session testing/debugging via the dev flags modal)
 * 2. CRD-based overrides from the ODH dashboard config (for cluster-wide production control)
 * 3. localStorage fallback (handled downstream by useTempDevFeatureAvailable)
 *
 * Listens for 'odh-dev-flags-changed' custom events dispatched by ODH when flags change,
 * ensuring immediate reactivity without polling.
 */
const OdhDevFeatureFlagOverridesProvider: React.FC<OdhDevFeatureFlagOverridesProviderProps> = ({
  children,
  crdOverrides = null,
}) => {
  // Read ODH dev feature flags from session storage
  const [odhDevFlags, setOdhDevFlags] = React.useState<Record<string, boolean> | null>(readOdhDevFlags);

  // Listen for ODH dev flags changes (custom event dispatched by ODH when flags are updated)
  React.useEffect(() => {
    const handleFlagsChanged = () => {
      setOdhDevFlags(readOdhDevFlags());
    };

    window.addEventListener('odh-dev-flags-changed', handleFlagsChanged);
    return () => window.removeEventListener('odh-dev-flags-changed', handleFlagsChanged);
  }, []);

  const overrides = React.useMemo<OdhDevFeatureFlagOverrides>(() => {
    const result: Record<string, boolean> = {};
    let hasOverrides = false;

    // Apply CRD-based overrides first (middle priority)
    if (crdOverrides) {
      Object.entries(crdOverrides).forEach(([technicalKey, value]) => {
        if (typeof value === 'boolean') {
          result[technicalKey] = value;
          hasOverrides = true;
        }
      });
    }

    // Apply dev flag overrides on top (highest priority — overrides CRD for testing)
    if (odhDevFlags) {
      Object.entries(DEV_FLAG_MAPPINGS).forEach(([displayName, technicalKey]) => {
        if (displayName in odhDevFlags && typeof odhDevFlags[displayName] === 'boolean') {
          result[technicalKey] = odhDevFlags[displayName];
          hasOverrides = true;
        }
      });
    }

    return hasOverrides ? result : null;
  }, [odhDevFlags, crdOverrides]);

  return (
    <OdhDevFeatureFlagOverridesContext.Provider value={overrides}>
      {children}
    </OdhDevFeatureFlagOverridesContext.Provider>
  );
};

export default OdhDevFeatureFlagOverridesProvider;
