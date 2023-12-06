import { AcceleratorProfileKind } from '~/k8sTypes';
import { TolerationEffect, TolerationOperator } from '~/types';
import { genUID } from './mockUtils';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  identifier?: string;
  enabled?: boolean;
  tolerations?: AcceleratorProfileKind['spec']['tolerations'];
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
      operator: TolerationOperator.EQUAL,
      effect: TolerationEffect.NO_SCHEDULE,
    },
  ],
}: MockResourceConfigType): AcceleratorProfileKind => ({
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
