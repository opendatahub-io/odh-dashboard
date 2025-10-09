import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { applyHardwareProfileConfig, applyReplicas } from './hardware';
import { applyModelEnvVars, applyModelArgs, applyModelLocation } from './model';
import { setUpTokenAuth } from './deployUtils';
import { LLMD_SERVING_ID } from '../../extensions/extensions';
import { LLMdDeployment, LLMInferenceServiceKind, LLMInferenceServiceModel } from '../types';
import {
  ModelLocationData,
  ModelLocationType,
} from '../../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

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

type CreateLLMdInferenceServiceParams = {
  projectName: string;
  k8sName: string;
  dryRun?: boolean;
  modelLocationData: ModelLocationData;
  displayName?: string;
  description?: string;
  hardwareProfileName?: string;
  hardwareProfileNamespace?: string;
  connectionName: string;
  replicas?: number;
  runtimeArgs?: string[];
  environmentVariables?: { name: string; value: string }[];
  tokenAuthentication?: { name: string; uuid: string; error?: string }[];
};

const assembleLLMdInferenceServiceKind = ({
  projectName,
  dryRun,
  k8sName,
  modelLocationData,
  displayName,
  description,
  hardwareProfileName,
  hardwareProfileNamespace,
  replicas = 1,
  runtimeArgs,
  environmentVariables,
  tokenAuthentication,
}: CreateLLMdInferenceServiceParams): LLMInferenceServiceKind => {
  let llmdInferenceService: LLMInferenceServiceKind = {
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

  llmdInferenceService = applyModelLocation(
    llmdInferenceService,
    modelLocationData,
    undefined, // TODO add secret name once 1C merges
    dryRun,
  );
  llmdInferenceService = applyHardwareProfileConfig(
    llmdInferenceService,
    hardwareProfileName ?? '',
    hardwareProfileNamespace ?? '',
  );
  llmdInferenceService = applyReplicas(llmdInferenceService, replicas);
  llmdInferenceService = applyModelArgs(llmdInferenceService, runtimeArgs);
  llmdInferenceService = applyModelEnvVars(llmdInferenceService, environmentVariables);
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
): Promise<LLMdDeployment> => {
  const llmdInferenceServiceKind = assembleLLMdInferenceServiceKind({
    projectName,
    dryRun,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    displayName: wizardData.k8sNameDesc.data.name,
    description: wizardData.k8sNameDesc.data.description,
    hardwareProfileName: wizardData.hardwareProfileConfig.formData.selectedProfile?.metadata.name,
    hardwareProfileNamespace:
      wizardData.hardwareProfileConfig.formData.selectedProfile?.metadata.namespace,
    modelLocationData: wizardData.modelLocationData.data ?? {
      type: ModelLocationType.NEW,
      fieldValues: {},
      additionalFields: {},
    },
    connectionName: wizardData.modelLocationData.data?.connection ?? '',
    replicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data?.args,
    environmentVariables: wizardData.environmentVariables.data?.variables,
    tokenAuthentication: wizardData.tokenAuthentication.data,
  });

  const llmdInferenceService = await createLLMdInferenceServiceKind(
    llmdInferenceServiceKind,
    dryRun,
  );

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
