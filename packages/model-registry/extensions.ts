import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { AutofillConnectionButtonExtension } from '@mf/modelRegistry/extension-points';

type ModelCatalogBannerExtension = Extension<
  'model-catalog.page/banner',
  {
    id: string;
    component: CodeRef<React.ComponentType>;
  }
>;

const extensions: (AutofillConnectionButtonExtension | ModelCatalogBannerExtension | Extension)[] =
  [
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
  ];

export default extensions;
