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
  ConfigMapCategories,
  EnvFromSourceType,
  EnvironmentVariableTypes,
  EnvVariable,
  SecretCategories,
  StorageData,
  StorageType,
} from '../../types';
import { getVolumesByStorageData } from './spawnerUtils';
import { ROOT_MOUNT_PATH } from '../../pvc/const';

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

const mapKeyValueToData = (
  data: {
    key: string;
    value: string;
  }[],
): Record<string, string> => {
  const newData: Record<string, string> = {};
  data.forEach(({ key, value }) => (newData[key] = value));
  return newData;
};

export const createConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  envVariables: EnvVariable[],
): Promise<EnvFromSourceType[]> => {
  const creatingPromises = envVariables.map((envVariable) => {
    if (envVariable.type === EnvironmentVariableTypes.configMap) {
      if (envVariable.values.category === ConfigMapCategories.keyValue) {
        const configMapData = assembleConfigMap(
          projectName,
          mapKeyValueToData(envVariable.values.data),
        );
        return createConfigMap(configMapData);
      }
    } else if (envVariable.type === EnvironmentVariableTypes.secret) {
      const secretMapData = assembleSecret(
        projectName,
        mapKeyValueToData(envVariable.values.data),
        envVariable.values.category === SecretCategories.aws ? 'aws' : undefined,
      );
      return createSecret(secretMapData);
    }
    return Promise.resolve(null);
  });

  const results = await Promise.all(creatingPromises).catch((e) => {
    console.error('Creating environment variables failed: ', e);
  });

  const envFrom: EnvFromSourceType[] = [];

  if (results) {
    results.forEach((cmOrSecret) => {
      if (cmOrSecret?.kind === 'Secret') {
        envFrom.push({
          secretRef: {
            name: cmOrSecret.metadata.name,
          },
        });
      } else if (cmOrSecret?.kind === 'ConfigMap') {
        envFrom.push({
          configMapRef: {
            name: cmOrSecret.metadata.name,
          },
        });
      }
    });
  }

  return envFrom;
};
