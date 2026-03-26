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
import type { DeploymentAssemblyFn } from '@odh-dashboard/model-serving/extension-points';
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
import { applyConfigBaseRef } from './server';
import { applyModelAvailabilityData } from '../wizardFields/modelAvailability';
import { LLMD_SERVING_ID } from '../../extensions/extensions';
import {
  isLLMInferenceServiceConfig,
  LLMdDeployment,
  LLMInferenceServiceConfigKind,
  LLMInferenceServiceKind,
  isLLMInferenceService,
} from '../types';
import {
  createLLMInferenceService,
  patchLLMInferenceService,
  updateLLMInferenceService,
} from '../api/LLMInferenceService';
import {
  createLLMInferenceServiceConfig,
  patchLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../api/LLMInferenceServiceConfigs';

export const BaseLLMInferenceService = (
  name?: string,
  namespace?: string,
  annotations?: Record<string, string>,
): LLMInferenceServiceKind => {
  return {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'LLMInferenceService',
    metadata: {
      name: name ?? '',
      namespace: namespace ?? '',
      annotations: annotations ?? {},
    },
    spec: {
      model: {
        uri: '',
        name: name ?? '',
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
};

type CreateLLMInferenceServiceParams = {
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
  baseRef?: string;
};

/**
 * Assembles an LLMInferenceServiceKind object from the given parameters.
 * This is a pure function that builds the desired state of the resource.
 */
const assembleLLMInferenceService = (
  data: CreateLLMInferenceServiceParams,
  existingDeployment?: LLMInferenceServiceKind,
  connectionSecretName?: string,
  dryRun?: boolean,
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
    baseRef,
  } = data;
  let llmInferenceService: LLMInferenceServiceKind = existingDeployment
    ? { ...existingDeployment }
    : BaseLLMInferenceService(k8sName, projectName, {
        ...(displayName && { 'openshift.io/display-name': displayName }),
        ...(description && { 'openshift.io/description': description }),
        'opendatahub.io/model-type': 'generative',
      });

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
  llmInferenceService = applyConfigBaseRef(llmInferenceService, baseRef);

  return llmInferenceService;
};

/**
 * Returns the config object to be deployed alongside the LLMInferenceService.
 * If no config is determined, undefined is returned.
 * - If a config template was selected, clone it and set the deployment name and project namespace
 * - If a config already exists on an existing deployment, return it
 */
const assembleLLMInferenceServiceConfig = (
  data: {
    deploymentName: string;
    deploymentNamespace: string;
    template?: LLMInferenceServiceConfigKind;
  },
  existingDeploymentConfig?: LLMInferenceServiceConfigKind,
): LLMInferenceServiceConfigKind | undefined => {
  if (existingDeploymentConfig) {
    return existingDeploymentConfig;
  }
  if (data.template) {
    const templateName = data.template.metadata.name;
    const templateVersion = data.template.metadata.annotations?.['opendatahub.io/runtime-version'];
    const accelerators =
      data.template.metadata.annotations?.['opendatahub.io/recommended-accelerators'];

    return {
      ...data.template,
      metadata: {
        // Exclude other metadata to exclude existing resource version stuff
        name: data.deploymentName,
        namespace: data.deploymentNamespace,
        annotations: {
          ...data.template.metadata.annotations,
          'opendatahub.io/template-name': templateName,
          ...(templateVersion !== undefined && {
            'opendatahub.io/runtime-version': templateVersion,
          }),
          ...(accelerators !== undefined && {
            'opendatahub.io/recommended-accelerators': accelerators,
          }),
        },
      },
    };
  }
  return undefined;
};

export const assembleLLMdDeployment = (
  wizardData: WizardFormData,
  existingDeployment?: LLMdDeployment,
  applyFieldData?: DeploymentAssemblyFn<LLMdDeployment>,
  connectionSecretName?: string, // We really need to remove this, kept for backwards compatibility
): LLMdDeployment => {
  const k8sName = wizardData.state.k8sNameDesc.data.k8sName.value;

  const llmInferenceServiceConfig = assembleLLMInferenceServiceConfig(
    {
      deploymentName: k8sName,
      deploymentNamespace: wizardData.state.project.projectName ?? '',
      template: isLLMInferenceServiceConfig(wizardData.state.modelServer.data?.selection?.template)
        ? wizardData.state.modelServer.data.selection.template
        : undefined,
    },
    existingDeployment?.server,
  );

  let result: LLMdDeployment = {
    modelServingPlatformId: LLMD_SERVING_ID,
    model: assembleLLMInferenceService(
      {
        projectName: wizardData.state.project.projectName ?? '',
        k8sName,
        displayName: wizardData.state.k8sNameDesc.data.name,
        description: wizardData.state.k8sNameDesc.data.description,
        hardwareProfile: wizardData.state.hardwareProfileConfig.formData,
        modelLocationData: wizardData.state.modelLocationData.data ?? {
          type: ModelLocationType.NEW,
          fieldValues: {},
          additionalFields: {},
        },
        createConnectionData: wizardData.state.createConnectionData.data,
        replicas: wizardData.state.numReplicas.data,
        runtimeArgs: wizardData.state.runtimeArgs.data,
        environmentVariables: wizardData.state.environmentVariables.data,
        modelAvailability: wizardData.state.modelAvailability.data,
        tokenAuthentication: wizardData.state.tokenAuthentication.data,
        baseRef: llmInferenceServiceConfig ? k8sName : undefined,
      },
      existingDeployment?.model,
      connectionSecretName,
      false,
    ),
    server: llmInferenceServiceConfig,
  };
  result = applyFieldData?.(result) ?? result;
  return result;
};

/**
 * Deploys an LLMInferenceService using the appropriate method based on the context:
 * - Create: When no existing deployment exists
 * - Patch: When updating with overwrite=true (JSON Patch, less prone to conflicts)
 * - Update: When updating with overwrite=false (merge patch with removal handling)
 */
const deployLLMInferenceService = async (
  llmInferenceService: LLMInferenceServiceKind,
  existingLLMInferenceService?: LLMInferenceServiceKind,
  opts?: { dryRun?: boolean; overwrite?: boolean },
): Promise<LLMInferenceServiceKind> => {
  if (!existingLLMInferenceService) {
    return createLLMInferenceService(llmInferenceService, { dryRun: opts?.dryRun });
  }
  if (opts?.overwrite) {
    return patchLLMInferenceService(existingLLMInferenceService, llmInferenceService, {
      dryRun: opts.dryRun,
    });
  }
  return updateLLMInferenceService(llmInferenceService, { dryRun: opts?.dryRun });
};

const deployLLMInferenceServiceConfig = async (
  llmInferenceServiceConfig: LLMInferenceServiceConfigKind,
  existingLLMInferenceServiceConfig?: LLMInferenceServiceConfigKind,
  opts?: { dryRun?: boolean; overwrite?: boolean },
): Promise<LLMInferenceServiceConfigKind> => {
  if (!existingLLMInferenceServiceConfig) {
    return createLLMInferenceServiceConfig(llmInferenceServiceConfig, { dryRun: opts?.dryRun });
  }

  if (opts?.overwrite) {
    return patchLLMInferenceServiceConfig(
      existingLLMInferenceServiceConfig,
      llmInferenceServiceConfig,
      {
        dryRun: opts.dryRun,
      },
    );
  }
  return updateLLMInferenceServiceConfig(llmInferenceServiceConfig, { dryRun: opts?.dryRun });
};

/**
 * Main entry point for deploying an LLMd deployment from wizard data.
 */
export const deployLLMdDeployment = async (
  wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: LLMdDeployment,
  modelResource?: LLMdDeployment['model'],
  serverResource?: LLMdDeployment['server'],
  serverResourceTemplateName?: string,
  dryRun?: boolean,
  connectionSecretName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
): Promise<LLMdDeployment> => {
  if (!modelResource || !isLLMInferenceService(modelResource)) {
    throw new Error('LLMInferenceService is required');
  }

  let llmInferenceServiceConfig: LLMInferenceServiceConfigKind | undefined;
  if (serverResource) {
    llmInferenceServiceConfig = await deployLLMInferenceServiceConfig(
      serverResource,
      existingDeployment?.server,
      {
        dryRun,
        overwrite,
      },
    );
  }
  const llmInferenceService = await deployLLMInferenceService(
    modelResource,
    existingDeployment?.model,
    { dryRun, overwrite },
  );

  const createTokenAuth =
    (wizardData.tokenAuthentication.data && wizardData.tokenAuthentication.data.length > 0) ??
    false;

  if (wizardData.canCreateRoleBindings) {
    await setUpTokenAuth(
      wizardData.tokenAuthentication.data,
      llmInferenceService.metadata.name,
      llmInferenceService.metadata.namespace,
      createTokenAuth,
      llmInferenceService,
      initialWizardData?.existingAuthTokens,
      { dryRun },
    );
  }

  return {
    modelServingPlatformId: LLMD_SERVING_ID,
    model: llmInferenceService,
    ...(llmInferenceServiceConfig && { server: llmInferenceServiceConfig }),
  };
};
