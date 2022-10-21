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
  EnvFromSourceType,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
  StorageData,
  StorageType,
} from '../../types';
import { getVolumesByStorageData } from './spawnerUtils';
import { ROOT_MOUNT_PATH } from '../../pvc/const';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapKind, SecretKind } from '../../../../k8sTypes';

export const createPvcDataForNotebook = async (
  projectName: string,
  storageData: StorageData,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[]; associatedPVCName: string }> => {
  const {
    storageType,
    creating: {
      nameDesc: { name: pvcName, description: pvcDescription },
      size,
    },
  } = storageData;
  let k8sPvcName = '';

  const { volumes, volumeMounts } = getVolumesByStorageData(storageData);

  if (storageType === StorageType.NEW_PVC) {
    const pvcData = assemblePvc(pvcName, projectName, pvcDescription, size);
    k8sPvcName = pvcData.metadata.name;
    const pvc = await createPvc(pvcData);
    const newPvcName = pvc.metadata.name;
    volumes.push({ name: newPvcName, persistentVolumeClaim: { claimName: newPvcName } });
    volumeMounts.push({ mountPath: ROOT_MOUNT_PATH, name: newPvcName });
  } else if (storageType === StorageType.EXISTING_PVC) {
    k8sPvcName = storageData.existing.storage;
  }
  return { volumes, volumeMounts, associatedPVCName: k8sPvcName };
};

export const createConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  envVariables: EnvVariable[],
): Promise<EnvFromSourceType[]> => {
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
          return createConfigMap(assembleConfigMap(projectName, dataAsRecord));
        case SecretCategory.AWS:
          return createSecret(assembleSecret(projectName, dataAsRecord, 'aws'));
        case ConfigMapCategory.UPLOAD:
        default:
          return null;
      }
    })
    .filter((v): v is Promise<SecretKind | ConfigMapKind> => !!v);

  return Promise.all(creatingPromises)
    .then((results: (ConfigMapKind | SecretKind)[]) => {
      return results.reduce<EnvFromSourceType[]>((acc, resource) => {
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
