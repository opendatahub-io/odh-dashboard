import * as _ from 'lodash';
import {
  assembleConfigMap,
  assemblePvc,
  assembleSecret,
  createConfigMap,
  createPvc,
  createSecret,
  deleteConfigMap,
  deleteSecret,
  replaceConfigMap,
  replaceSecret,
} from '../../../../api';
import { Volume, VolumeMount } from '../../../../types';
import {
  ConfigMapCategory,
  EnvironmentFromVariable,
  EnvVariable,
  SecretCategory,
  StorageData,
  StorageType,
} from '../../types';
import { getVolumesByStorageData } from './spawnerUtils';
import { ROOT_MOUNT_PATH } from '../../pvc/const';
import { ConfigMapKind, K8sStatus, NotebookKind, SecretKind } from '../../../../k8sTypes';
import { fetchNotebookEnvVariables } from './environmentVariables/useNotebookEnvVariables';

export const createPvcDataForNotebook = async (
  projectName: string,
  storageData: StorageData,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[] }> => {
  const {
    storageType,
    creating: {
      nameDesc: { name: pvcName, description: pvcDescription },
      size,
    },
  } = storageData;

  const { volumes, volumeMounts } = getVolumesByStorageData(storageData);

  if (storageType === StorageType.NEW_PVC) {
    const pvcData = assemblePvc(pvcName, projectName, pvcDescription, size);
    const pvc = await createPvc(pvcData);
    const newPvcName = pvc.metadata.name;
    volumes.push({ name: newPvcName, persistentVolumeClaim: { claimName: newPvcName } });
    volumeMounts.push({ mountPath: ROOT_MOUNT_PATH, name: newPvcName });
  }
  return { volumes, volumeMounts };
};

export const replaceRootVolumesForNotebook = async (
  projectName: string,
  notebook: NotebookKind,
  storageData: StorageData,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[] }> => {
  const {
    storageType,
    creating: {
      nameDesc: { name: creatingName, description },
      size,
    },
    existing: { storage: existingName },
  } = storageData;

  const oldVolumes = notebook.spec.template.spec.volumes || [];
  const oldVolumeMounts = notebook.spec.template.spec.containers[0].volumeMounts || [];

  let replacedVolume: Volume;
  let replacedVolumeMount: VolumeMount;

  if (storageType === StorageType.EXISTING_PVC) {
    replacedVolume = {
      name: existingName,
      persistentVolumeClaim: { claimName: existingName },
    };
    replacedVolumeMount = { name: existingName, mountPath: ROOT_MOUNT_PATH };
  } else {
    const pvcData = assemblePvc(creatingName, projectName, description, size);
    const pvc = await createPvc(pvcData);
    const newPvcName = pvc.metadata.name;
    replacedVolume = { name: newPvcName, persistentVolumeClaim: { claimName: newPvcName } };
    replacedVolumeMount = { mountPath: ROOT_MOUNT_PATH, name: newPvcName };
  }

  const rootVolumeMount = oldVolumeMounts.find(
    (volumeMount) => volumeMount.mountPath === ROOT_MOUNT_PATH,
  );

  // if no root, add the replaced one as the root
  if (!rootVolumeMount) {
    return {
      volumes: [...oldVolumes, replacedVolume],
      volumeMounts: [...oldVolumeMounts, replacedVolumeMount],
    };
  }

  const volumes = oldVolumes.map((volume) =>
    volume.name === rootVolumeMount.name ? replacedVolume : volume,
  );
  const volumeMounts = oldVolumeMounts.map((volumeMount) =>
    volumeMount.name === rootVolumeMount.name ? replacedVolumeMount : volumeMount,
  );

  return { volumes, volumeMounts };
};

const getPromisesForConfigMapsAndSecrets = (
  projectName: string,
  envVariables: EnvVariable[],
  type: 'create' | 'update',
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
          return type === 'create'
            ? createSecret(assembleSecret(projectName, dataAsRecord))
            : replaceSecret(
                assembleSecret(projectName, dataAsRecord, 'generic', envVar.existingName),
              );
        case ConfigMapCategory.GENERIC:
        case ConfigMapCategory.UPLOAD:
          return type === 'create'
            ? createConfigMap(assembleConfigMap(projectName, dataAsRecord))
            : replaceConfigMap(assembleConfigMap(projectName, dataAsRecord, envVar.existingName));
        case SecretCategory.AWS:
          return type === 'create'
            ? createSecret(assembleSecret(projectName, dataAsRecord, 'aws'))
            : replaceSecret(assembleSecret(projectName, dataAsRecord, 'aws', envVar.existingName));
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
): Promise<EnvironmentFromVariable[]> => {
  const creatingPromises = getPromisesForConfigMapsAndSecrets(projectName, envVariables, 'create');

  return Promise.all(creatingPromises)
    .then((results: (ConfigMapKind | SecretKind)[]) => getEnvFromList(results, []))
    .catch((e) => {
      console.error('Creating environment variables failed: ', e);
      throw e;
    });
};

export const updateConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  notebook: NotebookKind,
  envVariables: EnvVariable[],
): Promise<EnvironmentFromVariable[]> => {
  const existingEnvVars = await fetchNotebookEnvVariables(notebook);
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
          return deleteSecret(projectName, envVar.existingName);
        case ConfigMapCategory.GENERIC:
          return deleteConfigMap(projectName, envVar.existingName);
        default:
          return null;
      }
    })
    .filter((v): v is Promise<K8sStatus> => !!v);
  const creatingPromises = getPromisesForConfigMapsAndSecrets(
    projectName,
    [...newResources, ...typeChangeResources],
    'create',
  );
  const updatingPromises = getPromisesForConfigMapsAndSecrets(
    projectName,
    updateResources,
    'update',
  );

  const [created] = await Promise.all([
    Promise.all(creatingPromises),
    Promise.all(deletingPromises),
    Promise.all(updatingPromises),
  ]);

  const deletingNames = deleteResources.map((resource) => resource.existingName || '');

  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];

  return getEnvFromList(created, envFromList).filter(
    (envFrom) =>
      !(envFrom.secretRef?.name && deletingNames.includes(envFrom.secretRef?.name)) &&
      !(envFrom.configMapRef?.name && deletingNames.includes(envFrom.configMapRef?.name)),
  );
};
