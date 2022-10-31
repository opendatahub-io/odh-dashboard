import {
  assembleConfigMap,
  assemblePvc,
  assembleSecret,
  createConfigMap,
  createPvc,
  createSecret,
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
import { ConfigMapKind, SecretKind } from '../../../../k8sTypes';

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

export const createConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  envVariables: EnvVariable[],
): Promise<EnvironmentFromVariable[]> => {
  const creatingPromises = envVariables
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
          return createSecret(assembleSecret(projectName, dataAsRecord));
        case ConfigMapCategory.GENERIC:
        case ConfigMapCategory.UPLOAD:
          return createConfigMap(assembleConfigMap(projectName, dataAsRecord));
        case SecretCategory.AWS:
          return createSecret(assembleSecret(projectName, dataAsRecord, 'aws'));
        default:
          return null;
      }
    })
    .filter((v): v is Promise<SecretKind | ConfigMapKind> => !!v);

  return Promise.all(creatingPromises)
    .then((results: (ConfigMapKind | SecretKind)[]) => {
      return results.reduce<EnvironmentFromVariable[]>((acc, resource) => {
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
      }, []);
    })
    .catch((e) => {
      console.error('Creating environment variables failed: ', e);
      throw e;
    });
};
