/* eslint-disable camelcase */
import { assembleSecretJudge, assembleSecretTeacher, createSecret } from '#~/api';
import {
  FineTuneTaxonomyType,
  ModelCustomizationEndpointType,
} from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTuneTaxonomyFormData,
  ModelCustomizationFormData,
  TeacherJudgeFormData,
} from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { HardwareProfileKind, SecretKind } from '#~/k8sTypes';
import { genRandomChars } from '#~/utilities/string';
import { getInputDefinitionParams } from '#~/concepts/pipelines/content/createRun/utils';
import {
  PipelineVersionKF,
  ParametersKF,
  RuntimeConfigParamValue,
  ParameterKF,
  RuntimeConfigParameters,
} from '#~/concepts/pipelines/kfTypes';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { getResourceNameFromK8sResource } from '#~/concepts/k8s/utils';
import { assembleConnectionSecret } from '#~/concepts/connectionTypes/utils';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import {
  EXCLUDED_HYPERPARAMETERS,
  EXPECTED_FINE_TUNING_PIPELINE_PARAMETERS,
  KnownFineTuningPipelineParameters,
} from './const';

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
      if (
        !EXPECTED_FINE_TUNING_PIPELINE_PARAMETERS.includes(key) &&
        !EXCLUDED_HYPERPARAMETERS.includes(key)
      ) {
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

export const translateIlabForm = (
  data: ModelCustomizationFormData,
  teacherSecretName: string,
  judgeSecretName: string,
  taxonomySecretName: string,
  registrySecretName?: string,
): RuntimeConfigParameters => ({
  /* eslint-disable camelcase */
  [KnownFineTuningPipelineParameters.SDG_TEACHER_SECRET]: teacherSecretName,
  [KnownFineTuningPipelineParameters.EVAL_JUDGE_SECRET]: judgeSecretName,

  [KnownFineTuningPipelineParameters.SDG_REPO_URL]: data.taxonomy.url,
  [KnownFineTuningPipelineParameters.SDG_REPO_SECRET]: taxonomySecretName,

  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_REGISTRY_NAME]:
    data.outputModel.outputModelRegistryName,
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_REGISTRY_API_URL]:
    data.outputModel.outputModelRegistryApiUrl,
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_NAME]: data.outputModel.addToRegistryEnabled
    ? data.outputModel.outputModelName
    : undefined,
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_VERSION]: data.outputModel.addToRegistryEnabled
    ? data.outputModel.outputModelVersion
    : undefined,
  [KnownFineTuningPipelineParameters.OUTPUT_OCI_REGISTRY_SECRET]: registrySecretName,
  [KnownFineTuningPipelineParameters.OUTPUT_OCI_MODEL_URI]: data.outputModel.connectionData.uri,
  [KnownFineTuningPipelineParameters.SDG_BASE_MODEL]: data.baseModel.sdgBaseModel,

  [KnownFineTuningPipelineParameters.TRAIN_GPU_IDENTIFIER]:
    data.hardware.podSpecOptions.gpuIdentifier,
  [KnownFineTuningPipelineParameters.EVAL_GPU_IDENTIFIER]:
    data.hardware.podSpecOptions.gpuIdentifier,
  [KnownFineTuningPipelineParameters.TRAIN_GPU_PER_WORKER]: data.hardware.podSpecOptions.gpuCount,
  [KnownFineTuningPipelineParameters.TRAIN_CPU_PER_WORKER]:
    data.hardware.podSpecOptions.cpuCount.toString(),
  [KnownFineTuningPipelineParameters.TRAIN_MEMORY_PER_WORKER]:
    data.hardware.podSpecOptions.memoryCount,
  [KnownFineTuningPipelineParameters.TRAIN_TOLERATIONS]: data.hardware.podSpecOptions.tolerations,
  [KnownFineTuningPipelineParameters.TRAIN_NODE_SELECTORS]:
    data.hardware.podSpecOptions.nodeSelector,
  [KnownFineTuningPipelineParameters.TRAIN_NUM_WORKERS]: data.trainingNode,
  [KnownFineTuningPipelineParameters.K8S_STORAGE_CLASS_NAME]: data.storageClass,
  ...data.hyperparameters,
  /* eslint-enable camelcase */
});
