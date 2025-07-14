import type { ConfigMapKind } from '#~/k8sTypes';
import { ModelCatalogSourcesObject } from '#~/concepts/modelCatalog/types';
import { mockConfigMap } from './mockConfigMap';
import { mockModelCatalogSource } from './mockModelCatalogSource';

export const mockModelCatalogConfigMap = (
  sources = [mockModelCatalogSource({})],
  configMapName = 'model-catalog-sources',
): ConfigMapKind => {
  const sourcesObj: ModelCatalogSourcesObject = {
    sources,
  };

  return mockConfigMap({
    name: configMapName,
    namespace: 'opendatahub',
    data: {
      modelCatalogSources: JSON.stringify(sourcesObj),
    },
  });
};

export const mockManagedModelCatalogConfigMap = (
  sources = [mockModelCatalogSource({})],
): ConfigMapKind =>
  mockConfigMap({
    name: 'model-catalog-sources',
    namespace: 'opendatahub',
    data: {
      modelCatalogSources: JSON.stringify({ sources }),
    },
  });

export const mockUnmanagedModelCatalogConfigMap = (
  sources = [mockModelCatalogSource({})],
): ConfigMapKind =>
  mockConfigMap({
    name: 'model-catalog-unmanaged-sources',
    namespace: 'opendatahub',
    data: {
      modelCatalogSources: JSON.stringify({ sources }),
    },
  });

export const mockConfigMap404Response = (
  name: string,
): {
  statusCode: number;
  body: {
    kind: string;
    apiVersion: string;
    metadata: Record<string, never>;
    status: 'Failure';
    message: string;
    reason: string;
    code: number;
  };
} => ({
  statusCode: 404,
  body: {
    kind: 'Status',
    apiVersion: 'v1',
    metadata: {},
    status: 'Failure' as const,
    message: `configmaps "${name}" not found`,
    reason: 'NotFound',
    code: 404,
  },
});
