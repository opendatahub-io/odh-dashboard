import {
  assemblePvc,
  createPvc,
  createConfigMap,
  createSecret,
  assembleConfigMap,
  assembleSecret,
} from '../../../../api';
import { Volume, VolumeMount } from '../../../../types';
import {
  StorageData,
  EnvFromSourceType,
  EnvVariable,
  EnvironmentVariableTypes,
  ConfigMapCategories,
  SecretCategories,
} from '../../types';
import { getVolumesByStorageData } from './spawnerUtils';

export const createPvcDataForNotebook = async (
  projectName: string,
  storageData: StorageData,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[] }> => {
  const { storageType, creating } = storageData;
  const {
    nameDesc: { name: pvcName, description: pvcDescription },
    size,
  } = creating;
  const { volumes, volumeMounts } = getVolumesByStorageData(storageData);
  if (storageType === 'persistent' && creating.enabled) {
    const pvcData = assemblePvc(pvcName, projectName, pvcDescription, size);
    const pvc = await createPvc(pvcData);
    const newPvcName = pvc.metadata.name;
    volumes.push({ name: newPvcName, persistentVolumeClaim: { claimName: newPvcName } });
    volumeMounts.push({ mountPath: '/opt/app-root/src', name: newPvcName });
  }
  return { volumes, volumeMounts };
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
      if (envVariable.values.category === SecretCategories.keyValue) {
        const secretMapData = assembleSecret(
          projectName,
          mapKeyValueToData(envVariable.values.data),
        );
        return createSecret(secretMapData);
      }
    }
    return Promise.resolve(null);
  });

  const envFrom: EnvFromSourceType[] = [];

  await Promise.all(creatingPromises)
    .then((result) =>
      result.forEach((cmOrSecret) => {
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
      }),
    )
    .catch((e) => {
      console.error('Creating environment variables failed: ', e);
    });

  return envFrom;
};
