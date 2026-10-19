import { KubeFastifyInstance, NIMAccountKind, SecretKind } from '../../../../types';
import createError from 'http-errors';
import { errorHandler } from '../../../../utils';

const NIM_SECRET_NAME = 'nvidia-nim-access';
const NIM_ACCOUNT_NAME = 'odh-nim-account';

export const errorMsgList = (app: NIMAccountKind): string[] => {
  const conditions = app?.status?.conditions || [];
  return conditions
    .filter((condition) => condition.status === 'False')
    .map((condition) => condition.message);
};

export const getLastAccountCheckTimestamp = (app: NIMAccountKind): string => {
  return app?.status?.lastAccountCheck || '';
};

export const apiKeyValidationStatus = (app: NIMAccountKind): string => {
  const conditions = app?.status?.conditions || [];
  const apiKeyCondition = conditions.find((condition) => condition.type === 'APIKeyValidation');
  return apiKeyCondition?.status || 'Unknown';
};

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
): Promise<NIMAccountKind | undefined> => {
  const { customObjectsApi, namespace } = fastify.kube;
  try {
    // Get the list of accounts from the response
    const accounts = (await customObjectsApi.listNamespacedCustomObject({
      group: 'nim.opendatahub.io',
      version: 'v1',
      namespace,
      plural: 'accounts',
    })) as {
      items: NIMAccountKind[];
    };

    return accounts.items[0] || undefined;
  } catch (e) {
    return Promise.reject(e);
  }
};

export const createNIMAccount = async (fastify: KubeFastifyInstance): Promise<NIMAccountKind> => {
  const { customObjectsApi, namespace } = fastify.kube;
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
  const response = await customObjectsApi.createNamespacedCustomObject({
    group: 'nim.opendatahub.io',
    version: 'v1',
    namespace,
    plural: 'accounts',
    body: account,
  });
  return Promise.resolve(response as NIMAccountKind);
};

export const manageNIMSecret = async (
  fastify: KubeFastifyInstance,
  enableValues: { [key: string]: string },
): Promise<{ secret: SecretKind }> => {
  const { coreV1Api, namespace } = fastify.kube;
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

  try {
    // Try to create the secret
    const response = await coreV1Api.createNamespacedSecret({ namespace, body: nimSecret });
    return { secret: response as SecretKind };
  } catch (e: any) {
    if (e.response?.statusCode === 409) {
      // Secret already exists, so update it (replace)
      // Add annotation to force validation
      const updatedSecret = {
        ...nimSecret,
        metadata: {
          ...nimSecret.metadata,
          annotations: {
            ...(nimSecret.metadata as any).annotations,
            'runtimes.opendatahub.io/nim-force-validation': new Date().toISOString(),
          },
        },
      };

      const updateResponse = await coreV1Api.replaceNamespacedSecret({
        name: NIM_SECRET_NAME,
        namespace,
        body: updatedSecret,
      });
      return { secret: updateResponse as SecretKind };
    } else {
      throw e;
    }
  }
};

export const deleteNIMAccount = async (
  fastify: KubeFastifyInstance,
): Promise<{ success: boolean; error: string }> => {
  const { customObjectsApi } = fastify.kube;
  const { namespace } = fastify.kube;

  try {
    await customObjectsApi
      .deleteNamespacedCustomObject({
        group: 'nim.opendatahub.io',
        version: 'v1',
        namespace,
        plural: 'accounts',
        name: NIM_ACCOUNT_NAME,
      })
      .catch((e) => {
        throw createError(e.statusCode, e?.body?.message);
      });
    return { success: true, error: '' };
  } catch (e) {
    if (createError.isHttpError(e) && e.statusCode === 404) {
      fastify.log.error(e, 'Unable to delete nim account.');
      return { success: false, error: `Unable to delete nim account: ${errorHandler(e)}` };
    }
    throw e;
  }
};
