import { k8sCreateResource, k8sUpdateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import {
  type WizardFormData,
  ModelLocationType,
  ModelLocationData,
} from '@odh-dashboard/model-serving/types/form-data';
import { applyHardwareProfileConfig, applyReplicas } from './hardware';
import { setUpTokenAuth } from './deployUtils';
import {
  applyModelEnvVars,
  applyModelArgs,
  applyModelLocation,
  applyAiAvailableAssetAnnotations,
} from './model';
import { AvailableAiAssetsFieldsData } from '../../../model-serving/src/components/deploymentWizard/fields/AvailableAiAssetsFields';
import { LLMD_SERVING_ID } from '../../extensions/extensions';
import { LLMdDeployment, LLMInferenceServiceKind, LLMInferenceServiceModel } from '../types';
import { applyModelAvailabilityData } from '../wizardFields/modelAvailability';

const applyTokenAuthentication = (
  llmdInferenceService: LLMInferenceServiceKind,
  tokenAuthentication?: { name: string; uuid: string; error?: string }[],
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  const annotations = { ...result.metadata.annotations };
  if (!tokenAuthentication || tokenAuthentication.length === 0) {
    annotations['security.opendatahub.io/enable-auth'] = 'false';
  } else {
    delete annotations['security.opendatahub.io/enable-auth'];
  }
  result.metadata.annotations = annotations;
  return result;
};

export const isLLMdDeployActive = (wizardData: WizardFormData['state']): boolean => {
  return wizardData.modelServer.data?.name === LLMD_SERVING_ID;
};

const createLLMdInferenceServiceKind = async (
  resource: LLMInferenceServiceKind,
  dryRun?: boolean,
): Promise<LLMInferenceServiceKind> => {
  return k8sCreateResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceModel,
        resource,
      },
      { dryRun: dryRun ?? false },
    ),
  );
};

const updateLLMdInferenceServiceKind = async (
  resource: LLMInferenceServiceKind,
  dryRun?: boolean,
): Promise<LLMInferenceServiceKind> => {
  return k8sUpdateResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceModel,
        resource,
      },
      { dryRun: dryRun ?? false },
    ),
  );
};

type CreateLLMdInferenceServiceParams = {
  projectName: string;
  k8sName: string;
  dryRun?: boolean;
  modelLocationData: ModelLocationData;
  secretName?: string;
  displayName?: string;
  description?: string;
  hardwareProfileName?: string;
  hardwareProfileNamespace?: string;
  connectionName: string;
  replicas?: number;
  runtimeArgs?: string[];
  environmentVariables?: { name: string; value: string }[];
  modelAvailability?: WizardFormData['state']['modelAvailability']['data'];
  tokenAuthentication?: { name: string; uuid: string; error?: string }[];
  aiAssetData?: AvailableAiAssetsFieldsData;
  existing?: LLMInferenceServiceKind;
};

const assembleLLMdInferenceServiceKind = ({
  projectName,
  dryRun,
  k8sName,
  modelLocationData,
  secretName,
  displayName,
  description,
  hardwareProfileName,
  hardwareProfileNamespace,
  replicas = 1,
  runtimeArgs,
  environmentVariables,
  modelAvailability,
  tokenAuthentication,
  aiAssetData,
  existing,
}: CreateLLMdInferenceServiceParams): LLMInferenceServiceKind => {
  let llmdInferenceService: LLMInferenceServiceKind = existing
    ? {
        ...existing,
      }
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
        },
      };
  if (displayName) {
    llmdInferenceService.metadata.annotations = {
      ...llmdInferenceService.metadata.annotations,
      'openshift.io/display-name': displayName,
    };
  }
  if (description) {
    llmdInferenceService.metadata.annotations = {
      ...llmdInferenceService.metadata.annotations,
      'openshift.io/description': description,
    };
  } else {
    delete llmdInferenceService.metadata.annotations?.['openshift.io/description'];
  }

  llmdInferenceService.metadata.annotations = {
    ...llmdInferenceService.metadata.annotations,
    'opendatahub.io/model-type': 'generative',
  };

  llmdInferenceService = applyModelLocation(
    llmdInferenceService,
    modelLocationData,
    secretName,
    dryRun,
  );
  llmdInferenceService = applyHardwareProfileConfig(
    llmdInferenceService,
    hardwareProfileName ?? '',
    hardwareProfileNamespace ?? '',
  );
  llmdInferenceService = applyAiAvailableAssetAnnotations(
    llmdInferenceService,
    aiAssetData ?? {
      saveAsAiAsset: false,
      useCase: '',
    },
  );
  llmdInferenceService = applyReplicas(llmdInferenceService, replicas);
  llmdInferenceService = applyModelArgs(llmdInferenceService, runtimeArgs);
  llmdInferenceService = applyModelEnvVars(llmdInferenceService, environmentVariables);
  llmdInferenceService = applyModelAvailabilityData(llmdInferenceService, modelAvailability);
  llmdInferenceService = applyTokenAuthentication(llmdInferenceService, tokenAuthentication);

  return llmdInferenceService;
};

export const deployLLMdDeployment = async (
  wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: LLMdDeployment,
  serverResource?: LLMdDeployment['server'],
  serverResourceTemplateName?: string,
  dryRun?: boolean,
  secretName?: string,
): Promise<LLMdDeployment> => {
  const llmdInferenceServiceKind = assembleLLMdInferenceServiceKind({
    projectName,
    dryRun,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    displayName: wizardData.k8sNameDesc.data.name,
    description: wizardData.k8sNameDesc.data.description,
    aiAssetData: wizardData.aiAssetData.data,
    hardwareProfileName: wizardData.hardwareProfileConfig.formData.selectedProfile?.metadata.name,
    hardwareProfileNamespace:
      wizardData.hardwareProfileConfig.formData.selectedProfile?.metadata.namespace,
    modelLocationData: wizardData.modelLocationData.data ?? {
      type: ModelLocationType.NEW,
      fieldValues: {},
      additionalFields: {},
    },
    secretName,
    connectionName: wizardData.modelLocationData.data?.connection ?? '',
    replicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data?.args,
    environmentVariables: wizardData.environmentVariables.data?.variables,
    modelAvailability: wizardData.modelAvailability.data,
    tokenAuthentication: wizardData.tokenAuthentication.data,
    existing: existingDeployment?.model,
  });
  const llmdInferenceService = existingDeployment
    ? await updateLLMdInferenceServiceKind(llmdInferenceServiceKind, dryRun)
    : await createLLMdInferenceServiceKind(llmdInferenceServiceKind, dryRun);

  if (wizardData.tokenAuthentication.data && wizardData.tokenAuthentication.data.length > 0) {
    await setUpTokenAuth(
      wizardData.tokenAuthentication.data,
      wizardData.k8sNameDesc.data.k8sName.value,
      projectName,
      true,
      llmdInferenceService,
      undefined,
      { dryRun },
    );
  }

  return {
    modelServingPlatformId: LLMD_SERVING_ID,
    model: llmdInferenceService,
  };
};
