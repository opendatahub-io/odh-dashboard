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
