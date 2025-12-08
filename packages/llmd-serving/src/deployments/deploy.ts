import {
  type WizardFormData,
  ModelLocationType,
  ModelLocationData,
  RuntimeArgsFieldData,
  EnvironmentVariablesFieldData,
  CreateConnectionFieldData,
  ModelAvailabilityFieldsData,
  type InitialWizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import * as _ from 'lodash-es';
import { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { applyHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import { applyReplicas, LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS } from './hardware';
import { setUpTokenAuth } from './deployUtils';
import {
  applyModelEnvVarsAndArgs,
  applyModelLocation,
  applyDisplayNameDesc,
  applyDashboardResourceLabel,
  applyTokenAuthentication,
} from './model';
import { applyModelAvailabilityData } from '../wizardFields/modelAvailability';
import { LLMD_SERVING_ID } from '../../extensions/extensions';
import { LLMdDeployment, LLMInferenceServiceKind } from '../types';
import {
  createLLMInferenceService,
  patchLLMInferenceService,
  updateLLMInferenceService,
} from '../api/LLMInferenceService';

type CreateLLMdInferenceServiceParams = {
  projectName: string;
  k8sName: string;
  modelLocationData: ModelLocationData;
  hardwareProfile: HardwareProfileConfig;
  createConnectionData?: CreateConnectionFieldData;
  displayName?: string;
  description?: string;
  replicas?: number;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  modelAvailability?: ModelAvailabilityFieldsData;
  tokenAuthentication?: { displayName: string; uuid: string; error?: string }[];
};

/**
 * Assembles an LLMInferenceServiceKind object from the given parameters.
 * This is a pure function that builds the desired state of the resource.
 */
const assembleLLMdInferenceService = (
  data: CreateLLMdInferenceServiceParams,
  existingDeployment?: LLMInferenceServiceKind,
  connectionSecretName?: string,
  dryRun?: boolean,
  transformData?: { metadata?: { labels?: Record<string, string> } },
): LLMInferenceServiceKind => {
  const {
    projectName,
    k8sName,
    displayName,
    description,
    hardwareProfile,
    modelLocationData,
    createConnectionData,
    replicas = 1,
    runtimeArgs,
    environmentVariables,
    modelAvailability,
    tokenAuthentication,
  } = data;

  let llmInferenceService: LLMInferenceServiceKind = existingDeployment
    ? { ...existingDeployment }
    : {
        apiVersion: 'serving.kserve.io/v1alpha1',
        kind: 'LLMInferenceService',
        metadata: {
          name: k8sName,
          namespace: projectName,
          annotations: {
            ...(displayName && { 'openshift.io/display-name': displayName }),
            ...(description && { 'openshift.io/description': description }),
            'opendatahub.io/model-type': 'generative',
          },
        },
        spec: {
          model: {
            uri: '',
            name: k8sName,
          },
          router: {
            scheduler: {},
            route: {},
            gateway: {},
          },
          template: {
            containers: [
              {
                name: 'main',
              },
            ],
          },
        },
      };

  llmInferenceService = applyDisplayNameDesc(llmInferenceService, displayName, description);
  llmInferenceService = applyDashboardResourceLabel(llmInferenceService);
  llmInferenceService = applyModelLocation(
    llmInferenceService,
    modelLocationData,
    connectionSecretName,
    createConnectionData,
    dryRun,
  );
  llmInferenceService = applyHardwareProfileConfig(
    llmInferenceService,
    hardwareProfile,
    LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  );
  llmInferenceService = applyReplicas(llmInferenceService, replicas);
  llmInferenceService = applyModelEnvVarsAndArgs(
    llmInferenceService,
    environmentVariables,
    runtimeArgs,
  );
  llmInferenceService = applyModelAvailabilityData(llmInferenceService, modelAvailability);
  llmInferenceService = applyTokenAuthentication(llmInferenceService, tokenAuthentication);
  llmInferenceService = _.merge(llmInferenceService, transformData);

  return llmInferenceService;
};

/**
 * Deploys an LLMInferenceService using the appropriate method based on the context:
 * - Create: When no existing deployment exists
 * - Patch: When updating with overwrite=true (JSON Patch, less prone to conflicts)
 * - Update: When updating with overwrite=false (merge patch with removal handling)
 */
const deployLLMdInferenceService = async (
  params: CreateLLMdInferenceServiceParams,
  existingDeployment: LLMInferenceServiceKind | undefined,
  connectionSecretName: string | undefined,
  transformData: { metadata?: { labels?: Record<string, string> } } | undefined,
  opts?: { dryRun?: boolean; overwrite?: boolean },
): Promise<LLMInferenceServiceKind> => {
  const newResource = assembleLLMdInferenceService(
    params,
    existingDeployment,
    connectionSecretName,
    opts?.dryRun,
    transformData,
  );

  if (!existingDeployment) {
    return createLLMInferenceService(newResource, { dryRun: opts?.dryRun });
  }
  if (opts?.overwrite) {
    return patchLLMInferenceService(existingDeployment, newResource, { dryRun: opts.dryRun });
  }
  return updateLLMInferenceService(newResource, { dryRun: opts?.dryRun });
};

/**
 * Main entry point for deploying an LLMd deployment from wizard data.
 */
export const deployLLMdDeployment = async (
  wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: LLMdDeployment,
  serverResource?: LLMdDeployment['server'],
  serverResourceTemplateName?: string,
  dryRun?: boolean,
  connectionSecretName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
): Promise<LLMdDeployment> => {
  const params: CreateLLMdInferenceServiceParams = {
    projectName,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    displayName: wizardData.k8sNameDesc.data.name,
    description: wizardData.k8sNameDesc.data.description,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
    modelLocationData: wizardData.modelLocationData.data ?? {
      type: ModelLocationType.NEW,
      fieldValues: {},
      additionalFields: {},
    },
    createConnectionData: wizardData.createConnectionData.data,
    replicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data,
    environmentVariables: wizardData.environmentVariables.data,
    modelAvailability: wizardData.modelAvailability.data,
    tokenAuthentication: wizardData.tokenAuthentication.data,
  };

  const llmdInferenceService = await deployLLMdInferenceService(
    params,
    existingDeployment?.model,
    connectionSecretName,
    initialWizardData?.transformData,
    { dryRun, overwrite },
  );

  const createTokenAuth =
    (wizardData.tokenAuthentication.data && wizardData.tokenAuthentication.data.length > 0) ??
    false;

  await setUpTokenAuth(
    wizardData.tokenAuthentication.data,
    wizardData.k8sNameDesc.data.k8sName.value,
    projectName,
    createTokenAuth,
    llmdInferenceService,
    initialWizardData?.existingAuthTokens,
    { dryRun },
  );

  return {
    modelServingPlatformId: LLMD_SERVING_ID,
    model: llmdInferenceService,
  };
};
