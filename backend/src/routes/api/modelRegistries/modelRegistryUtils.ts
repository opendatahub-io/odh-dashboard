import { KubeFastifyInstance, ModelRegistryKind, RecursivePartial } from '../../../types';
import { PatchUtils, V1ConfigMap, V1Secret, V1Status } from '@kubernetes/client-node';
import { getClusterStatus } from '../../../utils/resourceUtils';

const MODEL_REGISTRY_API_GROUP = 'modelregistry.opendatahub.io';
const MODEL_REGISTRY_API_VERSION = 'v1beta1';
const MODEL_REGISTRY_PLURAL = 'modelregistries';

export const getModelRegistryNamespace = (fastify: KubeFastifyInstance): string => {
  const clusterStatus = getClusterStatus(fastify);
  const registriesNamespace = clusterStatus.components?.modelregistry?.registriesNamespace;
  if (!registriesNamespace) {
    throw new Error('Model registry namespace not found in DSC status');
  }
  return registriesNamespace;
};

const base64encode = (value?: string): string => {
  // This usage of toString is fine for encoding
  // eslint-disable-next-line no-restricted-properties
  return Buffer.from(value || '').toString('base64');
};
const base64decode = (encodedValue?: string): string =>
  String(Buffer.from(encodedValue || '', 'base64'));

const MR_DATABASE_TYPES = ['mysql', 'postgres'] satisfies (keyof ModelRegistryKind['spec'])[];
type MRDatabaseType = (typeof MR_DATABASE_TYPES)[number];
const getDatabaseType = (modelRegistry: ModelRegistryKind): MRDatabaseType | undefined =>
  MR_DATABASE_TYPES.find((type) => !!modelRegistry.spec[type]);

const getDatabaseSpec = (
  modelRegistry: ModelRegistryKind,
): ModelRegistryKind['spec'][MRDatabaseType] | undefined => {
  const dbType = getDatabaseType(modelRegistry);
  return dbType && modelRegistry.spec[dbType];
};

export const listModelRegistries = async (
  fastify: KubeFastifyInstance,
  modelRegistryNamespace: string,
  labelSelector?: string,
): Promise<{ items: ModelRegistryKind[] }> => {
  const response = await (fastify.kube.customObjectsApi.listNamespacedCustomObject(
    MODEL_REGISTRY_API_GROUP,
    MODEL_REGISTRY_API_VERSION,
    modelRegistryNamespace,
    MODEL_REGISTRY_PLURAL,
    undefined,
    undefined,
    undefined,
    labelSelector,
    // listNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: { items: ModelRegistryKind[] } }>);
  return response.body;
};

const createDatabasePasswordSecret = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
  databasePassword?: string,
  dryRun = false,
): Promise<V1Secret | null> => {
  const dbSpec = getDatabaseSpec(modelRegistry);
  if (!dbSpec) {
    return null;
  }
  const secret: V1Secret = {
    kind: 'Secret',
    apiVersion: 'v1',
    metadata: {
      generateName: `${modelRegistry.metadata.name}-db-`,
      namespace: modelRegistryNamespace,
      annotations: {
        'template.openshift.io/expose-database_name': "{.data['database-name']}",
        'template.openshift.io/expose-username': "{.data['database-user']}",
        'template.openshift.io/expose-password': "{.data['database-password']}",
      },
    },
    data: {
      'database-name': base64encode(dbSpec.database),
      'database-user': base64encode(dbSpec.username),
      'database-password': base64encode(databasePassword),
    },
    type: 'Opaque',
  };
  const response = await fastify.kube.coreV1Api.createNamespacedSecret(
    modelRegistryNamespace,
    secret,
    undefined,
    dryRun ? 'All' : undefined,
  );
  return response.body;
};

const createModelRegistry = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
  secret?: V1Secret,
  dryRun = false,
): Promise<ModelRegistryKind> => {
  const dbType = getDatabaseType(modelRegistry);
  const modelRegistryWithSecretRef: ModelRegistryKind =
    dbType && secret
      ? {
          ...modelRegistry,
          spec: {
            ...modelRegistry.spec,
            [dbType]: {
              ...modelRegistry.spec[dbType],
              passwordSecret: {
                key: 'database-password',
                name: secret.metadata.name,
              },
            },
          },
        }
      : modelRegistry;
  const response = await (fastify.kube.customObjectsApi.createNamespacedCustomObject(
    MODEL_REGISTRY_API_GROUP,
    MODEL_REGISTRY_API_VERSION,
    modelRegistryNamespace,
    MODEL_REGISTRY_PLURAL,
    modelRegistryWithSecretRef,
    undefined,
    dryRun ? 'All' : undefined,
    // createNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: ModelRegistryKind }>);
  return response.body;
};

const createConfigMapForCACertficate = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
  newDatabaseCACertificate: string,
): Promise<V1ConfigMap> => {
  const body: V1ConfigMap = {
    metadata: {
      name,
      namespace,
    },
    data: { 'ca.crt': newDatabaseCACertificate },
  };
  return await fastify.kube.coreV1Api
    .createNamespacedConfigMap(namespace, body)
    .then((response) => response.body);
};

export const createModelRegistryAndCredentials = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
  databasePassword?: string,
  newDatabaseCACertificate?: string,
  dryRunOnly = false,
): Promise<ModelRegistryKind> => {
  let newCACertificateConfigMap: { name: string; key: string };
  if (newDatabaseCACertificate) {
    const newConfigMap = await createConfigMapForCACertficate(
      fastify,
      modelRegistryNamespace,
      modelRegistry.spec.mysql.sslRootCertificateConfigMap.name,
      newDatabaseCACertificate,
    );

    newCACertificateConfigMap = {
      name: newConfigMap.metadata.name,
      key: Object.keys(newConfigMap.data || {})[0],
    };

    if (modelRegistry.spec.mysql) {
      modelRegistry.spec.mysql.sslRootCertificateConfigMap = newCACertificateConfigMap;
    }
  }

  const createBoth = async (dryRun = false) => {
    const dbSpec = getDatabaseSpec(modelRegistry);
    const newSecret =
      databasePassword && dbSpec
        ? await createDatabasePasswordSecret(
            fastify,
            modelRegistry,
            modelRegistryNamespace,
            databasePassword,
            dryRun,
          )
        : undefined;
    return createModelRegistry(fastify, modelRegistry, modelRegistryNamespace, newSecret, dryRun);
  };
  // Dry run both MR and Secret creation first so there are no changes if either would fail
  const dryRunResult = await createBoth(true);
  if (dryRunOnly) {
    return dryRunResult;
  }
  return createBoth();
};

export const getModelRegistry = async (
  fastify: KubeFastifyInstance,
  modelRegistryName: string,
  modelRegistryNamespace: string,
): Promise<ModelRegistryKind> => {
  const response = await (fastify.kube.customObjectsApi.getNamespacedCustomObject(
    MODEL_REGISTRY_API_GROUP,
    MODEL_REGISTRY_API_VERSION,
    modelRegistryNamespace,
    MODEL_REGISTRY_PLURAL,
    modelRegistryName,
    // getNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: ModelRegistryKind }>);
  return response.body;
};

const getDatabasePasswordSecret = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
): Promise<{ secret?: V1Secret; passwordDataKey?: string }> => {
  const secretRef = getDatabaseSpec(modelRegistry)?.passwordSecret;
  if (!secretRef) {
    return {};
  }
  const response = await fastify.kube.coreV1Api.readNamespacedSecret(
    secretRef.name,
    modelRegistryNamespace,
  );
  return { secret: response.body, passwordDataKey: secretRef.key };
};

export const getDatabasePassword = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
): Promise<string | undefined> => {
  const { secret, passwordDataKey } = await getDatabasePasswordSecret(
    fastify,
    modelRegistry,
    modelRegistryNamespace,
  );
  return base64decode(secret.data[passwordDataKey]);
};

const deleteDatabasePasswordSecret = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
  dryRun = false,
): Promise<V1Status | undefined> => {
  let existingSecret: V1Secret | undefined;
  try {
    existingSecret = (
      await getDatabasePasswordSecret(fastify, modelRegistry, modelRegistryNamespace)
    ).secret;
  } catch (e) {
    // If the secret doesn't exist, don't try to delete and cause a 404 error, just do nothing.
    // The user may have deleted their own secret and we don't want to block deleting the model registry.
    return;
  }
  const response = await fastify.kube.coreV1Api.deleteNamespacedSecret(
    existingSecret.metadata.name,
    modelRegistryNamespace,
    undefined,
    dryRun ? 'All' : undefined,
  );
  return response.body;
};

const patchModelRegistry = async (
  fastify: KubeFastifyInstance,
  modelRegistryName: string,
  modelRegistryNamespace: string,
  patchBody: RecursivePartial<ModelRegistryKind>,
  dryRun = false,
): Promise<ModelRegistryKind> => {
  const response = await (fastify.kube.customObjectsApi.patchNamespacedCustomObject(
    MODEL_REGISTRY_API_GROUP,
    MODEL_REGISTRY_API_VERSION,
    modelRegistryNamespace,
    MODEL_REGISTRY_PLURAL,
    modelRegistryName,
    patchBody,
    dryRun ? 'All' : undefined,
    undefined,
    undefined,
    { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } },
    // patchNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: ModelRegistryKind }>);
  return response.body;
};

const updateDatabasePassword = async (
  fastify: KubeFastifyInstance,
  modelRegistry: ModelRegistryKind,
  modelRegistryNamespace: string,
  databasePassword?: string,
  dryRun = false,
): Promise<void> => {
  const { secret, passwordDataKey } = await getDatabasePasswordSecret(
    fastify,
    modelRegistry,
    modelRegistryNamespace,
  );
  if (!secret) {
    return;
  }
  if (databasePassword) {
    await fastify.kube.coreV1Api.patchNamespacedSecret(
      secret.metadata.name,
      modelRegistryNamespace,
      {
        data: {
          ...secret.data,
          [passwordDataKey]: base64encode(databasePassword),
        },
      },
      undefined,
      dryRun ? 'All' : undefined,
      undefined,
      undefined,
      { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } },
    );
  } else {
    await deleteDatabasePasswordSecret(fastify, modelRegistry, modelRegistryNamespace);
  }
};

export const patchModelRegistryAndUpdateCredentials = async (
  fastify: KubeFastifyInstance,
  modelRegistryName: string,
  modelRegistryNamespace: string,
  patchBody: RecursivePartial<ModelRegistryKind>,
  databasePassword?: string,
  newDatabaseCACertificate?: string,
  dryRunOnly = false,
): Promise<ModelRegistryKind> => {
  let newCACertificateConfigMap: { name: string; key: string };
  if (newDatabaseCACertificate) {
    const newConfigMap = await createConfigMapForCACertficate(
      fastify,
      modelRegistryNamespace,
      patchBody.spec.mysql.sslRootCertificateConfigMap.name,
      newDatabaseCACertificate,
    );

    newCACertificateConfigMap = {
      name: newConfigMap.metadata.name,
      key: Object.keys(newConfigMap.data || {})[0],
    };

    if (patchBody.spec.mysql) {
      patchBody.spec.mysql.sslRootCertificateConfigMap = newCACertificateConfigMap;
    }
  }

  const patchBoth = async (dryRun = false) => {
    const modelRegistry = await patchModelRegistry(
      fastify,
      modelRegistryName,
      modelRegistryNamespace,
      patchBody,
      dryRun,
    );
    await updateDatabasePassword(
      fastify,
      modelRegistry,
      modelRegistryNamespace,
      databasePassword,
      dryRun,
    );
    return modelRegistry;
  };
  // Dry run both patches first so there are no changes if either would fail
  const dryRunResult = await patchBoth(true);
  if (dryRunOnly) {
    return dryRunResult;
  }
  return patchBoth();
};

export const deleteModelRegistryAndSecret = async (
  fastify: KubeFastifyInstance,
  modelRegistryName: string,
  modelRegistryNamespace: string,
  dryRunOnly = false,
): Promise<V1Status> => {
  const modelRegistry = await getModelRegistry(fastify, modelRegistryName, modelRegistryNamespace);
  const deleteBoth = async (dryRun = false) => {
    const response = await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
      MODEL_REGISTRY_API_GROUP,
      MODEL_REGISTRY_API_VERSION,
      modelRegistryNamespace,
      MODEL_REGISTRY_PLURAL,
      modelRegistryName,
      undefined,
      undefined,
      undefined,
      dryRun ? 'All' : undefined,
    );
    await deleteDatabasePasswordSecret(fastify, modelRegistry, modelRegistryNamespace);
    return response.body;
  };
  // Dry run both deletes first so there are no changes if either would fail
  const dryRunResult = await deleteBoth(true);
  if (dryRunOnly) {
    return dryRunResult;
  }
  return deleteBoth();
};
