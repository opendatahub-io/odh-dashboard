import * as React from 'react';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { TempDevFeature } from '~/app/hooks/useTempDevFeatureAvailable';

/**
 * Type for ODH dev feature flag overrides.
 */
export type OdhDevFeatureFlagOverrides = Partial<Record<TempDevFeature, boolean>> | null;

/**
 * Context for providing dev feature flag overrides from ODH.
 * This allows the ODH dev feature flags modal to override upstream temp dev features.
 *
 * When ODH wraps the model registry, it provides this context with values
 * from its dev feature flags system. The useTempDevFeatureAvailable hook
 * checks this context first, then falls back to localStorage.
 */
export const OdhDevFeatureFlagOverridesContext = React.createContext<OdhDevFeatureFlagOverrides>(null);

/**
 * Hook to get dev feature flag overrides from ODH context.
 */
export const useOdhDevFeatureFlagOverrides = (): OdhDevFeatureFlagOverrides => {
  return React.useContext(OdhDevFeatureFlagOverridesContext);
};

/**
 * Extension point for providing an ODH dev feature flag overrides provider.
 * This allows ODH to inject a provider component that reads from its dev feature flags
 * and provides override values to the OdhDevFeatureFlagOverridesContext.
 */
export type OdhDevFeatureFlagOverridesProviderExtension = Extension<
  'model-registry.feature-flag-overrides/provider',
  {
    /**
     * Provider component that wraps children and provides OdhDevFeatureFlagOverridesContext.
     * The component should read from ODH's dev feature flags and provide the override values.
     */
    component: CodeRef<React.ComponentType<{ children: React.ReactNode }>>;
  }
>;

export const isOdhDevFeatureFlagOverridesProviderExtension = (
  extension: Extension,
): extension is OdhDevFeatureFlagOverridesProviderExtension =>
  extension.type === 'model-registry.feature-flag-overrides/provider';
