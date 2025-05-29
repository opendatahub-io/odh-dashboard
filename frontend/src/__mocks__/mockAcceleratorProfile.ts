import { AcceleratorProfileKind } from '#~/k8sTypes';
import { Toleration, TolerationEffect, TolerationOperator } from '#~/types';
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

export const mockGlobalScopedAcceleratorProfiles = [
  mockAcceleratorProfile({
    name: 'small-profile-global',
    displayName: 'Small Profile Global',
    namespace: 'opendatahub',
    tolerations: [
      {
        effect: TolerationEffect.NO_SCHEDULE,
        key: 'NotebooksOnlyChange',
        operator: TolerationOperator.EXISTS,
      },
    ],
  }),
  mockAcceleratorProfile({
    name: 'large-profile-global',
    displayName: 'Large Profile Global',
    namespace: 'opendatahub',
  }),
];

export const mockProjectScopedAcceleratorProfiles = [
  mockAcceleratorProfile({
    name: 'small-profile',
    displayName: 'Small Profile',
    namespace: 'test-project',
    tolerations: [
      {
        effect: TolerationEffect.NO_SCHEDULE,
        key: 'NotebooksOnlyChange',
        operator: TolerationOperator.EXISTS,
      },
    ],
  }),
  mockAcceleratorProfile({
    name: 'large-profile-1',
    displayName: 'Large Profile-1',
    namespace: 'test-project',
  }),
];
