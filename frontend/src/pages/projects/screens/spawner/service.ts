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

export const createConfigMapsAndSecretsForNotebook = async (
  projectName: string,
  envVariables: EnvVariable[],
): Promise<EnvFromSourceType[]> => {
  const customConfigMapData: Record<string, string> = {};
  const customSecretData: Record<string, string> = {};

  envVariables.forEach((envVariable) => {
    if (envVariable.type === EnvironmentVariableTypes.configMap) {
      if (envVariable.values.category === ConfigMapCategories.keyValue) {
        envVariable.values.data.forEach(({ key, value }) => (customConfigMapData[key] = value));
      }
    } else if (envVariable.type === EnvironmentVariableTypes.secret) {
      if (envVariable.values.category === SecretCategories.keyValue) {
        envVariable.values.data.forEach(({ key, value }) => (customSecretData[key] = value));
      }
    }
  });

  const envFrom: EnvFromSourceType[] = [];

  if (Object.keys(customConfigMapData).length !== 0) {
    const customConfigMap = assembleConfigMap(projectName, customConfigMapData);
    const configMap = await createConfigMap(customConfigMap);
    envFrom.push({ configMapRef: { name: configMap.metadata.name } });
  }

  if (Object.keys(customSecretData).length !== 0) {
    const customSecret = assembleSecret(projectName, customSecretData);
    const secret = await createSecret(customSecret);
    envFrom.push({ secretRef: { name: secret.metadata.name } });
  }

  return envFrom;
};
