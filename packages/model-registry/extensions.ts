import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { AutofillConnectionButtonExtension } from '@mf/modelRegistry/extension-points';

type ModelCatalogBannerExtension = Extension<
  'model-catalog.page/banner',
  {
    id: string;
    component: CodeRef<React.ComponentType>;
  }
>;

const extensions: (AutofillConnectionButtonExtension | ModelCatalogBannerExtension)[] = [
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
];

export default extensions;
