import { ConnectionTypeConfigMapObj, ConnectionTypeField } from '~/concepts/connectionTypes/types';
import { NameDescType } from '~/pages/projects/types';

export const extractConnectionTypeFromMap = (
  configMap?: ConnectionTypeConfigMapObj,
): [nameDesc: NameDescType, enabled: boolean, fields: ConnectionTypeField[]] => [
  {
    k8sName: configMap?.metadata.name ?? '',
    name: configMap?.metadata.annotations['openshift.io/display-name'] ?? '',
    description: configMap?.metadata.annotations['openshift.io/description'] ?? '',
  },
  configMap?.metadata.annotations['opendatahub.io/enabled'] === 'true',
  configMap?.data?.fields ?? [],
];

export const createConnectionTypeObj = (
  metadata: {
    k8sName: string;
    displayName: string;
    description: string;
    enabled: boolean;
    username: string;
  },
  fields: ConnectionTypeField[],
): ConnectionTypeConfigMapObj => ({
  kind: 'ConfigMap',
  apiVersion: 'v1',
  metadata: {
    name: metadata.k8sName,
    annotations: {
      'openshift.io/display-name': metadata.displayName,
      'openshift.io/description': metadata.description,
      'opendatahub.io/enabled': metadata.enabled ? 'true' : 'false',
      'opendatahub.io/username': metadata.username,
    },
    labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/connection-type': 'true' },
  },
  data: {
    fields,
  },
});
