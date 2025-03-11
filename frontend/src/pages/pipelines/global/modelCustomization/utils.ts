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
import { HardwareProfileKind, SecretKind } from '~/k8sTypes';
import { NodeSelector, Toleration } from '~/types';
import { genRandomChars } from '~/utilities/string';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import {
  PipelineVersionKF,
  ParametersKF,
  RuntimeConfigParamValue,
  ParameterKF,
} from '~/concepts/pipelines/kfTypes';
import { isEnumMember } from '~/utilities/utils';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
import { getResourceNameFromK8sResource } from '~/concepts/k8s/utils';
import { assembleConnectionSecret } from '~/concepts/connectionTypes/utils';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '~/concepts/connectionTypes/types';
import { PipelineInputParameters, NonDisplayedHyperparameterFields } from './const';

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

export const createConnectionSecret = async (
  namespace: string,
  nameDescData: K8sNameDescriptionFieldData,
  connectionValues: { [key: string]: ConnectionTypeValueType },
  ociConnectionType: ConnectionTypeConfigMapObj | undefined,
  dryRun: boolean,
): Promise<SecretKind> => {
  if (!ociConnectionType) {
    return Promise.reject(new Error(`OCI connection type is not available`));
  }
  const secret = assembleConnectionSecret(
    namespace,
    getResourceNameFromK8sResource(ociConnectionType),
    nameDescData,
    connectionValues,
  );

  return createSecret(secret, { dryRun });
};

export const translateIlabFormToTaxonomyInput = (
  data: ModelCustomizationFormData,
  secretName: string,
): {
  sdg_repo_url: string;
  sdg_repo_secret: string;
} => ({
  sdg_repo_url: data.taxonomy.url,
  sdg_repo_secret: secretName,
});

export const translateIlabFormToBaseModelInput = (
  data: ModelCustomizationFormData,
  secretName?: string,
): {
  output_model_registry_name: string | undefined;
  output_model_registry_api_url: string | undefined;
  output_model_name: string | undefined;
  output_model_version: string | undefined;
  output_oci_registry_secret: string | undefined;
  output_oci_registry_uri: string | undefined;
  sdg_base_model: string;
} => ({
  /* eslint-disable camelcase */
  output_model_registry_name: data.outputModel.outputModelRegistryName,
  output_model_registry_api_url: data.outputModel.outputModelRegistryApiUrl,
  output_model_name: data.outputModel.addToRegistryEnabled
    ? data.outputModel.outputModelName
    : undefined,
  output_model_version: data.outputModel.addToRegistryEnabled
    ? data.outputModel.outputModelVersion
    : undefined,
  output_oci_registry_secret: secretName,
  output_oci_registry_uri: data.outputModel.connectionData.uri,
  sdg_base_model: data.baseModel.sdgBaseModel,
  /* eslint-enable camelcase */
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
  data: ModelCustomizationFormData,
): HardwareInputType => ({
  [PipelineInputParameters.TRAIN_GPU_IDENTIFIER]: data.hardware.podSpecOptions.gpuIdentifier,
  [PipelineInputParameters.EVAL_GPU_IDENTIFIER]: data.hardware.podSpecOptions.gpuIdentifier,
  [PipelineInputParameters.TRAIN_GPU_PER_WORKER]: data.hardware.podSpecOptions.gpuCount,
  [PipelineInputParameters.TRAIN_CPU_PER_WORKER]: data.hardware.podSpecOptions.cpuCount,
  [PipelineInputParameters.TRAIN_MEMORY_PER_WORKER]: data.hardware.podSpecOptions.memoryCount,
  [PipelineInputParameters.TRAIN_TOLERATIONS]: data.hardware.podSpecOptions.tolerations,
  [PipelineInputParameters.TRAIN_NODE_SELECTORS]: data.hardware.podSpecOptions.nodeSelector,
  [PipelineInputParameters.TRAIN_NUM_WORKERS]: data.trainingNode,
  [PipelineInputParameters.K8S_STORAGE_CLASS_NAME]: data.storageClass,
});

export const filterHardwareProfilesForTraining = (
  profiles: HardwareProfileKind[],
): HardwareProfileKind[] =>
  profiles.filter((profile) => {
    const cpuIdentifier = profile.spec.identifiers?.find((id) => id.identifier === 'cpu');
    const memoryIdentifier = profile.spec.identifiers?.find((id) => id.identifier === 'memory');

    if (!cpuIdentifier || !memoryIdentifier) {
      return false;
    }

    const otherIdentifiers = profile.spec.identifiers?.filter(
      (id) => id.identifier !== 'cpu' && id.identifier !== 'memory',
    );
    return otherIdentifiers && otherIdentifiers.length === 1;
  });

export const getParamsValueFromPipelineInput = (
  pipeline: PipelineVersionKF | null,
  paramName: string,
): ParameterKF | undefined => {
  if (!pipeline) {
    return undefined;
  }
  return pipeline.pipeline_spec.pipeline_spec?.root.inputDefinitions?.parameters?.[paramName];
};

export const translateIlabFormToHyperparameters = (
  data: ModelCustomizationFormData,
): Record<string, RuntimeConfigParamValue | undefined> => ({
  ...data.hyperparameters,
  [NonDisplayedHyperparameterFields.SDG_PIPELINE]: data.runType.value,
});

export const filterHyperparameters = (
  pipelineVersion: PipelineVersionKF | null,
): {
  hyperparameterFormData: Record<string, RuntimeConfigParamValue | undefined>;
  hyperparameters: ParametersKF;
} => {
  let hyperparameterFormData: Record<string, RuntimeConfigParamValue | undefined> = {};
  let hyperparameters: ParametersKF = {};
  const ilabPipelineParams = getInputDefinitionParams(pipelineVersion);
  if (ilabPipelineParams) {
    for (const key of Object.keys(ilabPipelineParams)) {
      if (!isEnumMember(key, NonDisplayedHyperparameterFields)) {
        hyperparameters = {
          ...hyperparameters,
          [key]: ilabPipelineParams[key],
        };
        hyperparameterFormData = {
          ...hyperparameterFormData,
          [key]: ilabPipelineParams[key].defaultValue,
        };
      }
    }
  }
  return { hyperparameterFormData, hyperparameters };
};
