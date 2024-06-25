import {
  K8sGroupVersionKind,
  K8sModelCommon,
  K8sResourceCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { genUID } from '~/__mocks__/mockUtils';
import { KnownLabels } from '~/k8sTypes';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import { DataConnection } from '~/pages/projects/types';

export const addOwnerReference = <R extends K8sResourceCommon>(
  resource: R,
  owner?: K8sResourceCommon,
  blockOwnerDeletion = false,
): R => {
  if (!owner) {
    return resource;
  }
  const ownerReferences = resource.metadata?.ownerReferences || [];
  if (
    owner.metadata?.uid &&
    owner.metadata.name &&
    !ownerReferences.find((r) => r.uid === owner.metadata?.uid)
  ) {
    ownerReferences.push({
      uid: owner.metadata.uid,
      name: owner.metadata.name,
      apiVersion: owner.apiVersion,
      kind: owner.kind,
      blockOwnerDeletion,
    });
  }
  return {
    ...resource,
    metadata: {
      ...resource.metadata,
      ownerReferences,
    },
  };
};

export const groupVersionKind = (model: K8sModelCommon): K8sGroupVersionKind => ({
  group: model.apiGroup,
  version: model.apiVersion,
  kind: model.kind,
});

export const dataConnection: DataConnection = {
  type: 0,
  data: {
    kind: 'Secret',
    apiVersion: 'v1',
    metadata: {
      name: 'test-secret',
      namespace: 'test-project',
      uid: genUID('secret'),
      resourceVersion: '5985371',
      creationTimestamp: '2023-03-22T16:18:56Z',
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        [KnownLabels.DATA_CONNECTION_AWS]: 'true',
      },
      annotations: {
        'opendatahub.io/connection-type': 's3',
        'openshift.io/display-name': 'Test Secret',
      },
    },
    data: {
      [AwsKeys.NAME]: 'test-secret',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_DEFAULT_REGION: 'region',
      AWS_S3_BUCKET: 'bucket',
      AWS_S3_ENDPOINT: 'endpoint',
      AWS_SECRET_ACCESS_KEY: 'test',
    },
    type: 'Opaque',
  },
};
