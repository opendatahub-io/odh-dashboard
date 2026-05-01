import type { Extension } from '@openshift/dynamic-plugin-sdk';
/**
 * Extension point for providing the Model catalog settings URL.
 * This allows ODH to inject its own settings URL for the catalog settings page
 * without hardcoding the path in the model registry package.
 */
export type CatalogSettingsUrlExtension = Extension<'model-catalog.settings/url', {
    /**
     * The catalog settings URL path.
     */
    url: string;
    /**
     * The display title for the settings page link.
     */
    title: string;
}>;
export declare const isCatalogSettingsUrlExtension: (extension: Extension) => extension is CatalogSettingsUrlExtension;
