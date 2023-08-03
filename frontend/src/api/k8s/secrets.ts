import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, K8sStatus, KnownLabels, SecretKind } from '~/k8sTypes';
import { SecretModel } from '~/api/models';
import { genRandomChars } from '~/utilities/string';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

export const DATA_CONNECTION_PREFIX = 'aws-connection';

export const assembleSecret = (
  projectName: string,
  data: Record<string, string>,
  type: 'aws' | 'generic' = 'generic',
  secretName?: string,
): SecretKind => {
  const labels = {
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };
  const annotations = {};

  let stringData = data;
  let name = `secret-${genRandomChars()}`;

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
    applyK8sAPIOptions(opts, {
      model: SecretModel,
      queryOptions: { name: secretName, ns: projectName },
    }),
  );

export const getSecretsByLabel = (label: string, namespace: string): Promise<SecretKind[]> =>
  k8sListResource<SecretKind>({
    model: SecretModel,
    queryOptions: { ns: namespace, queryParams: { labelSelector: label } },
  }).then((result) => result.items);

export const createSecret = (data: SecretKind, opts?: K8sAPIOptions): Promise<SecretKind> =>
  k8sCreateResource<SecretKind>(
    applyK8sAPIOptions(opts, {
      model: SecretModel,
      resource: data,
    }),
  );

export const replaceSecret = (data: SecretKind, opts?: K8sAPIOptions): Promise<SecretKind> =>
  k8sUpdateResource<SecretKind>(
    applyK8sAPIOptions(opts, {
      model: SecretModel,
      resource: data,
    }),
  );

export const deleteSecret = (
  projectName: string,
  secretName: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<SecretKind, K8sStatus>(
    applyK8sAPIOptions(opts, {
      model: SecretModel,
      queryOptions: { name: secretName, ns: projectName },
    }),
  );
