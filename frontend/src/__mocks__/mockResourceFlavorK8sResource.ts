import type { ResourceFlavorKind } from '@odh-dashboard/k8s-core';
import { genUID } from '#~/__mocks__/mockUtils';

type MockResourceFlavorConfigType = {
  name?: string;
  gpuProduct?: string;
};

export const mockResourceFlavorK8sResource = ({
  name = 'test-gpu-flavor',
  gpuProduct,
}: MockResourceFlavorConfigType = {}): ResourceFlavorKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'ResourceFlavor',
  metadata: {
    creationTimestamp: '2024-02-22T17:26:19Z',
    name,
    uid: genUID('resourceflavor'),
  },
  spec: {
    nodeLabels: gpuProduct ? { 'nvidia.com/gpu.product': gpuProduct } : {},
  },
});
