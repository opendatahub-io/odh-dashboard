import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type {
  AutofillConnectionButtonExtension,
  NamespaceSelectorExtension,
} from '@mf/modelRegistry/extension-points';

const CATALOG_SETTINGS_PAGE_TITLE = 'Model catalog settings';
const CATALOG_SETTINGS_URL = '/settings/model-resources-operations/model-catalog';

const REGISTRY_SETTINGS_PAGE_TITLE = 'Model registry settings';
const REGISTRY_SETTINGS_URL = '/settings/model-resources-operations/model-registry';

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
    url: string;
    title: string;
  }
>;

type RegistrySettingsUrlExtension = Extension<
  'model-registry.settings/url',
  {
    url: string;
    title: string;
  }
>;

const extensions: (
  | AutofillConnectionButtonExtension
  | NamespaceSelectorExtension
  | ModelCatalogBannerExtension
  | CatalogSettingsUrlExtension
  | RegistrySettingsUrlExtension
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
      url: CATALOG_SETTINGS_URL,
      title: CATALOG_SETTINGS_PAGE_TITLE,
    },
  },
  {
    type: 'model-registry.settings/url',
    properties: {
      url: REGISTRY_SETTINGS_URL,
      title: REGISTRY_SETTINGS_PAGE_TITLE,
    },
  },
  {
    type: 'model-registry.namespace/selector',
    properties: {
      component: () => import('./src/projectSelector/ProjectSelectorField'),
    },
  },
];

export default extensions;
