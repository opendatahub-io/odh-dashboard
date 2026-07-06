import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';

export type ModelCatalogBannerExtension = Extension<
  'model-catalog.page/banner',
  {
    id: string;
    component: CodeRef<React.ComponentType>;
  }
>;

export const isModelCatalogBannerExtension = createExtensionGuard<ModelCatalogBannerExtension>(
  'model-catalog.page/banner',
);
