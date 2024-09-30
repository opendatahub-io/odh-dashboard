// NGC stands for NVIDIA GPU Cloud.

import { ProjectKind, SecretKind, TemplateKind } from '~/k8sTypes';
import { getTemplate } from '~/api';

const NIM_SECRET_NAME = 'nvidia-nim-access';
const NIM_NGC_SECRET_NAME = 'nvidia-nim-image-pull';

export const getNGCSecretType = (isNGC: boolean): string =>
  isNGC ? 'kubernetes.io/dockerconfigjson' : 'Opaque';

export const getNIMResource = async (resourceName: string): Promise<SecretKind> => {
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
  const TEMPLATE_NAME = 'nvidia-nim-serving-template';

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
  const TEMPLATE_NAME = 'nvidia-nim-serving-template';
  try {
    const template = await getTemplate(TEMPLATE_NAME, dashboardNamespace);
    return template;
  } catch (error) {
    return undefined;
  }
};
