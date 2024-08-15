import { ConnectionTypeConfigMapObj, ConnectionTypeField } from '~/concepts/connectionTypes/types';

export const extractConnectionTypeFromMap = (
  configMap?: ConnectionTypeConfigMapObj,
): {
  k8sName: string;
  name: string;
  description: string;
  enabled: boolean;
  fields: ConnectionTypeField[];
} => ({
  k8sName: configMap?.metadata.name ?? '',
  name: configMap?.metadata.annotations?.['openshift.io/display-name'] ?? '',
  description: configMap?.metadata.annotations?.['openshift.io/description'] ?? '',
  enabled: configMap?.metadata.annotations?.['opendatahub.io/enabled'] === 'true',
  fields: configMap?.data?.fields ?? [],
});

export const createConnectionTypeObj = (
  k8sName: string,
  displayName: string,
  description: string,
  enabled: boolean,
  username: string,
  fields: ConnectionTypeField[],
): ConnectionTypeConfigMapObj => ({
  kind: 'ConfigMap',
  apiVersion: 'v1',
  metadata: {
    name: k8sName,
    annotations: {
      'openshift.io/display-name': displayName,
      'openshift.io/description': description,
      'opendatahub.io/enabled': enabled ? 'true' : 'false',
      'opendatahub.io/username': username,
    },
    labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/connection-type': 'true' },
  },
  data: {
    fields,
  },
});
