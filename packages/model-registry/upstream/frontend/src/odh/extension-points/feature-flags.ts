import * as React from 'react';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { TempDevFeature } from '~/app/hooks/useTempDevFeatureAvailable';

/**
 * Type for temp dev feature flag overrides.
 */
export type TempDevFeatureFlagsOverrides = Partial<Record<TempDevFeature, boolean>> | null;

/**
 * Context for providing temp dev feature flag overrides from ODH.
 * This allows the ODH dev feature flags modal to override upstream temp dev features.
 *
 * When ODH wraps the model registry, it provides this context with values
 * from its dev feature flags system. The useTempDevFeatureAvailable hook
 * checks this context first, then falls back to localStorage.
 */
export const TempDevFeatureFlagsContext = React.createContext<TempDevFeatureFlagsOverrides>(null);

/**
 * Hook to get temp dev feature flag overrides from context.
 */
export const useTempDevFeatureFlagsOverrides = (): TempDevFeatureFlagsOverrides => {
  return React.useContext(TempDevFeatureFlagsContext);
};

/**
 * Extension point for providing a temp dev feature flags context provider.
 * This allows ODH to inject a provider component that reads from its dev feature flags
 * and provides values to the TempDevFeatureFlagsContext.
 */
export type TempDevFeatureFlagsProviderExtension = Extension<
  'model-registry.feature-flags/provider',
  {
    /**
     * Provider component that wraps children and provides TempDevFeatureFlagsContext.
     * The component should read from ODH's dev feature flags and provide the values.
     */
    component: CodeRef<React.ComponentType<{ children: React.ReactNode }>>;
  }
>;

export const isTempDevFeatureFlagsProviderExtension = (
  extension: Extension,
): extension is TempDevFeatureFlagsProviderExtension =>
  extension.type === 'model-registry.feature-flags/provider';
