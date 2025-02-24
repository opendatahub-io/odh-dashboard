import { createSecret } from '~/api';
import { ParameterKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { SecretKind } from '~/k8sTypes';
import { genRandomChars } from '~/utilities/string';

export const getPipelineInputParameter = (
  pipeline: PipelineVersionKF | null,
  paramName: string,
): ParameterKF | undefined => {
  if (!pipeline) {
    return undefined;
  }

  return pipeline.pipeline_spec.pipeline_spec?.root.inputDefinitions?.parameters?.[paramName];
};

export const createAuthSecret = async (
  projectName: string,
  username: string,
  token: string,
  dryRun: boolean,
): Promise<SecretKind> => {
  try {
    const newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: `sdg_repo_secret-${genRandomChars()}`,
        namespace: projectName,
      },
      stringData: {
        username,
        password: token,
      },
      type: 'kubernetes.io/basic-auth',
    };

    return await createSecret(newSecret, { dryRun });
  } catch (e) {
    return Promise.reject(new Error(`Error creating secret`));
  }
};

export const createSShSecret = async (
  projectName: string,
  sshKey: string,
  dryRun: boolean,
): Promise<SecretKind> => {
  try {
    const newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: `sdg_repo_secret-${genRandomChars()}`,
        namespace: projectName,
      },
      data: {
        'ssh-privatekey': sshKey,
      },
      type: 'kubernetes.io/ssh-auth',
    };

    return await createSecret(newSecret, { dryRun });
  } catch (e) {
    return Promise.reject(new Error(`Error creating secret`));
  }
};
