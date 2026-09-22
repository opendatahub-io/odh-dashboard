import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { SecretModel } from './models';
import { KnownLabels, applyK8sAPIOptions, translateDisplayNameForK8s } from '../index';
import type { SecretKind, K8sAPIOptions } from '../k8sTypes';

export const assembleSecretSA = (
  name: string,
  serviceAccountName: string,
  namespace: string,
  editName?: string,
): SecretKind => {
  const k8Name = editName || translateDisplayNameForK8s(name);
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: editName || `${k8Name}-${serviceAccountName}`,
      namespace,
      annotations: {
        'kubernetes.io/service-account.name': serviceAccountName,
        'openshift.io/display-name': name.trim(),
      },
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      },
    },
    type: 'kubernetes.io/service-account-token',
  };
};

export const getSecret = (
  projectName: string,
  secretName: string,
  opts?: K8sAPIOptions,
): Promise<SecretKind> =>
  k8sGetResource<SecretKind>(
    applyK8sAPIOptions(
      {
        model: SecretModel,
        queryOptions: { name: secretName, ns: projectName },
      },
      opts,
    ),
  );

export const getSecretsByLabel = (
  label: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<SecretKind[]> =>
  k8sListResource<SecretKind>(
    applyK8sAPIOptions(
      {
        model: SecretModel,
        queryOptions: { ns: namespace, queryParams: { labelSelector: label } },
      },
      opts,
    ),
  ).then((result) => result.items);

export const createSecret = (data: SecretKind, opts?: K8sAPIOptions): Promise<SecretKind> =>
  k8sCreateResource<SecretKind>(
    applyK8sAPIOptions(
      {
        model: SecretModel,
        resource: data,
      },
      opts,
    ),
  );

export const replaceSecret = (data: SecretKind, opts?: K8sAPIOptions): Promise<SecretKind> =>
  k8sUpdateResource<SecretKind>(
    applyK8sAPIOptions(
      {
        model: SecretModel,
        resource: data,
      },
      opts,
    ),
  );

export const deleteSecret = (
  projectName: string,
  secretName: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<SecretKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: SecretModel,
        queryOptions: { name: secretName, ns: projectName },
      },
      opts,
    ),
  );
