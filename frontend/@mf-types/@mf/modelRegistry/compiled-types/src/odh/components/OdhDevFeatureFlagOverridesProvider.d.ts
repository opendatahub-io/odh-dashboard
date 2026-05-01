import * as React from 'react';
type OdhDevFeatureFlagOverridesProviderProps = {
    children: React.ReactNode;
    /** CRD-based feature flag overrides from the ODH dashboard config (odhdashboardconfig). */
    crdOverrides?: Partial<Record<string, boolean>> | null;
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
declare const OdhDevFeatureFlagOverridesProvider: React.FC<OdhDevFeatureFlagOverridesProviderProps>;
export default OdhDevFeatureFlagOverridesProvider;
