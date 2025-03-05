/* eslint-disable camelcase */
import { assembleSecretJudge, assembleSecretTeacher, createSecret } from '~/api';
import {
  FineTuneTaxonomyType,
  ModelCustomizationEndpointType,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTuneTaxonomyFormData,
  ModelCustomizationFormData,
  TeacherJudgeFormData,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ParameterKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { HardwareProfileKind, SecretKind } from '~/k8sTypes';
import { NodeSelector, Toleration } from '~/types';
import { genRandomChars } from '~/utilities/string';
import { IlabPodSpecOptions } from './useIlabPodSpecOptionsState';

export const createTeacherJudgeSecrets = (
  projectName: string,
  teacherData: TeacherJudgeFormData,
  judgeData: TeacherJudgeFormData,
  dryRun: boolean,
  teacherSecretName?: string,
  judgeSecretName?: string,
): Promise<SecretKind[]> =>
  Promise.all([
    createSecret(
      assembleSecretTeacher(
        projectName,
        {
          api_token:
            teacherData.endpointType === ModelCustomizationEndpointType.PRIVATE
              ? teacherData.apiToken.trim()
              : '',
          endpoint: teacherData.endpoint.trim(),
          model_name: teacherData.modelName.trim(),
        },
        teacherSecretName,
      ),
      { dryRun },
    ),
    createSecret(
      assembleSecretJudge(
        projectName,
        {
          api_token:
            judgeData.endpointType === ModelCustomizationEndpointType.PRIVATE
              ? judgeData.apiToken.trim()
              : '',
          endpoint: judgeData.endpoint.trim(),
          model_name: judgeData.modelName.trim(),
        },
        judgeSecretName,
      ),
      { dryRun },
    ),
  ]);

export const translateIlabFormToTeacherJudge = (
  teacherSecretName: string,
  judgeSecretName: string,
): {
  teacher_secret: string;
  judge_secret: string;
} => ({
  teacher_secret: teacherSecretName,
  judge_secret: judgeSecretName,
});

export const createAuthSecret = async (
  projectName: string,
  secretName: string,
  username: string,
  token: string,
  dryRun: boolean,
): Promise<SecretKind> => {
  try {
    const newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
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
  secretName: string,
  sshKey: string,
  dryRun: boolean,
): Promise<SecretKind> => {
  try {
    const newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: projectName,
      },
      stringData: {
        'ssh-privatekey': sshKey,
      },
      type: 'kubernetes.io/ssh-auth',
    };

    return await createSecret(newSecret, { dryRun });
  } catch (e) {
    return Promise.reject(new Error(`Error creating secret`));
  }
};

export const createTaxonomySecret = async (
  data: FineTuneTaxonomyFormData,
  projectName: string,
  dryRun: boolean,
  secretName?: string,
): Promise<SecretKind> => {
  const name = secretName ?? `sdg-repo-secret-${genRandomChars()}`;
  return data.secret.type === FineTuneTaxonomyType.SSH_KEY
    ? createSShSecret(projectName, name, data.secret.sshKey, dryRun)
    : createAuthSecret(projectName, name, data.secret.username, data.secret.token, dryRun);
};

export const translateIlabFormToTaxonomyInput = (
  data: ModelCustomizationFormData,
  secretName: string,
): {
  sdg_repo_url: string;
  sdg_repo_secret: string;
} => ({
  // eslint-disable-next-line camelcase
  sdg_repo_url: data.taxonomy.url,
  // eslint-disable-next-line camelcase
  sdg_repo_secret: secretName,
});

export const translateIlabFormToBaseModelInput = (
  data: ModelCustomizationFormData,
): {
  output_model_registry_api_url: string;
  output_model_name: string;
  sdg_base_model: string;
} => ({
  // eslint-disable-next-line camelcase
  output_model_registry_api_url: data.outputModel.outputModelRegistryApiUrl,
  // eslint-disable-next-line camelcase
  output_model_name: data.outputModel.outputModelName,
  // eslint-disable-next-line camelcase
  sdg_base_model: data.baseModel.sdgBaseModel,
  // TODO more output model fields
});

type HardwareInputType = {
  train_num_workers: number;
  k8s_storage_class_name: string;
  train_node_selectors?: NodeSelector;
  train_tolerations?: Toleration[];
  train_cpu_per_worker: string | number;
  train_memory_per_worker: string;
  train_gpu_identifier: string;
  eval_gpu_identifier: string;
  train_gpu_per_worker: string | number;
};

export const translateIlabFormToHardwareInput = (
  podSpecOptions: IlabPodSpecOptions,
  data: ModelCustomizationFormData,
): HardwareInputType => {
  const getHardwareTrainingGpuValue = () => {
    const otherIdentifier = podSpecOptions.selectedHardwareProfile?.spec.identifiers?.filter(
      (i) => i.identifier !== 'cpu' && i.identifier !== 'memory',
    );
    const identifierValue = otherIdentifier
      ? podSpecOptions.resources.requests?.[otherIdentifier[0].identifier]
      : '';

    return {
      train_gpu_identifier: otherIdentifier?.[0].identifier ?? '',
      eval_gpu_identifier: otherIdentifier?.[0].identifier ?? '',
      train_gpu_per_worker: identifierValue ?? '',
    };
  };

  return {
    ...(podSpecOptions.selectedHardwareProfile
      ? getHardwareTrainingGpuValue()
      : {
          train_gpu_identifier: podSpecOptions.selectedAcceleratorProfile?.spec.identifier ?? '',
          eval_gpu_identifier: podSpecOptions.selectedAcceleratorProfile?.spec.identifier ?? '',
          train_gpu_per_worker:
            podSpecOptions.resources.requests?.[
              podSpecOptions.selectedAcceleratorProfile?.spec.identifier ?? ''
            ] ?? '',
        }),
    train_cpu_per_worker: podSpecOptions.resources.requests?.cpu ?? '',
    train_memory_per_worker: podSpecOptions.resources.requests?.memory ?? '',
    ...(podSpecOptions.tolerations?.length && { train_tolerations: podSpecOptions.tolerations }),
    ...(podSpecOptions.nodeSelector?.length && {
      train_node_selectors: podSpecOptions.nodeSelector,
    }),
    train_num_workers: data.trainingNode,
    k8s_storage_class_name: data.storageClass,
  };
};

export const filterHardwareProfilesForTraining = (
  profiles: HardwareProfileKind[],
): HardwareProfileKind[] =>
  profiles.reduce<HardwareProfileKind[]>((accumulator, profile) => {
    const cpuIdentifier = profile.spec.identifiers?.find((id) => id.identifier === 'cpu');

    const memoryIdentifier = profile.spec.identifiers?.find((id) => id.identifier === 'memory');
    if (!cpuIdentifier || !memoryIdentifier) {
      return accumulator;
    }

    const otherIdentifiers = profile.spec.identifiers?.filter(
      (id) => id.identifier !== 'cpu' && id.identifier !== 'memory',
    );

    if (!otherIdentifiers || otherIdentifiers.length !== 1) {
      return accumulator;
    }

    const gpuIdentifier = otherIdentifiers[0];

    accumulator.push({
      ...profile,
      spec: {
        ...profile.spec,
        identifiers: [cpuIdentifier, memoryIdentifier, gpuIdentifier],
      },
    });

    return accumulator;
  }, []);

export const getParamsValueFromPipelineInput = (
  pipeline: PipelineVersionKF | null,
  paramName: string,
): ParameterKF | undefined => {
  if (!pipeline) {
    return undefined;
  }
  return pipeline.pipeline_spec.pipeline_spec?.root.inputDefinitions?.parameters?.[paramName];
};
