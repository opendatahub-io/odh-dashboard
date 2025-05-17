import * as _ from 'lodash-es';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  assembleConfigMap,
  assembleSecret,
  createConfigMap,
  createPvc,
  createSecret,
  deleteConfigMap,
  deleteSecret,
  replaceConfigMap,
  replaceSecret,
  updatePvc,
} from '~/api';
import { Volume, VolumeMount } from '~/types';
import {
  ConfigMapCategory,
  EnvironmentFromVariable,
  EnvVariable,
  SecretCategory,
  StorageData,
  StorageType,
} from '~/pages/projects/types';
import { ROOT_MOUNT_PATH } from '~/pages/projects/pvc/const';
import { Connection } from '~/concepts/connectionTypes/types';
import { ConfigMapKind, NotebookKind, PersistentVolumeClaimKind, SecretKind } from '~/k8sTypes';
import { isPvcUpdateRequired } from '~/pages/projects/screens/detail/storage/utils';
import { fetchNotebookEnvVariables } from './environmentVariables/useNotebookEnvVariables';
import { getDeletedConfigMapOrSecretVariables } from './environmentVariables/utils';

export const createPvcDataForNotebook = async (
  projectName: string,
  storageData: StorageData,
  dryRun?: boolean,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[] }> => {
  const volumes: Volume[] = [];
  const volumeMounts: VolumeMount[] = [];

  if (storageData.storageType === StorageType.NEW_PVC) {
    const pvc = await createPvc(storageData, projectName, { dryRun });
    const { name } = pvc.metadata;

    volumes.push({ name, persistentVolumeClaim: { claimName: name } });
    volumeMounts.push({ mountPath: storageData.mountPath || ROOT_MOUNT_PATH, name });
  }

  return { volumes, volumeMounts };
};

export const updatePvcDataForNotebook = async (
  projectName: string,
  storageData: StorageData,
  existingPvc: PersistentVolumeClaimKind | undefined,
  dryRun?: boolean,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[] }> => {
  const volumes: Volume[] = [];
  const volumeMounts: VolumeMount[] = [];

  if (existingPvc && storageData.storageType === StorageType.EXISTING_PVC) {
    if (isPvcUpdateRequired(existingPvc, storageData)) {
      await updatePvc(storageData, existingPvc, projectName, { dryRun }, true);
    }
    const { name } = existingPvc.metadata;

    volumes.push({ name, persistentVolumeClaim: { claimName: name } });
    volumeMounts.push({ mountPath: storageData.mountPath || ROOT_MOUNT_PATH, name });
  }

  return { volumes, volumeMounts };
};

const getPromisesForConfigMapsAndSecrets = (
  projectName: string,
  envVariables: EnvVariable[],
  type: 'create' | 'update',
  dryRun = false,
): Promise<SecretKind | ConfigMapKind>[] =>
  envVariables
    .map<Promise<SecretKind | ConfigMapKind> | null>((envVar) => {
      if (!envVar.values) {
        return null;
      }

      const dataAsRecord = envVar.values.data.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      );

      switch (envVar.values.category) {
        case SecretCategory.GENERIC:
        case SecretCategory.UPLOAD:
          return type === 'create'
            ? createSecret(assembleSecret(projectName, dataAsRecord), { dryRun })
            : replaceSecret(
                assembleSecret(projectName, dataAsRecord, 'generic', envVar.existingName),
                { dryRun },
              );
        case SecretCategory.AWS:
          return type === 'create'
            ? createSecret(assembleSecret(projectName, dataAsRecord, 'aws'), { dryRun })
            : replaceSecret(assembleSecret(projectName, dataAsRecord, 'aws', envVar.existingName), {
                dryRun,
              });
        case ConfigMapCategory.GENERIC:
        case ConfigMapCategory.UPLOAD:
          return type === 'create'
            ? createConfigMap(assembleConfigMap(projectName, dataAsRecord), { dryRun })
            : replaceConfigMap(assembleConfigMap(projectName, dataAsRecord, envVar.existingName), {
                dryRun,
              });
        default:
          return null;
      }
    })
    .filter((v): v is Promise<SecretKind | ConfigMapKind> => !!v);

const getEnvFromList = (
  resources: (ConfigMapKind | SecretKind)[],
  initialList: EnvironmentFromVariable[],
): EnvironmentFromVariable[] =>
  resources.reduce<EnvironmentFromVariable[]>((acc, resource) => {
    let envFrom;
    if (resource.kind === 'Secret') {
      envFrom = {
        secretRef: {
          name: resource.metadata.name,
        },
      };
    } else if (resource.kind === 'ConfigMap') {
      envFrom = {
        configMapRef: {
          name: resource.metadata.name,
        },
      };
    } else {
      return acc;
    }
    return [...acc, envFrom];
  }, initialList);

export const createConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  envVariables: EnvVariable[],
  dryRun?: boolean,
): Promise<EnvironmentFromVariable[]> => {
  const creatingPromises = getPromisesForConfigMapsAndSecrets(
    projectName,
    envVariables,
    'create',
    dryRun,
  );

  return Promise.all(creatingPromises)
    .then((results: (ConfigMapKind | SecretKind)[]) => getEnvFromList(results, []))
    .catch((e) => {
      /* eslint-disable-next-line no-console */
      console.error('Creating environment variables failed: ', e);
      throw e;
    });
};

export const updateConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  notebook: NotebookKind,
  envVariables: EnvVariable[],
  connections?: Connection[],
  dryRun = false,
): Promise<EnvironmentFromVariable[]> => {
  const existingEnvVars = await fetchNotebookEnvVariables(notebook);
  const { deletedConfigMaps, deletedSecrets } = getDeletedConfigMapOrSecretVariables(
    notebook,
    existingEnvVars,
    [...(connections || []).map((connection) => connection.metadata.name)],
  );

  const [oldResources, newResources] = _.partition(envVariables, (envVar) => envVar.existingName);
  const currentNames = oldResources
    .map((envVar) => envVar.existingName)
    .filter((v): v is string => !!v);

  const removeResources = existingEnvVars.filter(
    (envVar) => envVar.existingName && !currentNames.includes(envVar.existingName),
  );

  const [typeChangeResources, updateResources] = _.partition(oldResources, (envVar) =>
    existingEnvVars.find(
      (existingEnvVar) =>
        existingEnvVar.existingName === envVar.existingName &&
        existingEnvVar.values?.category !== envVar.values?.category,
    ),
  );

  const deleteResources = [...removeResources, ...typeChangeResources];
  // will only delete generic files here when updating because we only map them
  const deletingPromises = deleteResources
    .map((envVar) => {
      if (!envVar.existingName) {
        return null;
      }
      switch (envVar.values?.category) {
        case SecretCategory.GENERIC:
          return deleteSecret(projectName, envVar.existingName, { dryRun });
        case ConfigMapCategory.GENERIC:
          return deleteConfigMap(projectName, envVar.existingName, { dryRun });
        default:
          return null;
      }
    })
    .filter((v): v is Promise<K8sStatus> => !!v);
  const creatingPromises = getPromisesForConfigMapsAndSecrets(
    projectName,
    [...newResources, ...typeChangeResources],
    'create',
    dryRun,
  );

  const updatingPromises = getPromisesForConfigMapsAndSecrets(
    projectName,
    updateResources,
    'update',
    dryRun,
  );

  const [created] = await Promise.all([
    Promise.all(creatingPromises),
    Promise.all(deletingPromises),
    Promise.all(updatingPromises),
  ]);

  const deletingNames = deleteResources.map((resource) => resource.existingName || '');
  deletingNames.push(...deletedSecrets, ...deletedConfigMaps);

  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];

  return getEnvFromList(created, [...envFromList]).filter(
    (envFrom) =>
      !(envFrom.secretRef?.name && deletingNames.includes(envFrom.secretRef.name)) &&
      !(envFrom.configMapRef?.name && deletingNames.includes(envFrom.configMapRef.name)),
  );
};
