import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  AutofillConnectionButtonExtension,
  CatalogSettingsUrlExtension,
  ModelCatalogBannerExtension,
  NamespaceSelectorExtension,
  ProjectsBridgeProviderExtension,
  RegistrySettingsUrlExtension,
} from '@mf/modelRegistry/extension-points';

const CATALOG_SETTINGS_PAGE_TITLE = 'Model catalog settings';
const CATALOG_SETTINGS_URL = '/settings/model-resources-operations/model-catalog';

const REGISTRY_SETTINGS_PAGE_TITLE = 'Model registry settings';
const REGISTRY_SETTINGS_URL = '/settings/model-resources-operations/model-registry';

const extensions: (
  | AutofillConnectionButtonExtension
  | NamespaceSelectorExtension
  | ProjectsBridgeProviderExtension
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
  {
    type: 'model-registry.projects/bridge-provider',
    properties: {
      component: () => import('./src/projectSelector/ProjectsBridgeProvider'),
    },
  },
];

export default extensions;
