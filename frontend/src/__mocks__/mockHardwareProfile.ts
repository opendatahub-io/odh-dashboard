import { HardwareProfileKind } from '#~/k8sTypes';
import {
  Identifier,
  IdentifierResourceType,
  NodeSelector,
  SchedulingType,
  Toleration,
  TolerationEffect,
  TolerationOperator,
} from '#~/types';
import { WarningNotification } from '#~/concepts/hardwareProfiles/types';
import { genUID } from './mockUtils';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  displayName?: string;
  identifiers?: Identifier[];
  description?: string;
  enabled?: boolean;
  nodeSelector?: NodeSelector;
  schedulingType?: SchedulingType;
  localQueueName?: string;
  priorityClass?: string;
  tolerations?: Toleration[];
  annotations?: Record<string, string>;
  warning?: WarningNotification;
  labels?: Record<string, string>;
};

/*
The hardware profiles when mocked need to have unique names if they are in a list, or else they won't render properly.
*/
export const mockHardwareProfile = ({
  name = 'migrated-gpu',
  namespace = 'opendatahub',
  uid = genUID('service'),
  displayName = 'Nvidia GPU',
  identifiers = [
    {
      displayName: 'Memory',
      identifier: 'memory',
      minCount: '2Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
      resourceType: IdentifierResourceType.MEMORY,
    },
    {
      displayName: 'CPU',
      identifier: 'cpu',
      minCount: '1',
      maxCount: '2',
      defaultCount: '1',
      resourceType: IdentifierResourceType.CPU,
    },
  ],
  description = '',
  enabled = true,
  schedulingType = SchedulingType.NODE,
  localQueueName = 'default-local-queue',
  priorityClass = 'None',
  tolerations = [
    {
      key: 'nvidia.com/gpu',
      operator: TolerationOperator.EXISTS,
      effect: TolerationEffect.NO_SCHEDULE,
    },
  ],
  nodeSelector,
  annotations,
  labels,
}: MockResourceConfigType): HardwareProfileKind => ({
  apiVersion: 'ai.opendatahub.io/v1alpha1',
  kind: 'HardwareProfile',
  metadata: {
    creationTimestamp: '2023-03-17T16:12:41Z',
    generation: 1,
    name,
    namespace,
    resourceVersion: '1309350',
    uid,
    annotations: {
      ...annotations,
      'openshift.io/display-name': displayName,
      'opendatahub.io/description': description,
    },
    labels,
  },
  spec: {
    enabled,
    identifiers,
    scheduling: {
      type: schedulingType,
      ...(schedulingType === SchedulingType.QUEUE && {
        kueue: {
          localQueueName,
          priorityClass,
        },
      }),
      ...(schedulingType === SchedulingType.NODE && {
        node: {
          ...(nodeSelector ? { nodeSelector } : {}),
          tolerations,
        },
      }),
    },
  },
});

export const mockNewHardwareProfiles = [
  mockHardwareProfile({
    name: 'small-profile',
    displayName: 'Small Profile',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '1',
        maxCount: '2',
        defaultCount: '1',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '2Gi',
        maxCount: '4Gi',
        defaultCount: '2Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
    tolerations: [
      {
        effect: TolerationEffect.NO_SCHEDULE,
        key: 'NotebooksOnlyChange',
        operator: TolerationOperator.EXISTS,
      },
    ],
    nodeSelector: {},
  }),
  mockHardwareProfile({
    name: 'large-profile',
    displayName: 'Large Profile',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '4',
        maxCount: '8',
        defaultCount: '4',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '8Gi',
        maxCount: '16Gi',
        defaultCount: '8Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
  }),
];

export const mockGlobalScopedHardwareProfiles = [
  mockHardwareProfile({
    name: 'small-profile',
    displayName: 'Small Profile',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '1',
        maxCount: '2',
        defaultCount: '1',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '2Gi',
        maxCount: '4Gi',
        defaultCount: '2Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
    tolerations: [
      {
        effect: TolerationEffect.NO_SCHEDULE,
        key: 'NotebooksOnlyChange',
        operator: TolerationOperator.EXISTS,
      },
    ],
    nodeSelector: {},
  }),
  mockHardwareProfile({
    name: 'large-profile',
    displayName: 'Large Profile',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '4',
        maxCount: '8',
        defaultCount: '4',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '8Gi',
        maxCount: '16Gi',
        defaultCount: '8Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
  }),
];

export const mockProjectScopedHardwareProfiles = [
  mockHardwareProfile({
    name: 'small-profile',
    displayName: 'Small Profile',
    namespace: 'test-project',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '1',
        maxCount: '2',
        defaultCount: '1',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '2Gi',
        maxCount: '4Gi',
        defaultCount: '2Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
    tolerations: [
      {
        effect: TolerationEffect.NO_SCHEDULE,
        key: 'NotebooksOnlyChange',
        operator: TolerationOperator.EXISTS,
      },
    ],
    nodeSelector: {},
  }),
  mockHardwareProfile({
    name: 'large-profile-1',
    displayName: 'Large Profile-1',
    namespace: 'test-project',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '4',
        maxCount: '8',
        defaultCount: '4',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '8Gi',
        maxCount: '16Gi',
        defaultCount: '8Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
  }),
];
