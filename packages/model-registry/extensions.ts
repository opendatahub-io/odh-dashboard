import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { AutofillConnectionButtonExtension } from '@mf/modelRegistry/extension-points';

// These values match the constants in ~/app/routes/modelCatalogSettings/modelCatalogSettings.ts
const CATALOG_SETTINGS_PAGE_TITLE = 'AI catalog settings';
const catalogSettingsUrl = (): string => '/settings/model-resources-operations/model-catalog';

type ModelCatalogBannerExtension = Extension<
  'model-catalog.page/banner',
  {
    id: string;
    component: CodeRef<React.ComponentType>;
  }
>;

type CatalogSettingsUrlExtension = Extension<
  'model-catalog.settings/url',
  {
    getUrl: () => string;
    title: string;
  }
>;

const extensions: (
  | AutofillConnectionButtonExtension
  | ModelCatalogBannerExtension
  | CatalogSettingsUrlExtension
  | Extension
)[] = [
  {
    type: 'model-registry.register/autofill-connection',
    properties: {
      component: () => import('./src/connection/AutofillConnectionButton'),
    },
  },
  {
    type: 'model-catalog.page/banner',
    properties: {
      id: 'validated-models-banner',
      component: () => import('./src/modelCatalog/ValidatedModelsBanner').then((m) => m.default),
    },
  },
  {
    type: 'model-registry.admin/check',
    properties: {
      component: () => import('./upstream/frontend/src/odh/components/AdminCheck'),
    },
  },
  {
    type: 'model-catalog.settings/url',
    properties: {
      getUrl: catalogSettingsUrl,
      title: CATALOG_SETTINGS_PAGE_TITLE,
    },
  },
];

export default extensions;
