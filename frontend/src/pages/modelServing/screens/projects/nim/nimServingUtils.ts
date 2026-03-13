import { ConfigMapKind, PersistentVolumeClaimKind, SecretKind } from '#~/k8sTypes';
import { createPvc, createSecret } from '#~/api';
import { getNIMData, getNIMResource } from '#~/pages/modelServing/screens/projects/nim/nimUtils';

export interface ModelInfo {
  name: string;
  displayName: string;
  shortDescription: string;
  namespace: string;
  tags: string[];
  latestTag: string;
  updatedDate: string;
  registry?: string;
}

export const fetchNIMModelNames = async (): Promise<ModelInfo[] | undefined> => {
  const configMap = await getNIMResource<ConfigMapKind>('nimConfig');
  if (configMap.data && Object.keys(configMap.data).length > 0) {
    const modelInfos: ModelInfo[] = [];
    for (const [key, value] of Object.entries(configMap.data)) {
      // Skip non-model entries (air-gapped configuration fields)
      if (key === 'registry' || key === 'imagePullSecret') {
        continue;
      }

      try {
        const modelData = JSON.parse(value);
        modelInfos.push({
          name: key,
          displayName: modelData.displayName,
          shortDescription: modelData.shortDescription,
          namespace: modelData.namespace,
          tags: modelData.tags,
          latestTag: modelData.latestTag,
          updatedDate: modelData.updatedDate,
          registry: modelData.registry,
        });
      } catch (error) {
        throw new Error(`Failed to parse model data for key "${key}".`);
      }
    }

    return modelInfos.length > 0 ? modelInfos : undefined;
  }
  return undefined;
};

export const createNIMSecret = async (
  projectName: string,
  secretKey: string,
  isNGC: boolean,
  dryRun: boolean,
  isAirGapped = false,
): Promise<SecretKind> => {
  try {
    let data;

    if (isAirGapped) {
      if (isNGC) {
        data = {
          '.dockerconfigjson': btoa(
            JSON.stringify({
              auths: {
                'nvcr.io': {
                  username: '$oauthtoken',
                  password: 'air-gapped-placeholder',
                  auth: btoa('$oauthtoken:air-gapped-placeholder'),
                },
              },
            }),
          ),
        };
      } else {
        data = {
          NGC_API_KEY: btoa('air-gapped-placeholder-key'),
        };
      }
    } else {
      data = await getNIMData(secretKey, isNGC);
    }

    const newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: isNGC ? 'ngc-secret' : 'nvidia-nim-secrets',
        namespace: projectName,
      },
      data,
      type: isNGC ? 'kubernetes.io/dockerconfigjson' : 'Opaque',
    };

    return await createSecret(newSecret, { dryRun });
  } catch (e) {
    return Promise.reject(new Error(`Error creating ${isNGC ? 'NGC' : 'NIM'} secret`));
  }
};

export const createNIMPVC = (
  projectName: string,
  pvcName: string,
  pvcSize: string,
  dryRun: boolean,
  storageClassName: string,
): Promise<PersistentVolumeClaimKind> =>
  createPvc(
    {
      name: pvcName,
      description: '',
      size: pvcSize,
      storageClassName,
    },
    projectName,
    { dryRun },
    true,
    undefined,
    {
      'opendatahub.io/managed': 'true',
    },
  );
