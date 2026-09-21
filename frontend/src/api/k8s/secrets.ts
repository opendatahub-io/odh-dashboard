import { k8sPatchResource, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { genRandomChars } from '@odh-dashboard/foundation';
import {
  KnownLabels,
  DATA_CONNECTION_PREFIX,
  getGeneratedSecretName,
  translateDisplayNameForK8s,
} from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { SecretModel } from '@odh-dashboard/k8s-core/api/models';

export const assembleSecret = (
  projectName: string,
  data: Record<string, string>,
  type: 'aws' | 'generic' = 'generic',
  secretName?: string,
): SecretKind => {
  const labels: Record<string, string> = {
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };
  const annotations: Record<string, string> = {};

  let stringData = data;
  let name = getGeneratedSecretName();

  if (type === 'aws') {
    const { Name, ...secretBody } = data;
    stringData = secretBody;
    name = `${DATA_CONNECTION_PREFIX}-${translateDisplayNameForK8s(Name)}`;
    annotations['openshift.io/display-name'] = Name.trim();
    annotations['opendatahub.io/connection-type'] = 's3';
    labels[KnownLabels.DATA_CONNECTION_AWS] = 'true';
  }

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: secretName || name,
      namespace: projectName,
      annotations,
      labels,
    },
    stringData,
  };
};

export const assembleSecretTeacher = (
  projectName: string,
  data: Record<string, string>,
  secretName?: string,
): SecretKind => {
  const k8sName = secretName || `teacher-secret-${genRandomChars()}`;
  return assembleSecret(projectName, data, 'generic', k8sName);
};

export const assembleSecretJudge = (
  projectName: string,
  data: Record<string, string>,
  secretName?: string,
): SecretKind => {
  const k8sName = secretName || `judge-secret-${genRandomChars()}`;
  return assembleSecret(projectName, data, 'generic', k8sName);
};

export const assembleISSecretBody = (
  assignableData: Record<string, string>,
): [Record<string, string>, string] => {
  const secretKey = `secret-${genRandomChars()}`;
  delete assignableData.path;
  assignableData.type = 's3';
  return [
    {
      [secretKey]: JSON.stringify(assignableData),
    },
    secretKey,
  ];
};

export const assembleSecretISStorage = (
  namespace: string,
  data: Record<string, string>,
): [SecretKind, string] => {
  const labels = {
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };
  const [stringData, secretKey] = assembleISSecretBody(data);

  return [
    {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'storage-config',
        namespace,
        labels,
      },
      stringData,
    },
    secretKey,
  ];
};

export const patchSecretWithOwnerReference = (
  secret: SecretKind,
  resource: K8sResourceCommon & { metadata: { name: string } },
  uid: string,
): Promise<SecretKind> =>
  k8sPatchResource({
    model: SecretModel,
    queryOptions: { name: secret.metadata.name, ns: secret.metadata.namespace },
    patches: [
      {
        op: 'add',
        path: '/metadata/ownerReferences',
        value: [
          ...(secret.metadata.ownerReferences || []),
          {
            uid,
            name: resource.metadata.name,
            apiVersion: resource.apiVersion,
            kind: resource.kind,
            blockOwnerDeletion: false,
          },
        ],
      },
    ],
  });

export const patchSecretWithProtocolAnnotation = (
  secret: SecretKind,
  protocol: string,
): Promise<SecretKind> =>
  k8sPatchResource({
    model: SecretModel,
    queryOptions: { name: secret.metadata.name, ns: secret.metadata.namespace },
    patches: [
      {
        op: 'add',
        path: '/metadata/annotations',
        value: {
          ...(secret.metadata.annotations || {}),
          'opendatahub.io/connection-type-protocol': protocol,
        },
      },
    ],
  });
