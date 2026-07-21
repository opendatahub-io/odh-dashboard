import type { Extension, ExtensionPredicate, CodeRef } from '@openshift/dynamic-plugin-sdk';
export type ModelCatalogBannerExtension = Extension<'model-catalog.page/banner', {
    id: string;
    component: CodeRef<React.ComponentType>;
}>;
export declare const isModelCatalogBannerExtension: ExtensionPredicate<ModelCatalogBannerExtension>;
