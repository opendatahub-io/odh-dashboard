import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sStatus, SecretKind } from '../../k8sTypes';
import { SecretModel } from '../models';
import { genRandomChars } from '../../utilities/string';
import { translateDisplayNameForK8s } from '../../pages/projects/utils';
import { getModelServiceAccountName } from '../../pages/modelServing/utils';

export const DATA_CONNECTION_PREFIX = 'aws-connection';

export const assembleSecret = (
  projectName: string,
  data: Record<string, string>,
  type: 'aws' | 'generic' = 'generic',
  secretName?: string,
): SecretKind => {
  const labels = {
    'opendatahub.io/dashboard': 'true',
  };
  const annotations = {};

  let stringData = data;
  let name = `secret-${genRandomChars()}`;

  if (type === 'aws') {
    const { Name, ...secretBody } = data;
    stringData = secretBody;
    name = `${DATA_CONNECTION_PREFIX}-${translateDisplayNameForK8s(Name)}`;
    annotations['openshift.io/display-name'] = Name;
    annotations['opendatahub.io/connection-type'] = 's3';
    labels['opendatahub.io/managed'] = 'true';
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

export const assembleISSecretBody = (
  data: Record<string, string>,
): [Record<string, string>, string] => {
  const secretKey = `secret-${genRandomChars()}`;
  delete data.path;
  data['type'] = 's3';
  return [
    {
      [secretKey]: JSON.stringify(data),
    },
    secretKey,
  ];
};

export const assembleSecretISStorage = (
  namespace: string,
  data: Record<string, string>,
): [SecretKind, string] => {
  const labels = {
    'opendatahub.io/dashboard': 'true',
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

export const assembleSecretSA = (
  name: string,
  namespace: string,
  editName?: string,
): SecretKind => {
  const saName = getModelServiceAccountName(namespace);
  const k8Name = editName || translateDisplayNameForK8s(name);
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: k8Name,
      namespace,
      annotations: {
        'kubernetes.io/service-account.name': saName,
        'openshift.io/display-name': name,
      },
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    type: 'kubernetes.io/service-account-token',
  };
};

export const getSecret = (projectName: string, secretName: string): Promise<SecretKind> => {
  return k8sGetResource<SecretKind>({
    model: SecretModel,
    queryOptions: { name: secretName, ns: projectName },
  });
};

export const getSecretsByLabel = (label: string, namespace: string): Promise<SecretKind[]> => {
  return k8sListResource<SecretKind>({
    model: SecretModel,
    queryOptions: { ns: namespace, queryParams: { labelSelector: label } },
  }).then((result) => result.items);
};

export const createSecret = (data: SecretKind): Promise<SecretKind> => {
  return k8sCreateResource<SecretKind>({ model: SecretModel, resource: data });
};

export const replaceSecret = (data: SecretKind): Promise<SecretKind> => {
  return k8sUpdateResource<SecretKind>({ model: SecretModel, resource: data });
};

export const deleteSecret = (projectName: string, secretName: string): Promise<K8sStatus> => {
  return k8sDeleteResource<SecretKind, K8sStatus>({
    model: SecretModel,
    queryOptions: { name: secretName, ns: projectName },
  });
};
