import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
export type ModelCatalogBannerExtension = Extension<'model-catalog.page/banner', {
    id: string;
    component: CodeRef<React.ComponentType>;
}>;
export declare const isModelCatalogBannerExtension: (extension: Extension) => extension is ModelCatalogBannerExtension;
