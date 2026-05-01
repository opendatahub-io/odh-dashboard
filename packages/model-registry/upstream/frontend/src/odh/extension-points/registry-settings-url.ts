import type { Extension } from '@openshift/dynamic-plugin-sdk';

/**
 * Extension point for providing the model registry settings URL.
 * This allows ODH to inject its own settings URL for the registry settings page
 * without hardcoding the path in the model registry package.
 */
export type RegistrySettingsUrlExtension = Extension<
  'model-registry.settings/url',
  {
    /**
     * The registry settings URL path.
     */
    url: string;
    /**
     * The display title for the settings page link.
     */
    title: string;
  }
>;

export const isRegistrySettingsUrlExtension = (
  extension: Extension,
): extension is RegistrySettingsUrlExtension => extension.type === 'model-registry.settings/url';
