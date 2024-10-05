// NGC stands for NVIDIA GPU Cloud.

import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectKind, SecretKind, ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { getTemplate } from '~/api';

const NIM_SECRET_NAME = 'nvidia-nim-access';
const NIM_NGC_SECRET_NAME = 'nvidia-nim-image-pull';
const TEMPLATE_NAME = 'nvidia-nim-serving-template';

export const getNGCSecretType = (isNGC: boolean): string =>
  isNGC ? 'kubernetes.io/dockerconfigjson' : 'Opaque';

export const getNIMResource = async <T extends K8sResourceCommon = SecretKind>(
  resourceName: string,
): Promise<T> => {
  try {
    const response = await fetch(`/api/nim-serving/${resourceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching secret: ${response.statusText}`);
    }
    const resourceData = await response.json();
    return resourceData.body;
  } catch (error) {
    throw new Error(`Failed to fetch the resource: ${resourceName}.`);
  }
};
export const getNIMData = async (isNGC: boolean): Promise<Record<string, string> | undefined> => {
  const nimSecretData: SecretKind = isNGC
    ? await getNIMResource(NIM_NGC_SECRET_NAME)
    : await getNIMResource(NIM_SECRET_NAME);

  if (!nimSecretData.data) {
    throw new Error(`Error retrieving NIM ${isNGC ? 'NGC' : ''} secret data`);
  }

  const data: Record<string, string> = {};
  if (!isNGC) {
    data.NGC_API_KEY = nimSecretData.data.api_key;
  } else {
    data['.dockerconfigjson'] = nimSecretData.data['.dockerconfigjson'];
  }
  return data;
};

export const isProjectNIMSupported = (currentProject: ProjectKind): boolean => {
  const isModelMeshDisabled = currentProject.metadata.labels?.['modelmesh-enabled'] === 'false';
  const hasNIMSupportAnnotation =
    currentProject.metadata.annotations?.['opendatahub.io/nim-support'] === 'true';

  return isModelMeshDisabled && hasNIMSupportAnnotation;
};

export const isNIMServingRuntimeTemplateAvailable = async (
  dashboardNamespace: string,
): Promise<boolean> => {
  try {
    await getTemplate(TEMPLATE_NAME, dashboardNamespace);
    return true;
  } catch (error) {
    return false;
  }
};

export const getNIMServingRuntimeTemplate = async (
  dashboardNamespace: string,
): Promise<TemplateKind | undefined> => {
  try {
    const template = await getTemplate(TEMPLATE_NAME, dashboardNamespace);
    return template;
  } catch (error) {
    return undefined;
  }
};

export const updateServingRuntimeTemplate = (
  servingRuntime: ServingRuntimeKind,
  pvcName: string,
): ServingRuntimeKind => {
  const updatedServingRuntime = { ...servingRuntime };

  updatedServingRuntime.spec.containers = updatedServingRuntime.spec.containers.map((container) => {
    if (container.volumeMounts) {
      const updatedVolumeMounts = container.volumeMounts.map((volumeMount) => {
        if (volumeMount.mountPath === '/mnt/models/cache') {
          return {
            ...volumeMount,
            name: pvcName,
          };
        }
        return volumeMount;
      });

      return {
        ...container,
        volumeMounts: updatedVolumeMounts,
      };
    }
    return container;
  });

  if (updatedServingRuntime.spec.volumes) {
    const updatedVolumes = updatedServingRuntime.spec.volumes.map((volume) => {
      if (volume.name === 'nim-pvc') {
        return {
          ...volume,
          name: pvcName,
          persistentVolumeClaim: {
            claimName: pvcName,
          },
        };
      }
      return volume;
    });

    updatedServingRuntime.spec.volumes = updatedVolumes;
  }
  return updatedServingRuntime;
};
