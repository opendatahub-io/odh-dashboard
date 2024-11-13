import { KubeFastifyInstance, NIMAccountKind, SecretKind } from '../../../../types';

const NIM_SECRET_NAME = 'nvidia-nim-access';
const NIM_ACCOUNT_NAME = 'odh-nim-account';

export const isAppEnabled = (app: NIMAccountKind): boolean => {
  const conditions = app?.status?.conditions || [];
  return (
    conditions.find(
      (condition) => condition.type === 'AccountStatus' && condition.status === 'True',
    ) !== undefined
  );
};

export const getNIMAccount = async (
  fastify: KubeFastifyInstance,
  namespace: string,
): Promise<NIMAccountKind> => {
  const { customObjectsApi } = fastify.kube;
  try {
    const response = await customObjectsApi.getNamespacedCustomObject(
      'nim.opendatahub.io',
      'v1',
      namespace,
      'accounts',
      NIM_ACCOUNT_NAME,
    );
    return Promise.resolve(response.body as NIMAccountKind);
  } catch (e) {
    return Promise.reject(e);
  }
};

export const createNIMAccount = async (
  fastify: KubeFastifyInstance,
  namespace: string,
): Promise<NIMAccountKind> => {
  const { customObjectsApi } = fastify.kube;
  const account = {
    apiVersion: 'nim.opendatahub.io/v1',
    kind: 'Account',
    metadata: {
      name: NIM_ACCOUNT_NAME,
      namespace,
      labels: {
        'opendatahub.io/managed': 'true',
      },
    },
    spec: {
      apiKeySecret: {
        name: NIM_SECRET_NAME,
      },
    },
  };
  const response = await customObjectsApi.createNamespacedCustomObject(
    'nim.opendatahub.io',
    'v1',
    namespace,
    'accounts',
    account,
  );
  return Promise.resolve(response.body as NIMAccountKind);
};

export const createNIMSecret = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  enableValues: { [key: string]: string },
): Promise<SecretKind> => {
  const { coreV1Api } = fastify.kube;
  const nimSecret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: NIM_SECRET_NAME,
      namespace,
      labels: {
        'opendatahub.io/managed': 'true',
      },
    },
    type: 'Opaque',
    stringData: enableValues,
  };

  const response = await coreV1Api.createNamespacedSecret(namespace, nimSecret);
  return Promise.resolve(response.body as SecretKind);
};
