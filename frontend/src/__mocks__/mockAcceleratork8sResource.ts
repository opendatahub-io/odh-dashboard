import { AcceleratorKind } from '~/k8sTypes';
import { genUID } from './mockUtils';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  identifier?: string;
  enabled?: boolean;
  tolerations?: {
    key: string;
    operator: string;
    effect: string;
  }[];
};

export const mockAcceleratork8sResource = ({
  name = 'migrated-gpu',
  namespace = 'test-project',
  displayName = 'Nvidia GPU',
  identifier = 'nvidia.com/gpu',
  enabled = true,
  tolerations = [
    {
      key: 'nvidia.com/gpu',
      operator: 'Exists',
      effect: 'NoSchedule',
    },
  ],
}: MockResourceConfigType): AcceleratorKind => ({
  apiVersion: 'dashboard.opendatahub.io/v1',
  kind: 'AcceleratorProfile',
  metadata: {
    creationTimestamp: '2023-03-17T16:12:41Z',
    generation: 1,
    name,
    namespace,
    resourceVersion: '1309350',
    uid: genUID('service'),
  },
  spec: {
    identifier,
    displayName,
    enabled,
    tolerations,
  },
});
