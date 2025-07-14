import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, KnownLabels, SecretKind } from '#~/k8sTypes';
import { SecretModel } from '#~/api/models';
import { genRandomChars } from '#~/utilities/string';
import { translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';

export const DATA_CONNECTION_PREFIX = 'aws-connection';
export const SECRET_PREFIX = 'secret-';

export const getGeneratedSecretName = (): string => `${SECRET_PREFIX}${genRandomChars()}`;
export const isGeneratedSecretName = (name: string): boolean =>
  new RegExp(`^${SECRET_PREFIX}[a-z0-9]{6}$`).test(name);

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
