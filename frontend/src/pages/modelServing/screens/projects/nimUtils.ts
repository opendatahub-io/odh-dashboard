// NGC stands for NVIDIA GPU Cloud.

import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectKind, SecretKind, ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { deletePvc, deleteSecret, getTemplate, listAccounts } from '~/api';
import { fetchInferenceServiceCount } from '~/pages/modelServing/screens/projects/utils';
import { NIMAccountConstants } from '~/types';

export const getNGCSecretType = (isNGC: boolean): string =>
  isNGC ? 'kubernetes.io/dockerconfigjson' : 'Opaque';

export const getNIMResource = async <T extends K8sResourceCommon = SecretKind>(
  resourceRef: string,
): Promise<T> => {
  try {
    const response = await fetch(`/api/nim-serving/${resourceRef}`, {
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
    throw new Error(`Failed to fetch the resource: ${resourceRef}.`);
  }
};

export const getNIMData = async (
  secretKey: string,
  isNGC: boolean,
): Promise<Record<string, string> | undefined> => {
  const nimSecretData = await getNIMResource(secretKey);

  if (!nimSecretData.data) {
    throw new Error(`Error retrieving ${isNGC ? 'NGC' : 'NIM'} secret data`);
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
    const constants = await fetchNIMAccountConstants(dashboardNamespace);
    if (!constants) {
      // eslint-disable-next-line no-console
      console.error('No NIM account constants available.');
      return false;
    }
    const { templateName } = constants;
    await getTemplate(templateName, dashboardNamespace);
    return true;
  } catch (error) {
    return false;
  }
};

export const getNIMServingRuntimeTemplate = async (
  dashboardNamespace: string,
  templateName: string,
): Promise<TemplateKind | undefined> => {
  try {
    const template = await getTemplate(templateName, dashboardNamespace);
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
      if (volume.name.startsWith('nim-pvc')) {
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

export const getNIMResourcesToDelete = async (
  projectName: string,
  servingRuntime: ServingRuntimeKind,
): Promise<Promise<void>[]> => {
  const resourcesToDelete: Promise<void>[] = [];

  let inferenceCount = 0;

  try {
    inferenceCount = await fetchInferenceServiceCount(projectName);
  } catch (error) {
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(
        `Failed to fetch inference service count for project "${projectName}": ${error.message}`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.error(
        `Failed to fetch inference service count for project "${projectName}": ${String(error)}`,
      );
    }
  }

  const pvcName = servingRuntime.spec.volumes?.find((vol) =>
    vol.persistentVolumeClaim?.claimName.startsWith('nim-pvc'),
  )?.persistentVolumeClaim?.claimName;

  if (pvcName) {
    resourcesToDelete.push(deletePvc(pvcName, projectName).then(() => undefined));
  }

  let nimSecretName: string | undefined;
  let imagePullSecretName: string | undefined;

  const pullNGCSecret = servingRuntime.spec.imagePullSecrets?.[0]?.name ?? '';
  if (pullNGCSecret === 'ngc-secret') {
    imagePullSecretName = pullNGCSecret;
  }

  servingRuntime.spec.containers.forEach((container) => {
    container.env?.forEach((env) => {
      const secretName = env.valueFrom?.secretKeyRef?.name;
      if (secretName === 'nvidia-nim-secrets') {
        nimSecretName = secretName;
      }
    });
  });

  if (nimSecretName && imagePullSecretName && inferenceCount === 1) {
    resourcesToDelete.push(
      deleteSecret(projectName, nimSecretName).then(() => undefined),
      deleteSecret(projectName, imagePullSecretName).then(() => undefined),
    );
  }

  return resourcesToDelete;
};

export const fetchNIMAccountConstants = async (
  dashboardNamespace: string,
): Promise<NIMAccountConstants | undefined> => {
  try {
    const accounts = await listAccounts(dashboardNamespace);
    if (accounts.length === 0) {
      throw new Error('NIM account does not exist.');
    }

    const nimAccount = accounts[0];
    const nimSecretName = nimAccount.spec.apiKeySecret.name;

    if (!nimSecretName || !nimAccount.status) {
      throw new Error('Failed to retrieve NIM account details.');
    }

    const { nimPullSecret, nimConfig, runtimeTemplate } = nimAccount.status;

    if (!nimPullSecret?.name || !nimConfig?.name || !runtimeTemplate?.name) {
      throw new Error('Required NIM account fields are missing.');
    }

    return {
      nimSecretKey: 'apiKeySecret',
      nimNGCSecretKey: 'nimPullSecret',
      nimConfigMapKey: 'nimConfig',
      templateName: runtimeTemplate.name,
    };
  } catch (e) {
    if (e instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching NIM account constants: ${e.message}`);
    } else {
      // eslint-disable-next-line no-console
      console.error(`Error fetching NIM account constants: ${String(e)}`);
    }
    return undefined;
  }
};
