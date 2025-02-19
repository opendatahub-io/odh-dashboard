import { HardwareProfileKind } from '~/k8sTypes';
import {
  Identifier,
  IdentifierResourceType,
  NodeSelector,
  Toleration,
  TolerationEffect,
  TolerationOperator,
} from '~/types';
import { WarningNotification } from '~/concepts/hardwareProfiles/types';
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
  tolerations = [
    {
      key: 'nvidia.com/gpu',
      operator: TolerationOperator.EXISTS,
      effect: TolerationEffect.NO_SCHEDULE,
    },
  ],
  nodeSelector = {
    test: 'value',
  },
  annotations,
  labels,
}: MockResourceConfigType): HardwareProfileKind => ({
  apiVersion: 'dashboard.opendatahub.io/v1alpha1',
  kind: 'HardwareProfile',
  metadata: {
    creationTimestamp: '2023-03-17T16:12:41Z',
    generation: 1,
    name,
    namespace,
    resourceVersion: '1309350',
    uid,
    annotations,
    labels,
  },
  spec: {
    identifiers,
    displayName,
    enabled,
    tolerations,
    nodeSelector,
    description,
  },
});
