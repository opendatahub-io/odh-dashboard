/* eslint-disable camelcase */
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
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { EdgeModelState } from '~/concepts/edge/types';

export const DATA_CONNECTION_PREFIX = 'aws-connection';

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

export const assembleEdgeS3Secret = (
  projectName: string,
  data: Map<string, string>,
  secretName: string,
): SecretKind => {
  const storageConfigData = {
    type: 's3',
    access_key_id: data.get(AWS_KEYS.ACCESS_KEY_ID),
    secret_access_key: data.get(AWS_KEYS.SECRET_ACCESS_KEY),
    endpoint_url: data.get(AWS_KEYS.S3_ENDPOINT),
    region: data.get(AWS_KEYS.DEFAULT_REGION),
  };

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: secretName,
      namespace: projectName,
    },
    stringData: {
      'aws-storage-config': JSON.stringify(storageConfigData),
    },
  };
};

export const assembleEdgeImageRegistrySecret = (
  projectName: string,
  data: EdgeModelState,
  secretName: string,
): SecretKind => {
  const storageConfigData = {
    username: data.imageRegistryUsername,
    password: data.imageRegistryPassword,
  };

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: secretName,
      namespace: projectName,
      annotations: {
        'tekton.dev/docker-0': 'https://quay.io',
      },
    },
    stringData: storageConfigData,
  };
};
