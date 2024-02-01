import { AcceleratorProfileKind } from '~/k8sTypes';
import { Toleration, TolerationEffect, TolerationOperator } from '~/types';
import { genUID } from './mockUtils';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  displayName?: string;
  identifier?: string;
  description?: string;
  enabled?: boolean;
  tolerations?: Toleration[];
};

export const mockAcceleratorProfile = ({
  name = 'migrated-gpu',
  namespace = 'test-project',
  uid = genUID('service'),
  displayName = 'Nvidia GPU',
  identifier = 'nvidia.com/gpu',
  description = '',
  enabled = true,
  tolerations = [
    {
      key: 'nvidia.com/gpu',
      operator: TolerationOperator.EXISTS,
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
    uid,
  },
  spec: {
    identifier,
    displayName,
    enabled,
    tolerations,
    description,
  },
});
