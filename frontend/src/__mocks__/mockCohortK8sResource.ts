import { CohortKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';

type MockCohortConfigType = {
  name?: string;
  parentName?: string;
  resourceName?: string;
  gpuFlavors?: { flavorName: string; gpuQuota: string }[];
};

export const mockCohortK8sResource = ({
  name = 'test-cohort',
  parentName,
  resourceName = 'nvidia.com/gpu',
  gpuFlavors = [{ flavorName: 'gpu-flavor', gpuQuota: '16' }],
}: MockCohortConfigType = {}): CohortKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'Cohort',
  metadata: {
    creationTimestamp: '2024-02-22T17:26:19Z',
    generation: 1,
    name,
    uid: genUID('cohort'),
  },
  spec: {
    ...(parentName && { parentName }),
    resourceGroups:
      gpuFlavors.length > 0
        ? [
            {
              coveredResources: [resourceName as never],
              flavors: gpuFlavors.map(({ flavorName, gpuQuota }) => ({
                name: flavorName,
                resources: [{ name: resourceName as never, nominalQuota: gpuQuota }],
              })),
            },
          ]
        : [],
  },
});
