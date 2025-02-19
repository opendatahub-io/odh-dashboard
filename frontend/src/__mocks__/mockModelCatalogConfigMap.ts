import type { ConfigMapKind } from '~/k8sTypes';
import { mockConfigMap } from './mockConfigMap';
import { mockModelCatalogSource } from './mockModelCatalogSource';

export const mockModelCatalogConfigMap = (): ConfigMapKind =>
  mockConfigMap({
    name: 'model-catalog-source-redhat',
    namespace: 'opendatahub',
    data: {
      modelCatalogSource: JSON.stringify(mockModelCatalogSource({})),
    },
  });
