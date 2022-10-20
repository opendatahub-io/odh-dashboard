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

export const assembleSecret = (
  projectName: string,
  secretData: Record<string, string>,
  type?: 'aws', // We only have aws type now, but could add more in the future
): SecretKind => {
  let name = `secret-${genRandomChars()}`;
  const labels = {};
  if (type === 'aws') {
    name = secretData['Name'];
    labels['opendatahub.io/managed'] = 'true';
    delete secretData['Name'];
  }
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace: projectName,
      labels,
    },
    stringData: secretData,
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
