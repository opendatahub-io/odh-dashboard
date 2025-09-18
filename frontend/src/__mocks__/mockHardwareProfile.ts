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
  apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
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
      'opendatahub.io/display-name': displayName,
      'opendatahub.io/description': description,
      'opendatahub.io/disabled': enabled ? 'false' : 'true',
    },
    labels,
  },
  spec: {
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

// New method for creating non-migrated hardware profiles (native new profiles)
export const mockNewHardwareProfile = (
  config: Partial<MockResourceConfigType> = {},
): HardwareProfileKind => {
  const {
    name = 'new-hardware-profile',
    namespace = 'opendatahub',
    uid = genUID('service'),
    displayName = 'New Hardware Profile',
    description = '',
    identifiers = [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: 1,
        maxCount: 4,
        defaultCount: 2,
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '2Gi',
        maxCount: '8Gi',
        defaultCount: '4Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
    annotations,
    labels,
  } = config;

  return {
    apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
    kind: 'HardwareProfile',
    metadata: {
      creationTimestamp: new Date().toISOString(),
      generation: 1,
      name,
      namespace,
      resourceVersion: '1000000',
      uid,
      annotations: {
        ...annotations,
        'openshift.io/display-name': displayName,
        'opendatahub.io/description': description,
        'opendatahub.io/dashboard-feature-visibility': '[]',
        'opendatahub.io/disabled': 'false',
        'opendatahub.io/modified-date': new Date().toISOString(),
        // Explicitly NO 'opendatahub.io/migrated-from' annotation
      },
      labels,
    },
    spec: {
      identifiers,
    },
  };
};

export const mockNewHardwareProfilesGreek = [
  mockNewHardwareProfile({
    name: 'alpha',
    displayName: 'Alpha Profile',
    description: 'Basic development profile',
  }),
  mockNewHardwareProfile({
    name: 'beta',
    displayName: 'Beta Profile',
    description: 'Enhanced profile with more resources',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: 2,
        maxCount: 8,
        defaultCount: 4,
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '4Gi',
        maxCount: '16Gi',
        defaultCount: '8Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
  }),
  mockNewHardwareProfile({
    name: 'gamma',
    displayName: 'Gamma Profile',
    description: 'High-performance profile with GPU',
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: 4,
        maxCount: 16,
        defaultCount: 8,
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '8Gi',
        maxCount: '32Gi',
        defaultCount: '16Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
      {
        displayName: 'GPU',
        identifier: 'nvidia.com/gpu',
        minCount: 1,
        maxCount: 4,
        defaultCount: 1,
        resourceType: IdentifierResourceType.ACCELERATOR,
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
