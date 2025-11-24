import { k8sCreateResource, k8sUpdateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
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
import { k8sMergePatchResource } from '@odh-dashboard/internal/api/k8sUtils';
import { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { applyHardwareProfileConfig, applyReplicas } from './hardware';
import { setUpTokenAuth } from './deployUtils';
import {
  applyModelEnvVarsAndArgs,
  applyModelLocation,
  applyDisplayNameDesc,
  applyDashboardResourceLabel,
} from './model';
import { applyModelAvailabilityData } from '../wizardFields/modelAvailability';
import { LLMD_SERVING_ID } from '../../extensions/extensions';
import {
  LLMdContainer,
  LLMdDeployment,
  LLMInferenceServiceKind,
  LLMInferenceServiceModel,
} from '../types';

const applyTokenAuthentication = (
  llmdInferenceService: LLMInferenceServiceKind,
  tokenAuthentication?: { displayName: string; uuid: string; error?: string }[],
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

const createLLMInferenceServiceKind = async (
  assembledLLMdInferenceParams: CreateLLMdInferenceServiceParams,
  dryRun?: boolean,
  connectionSecretName?: string,
): Promise<LLMInferenceServiceKind> => {
  const assembledLLMdInferenceService = assembleLLMdInferenceServiceKind(
    assembledLLMdInferenceParams,
    undefined,
    dryRun,
    connectionSecretName,
  );
  return k8sCreateResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceModel,
        resource: assembledLLMdInferenceService,
      },
      { dryRun: dryRun ?? false },
    ),
  );
};

const buildRemovalPatch = (
  oldObj: Record<string, string> = {},
  newObj: Record<string, string> = {},
) => {
  const removalPatch: Record<string, string | null> = {};
  // Find keys that existed in old but not in new
  Object.keys(oldObj).forEach((key) => {
    if (!(key in newObj)) {
      removalPatch[key] = null;
    }
  });
  return removalPatch;
};
const updateLLMInferenceServiceKind = async (
  assembledLLMdInferenceParams: CreateLLMdInferenceServiceParams,
  existingDeployment: LLMInferenceServiceKind,
  dryRun?: boolean,
  connectionSecretName?: string,
): Promise<LLMInferenceServiceKind> => {
  const assembledLLMdInferenceService = assembleLLMdInferenceServiceKind(
    assembledLLMdInferenceParams,
    existingDeployment,
    dryRun,
    connectionSecretName,
  );
  // Automatically figure out what annotations need removing
  const annotationsToRemove = buildRemovalPatch(
    existingDeployment.metadata.annotations,
    assembledLLMdInferenceService.metadata.annotations,
  );
  // Automatically figure out what labels need removing
  const labelsToRemove = buildRemovalPatch(
    existingDeployment.metadata.labels,
    assembledLLMdInferenceService.metadata.labels,
  );

  // Handle args and env vars removal
  const oldMainContainer =
    existingDeployment.spec.template?.containers?.find((c) => c.name === 'main') || {};
  const newMainContainer =
    assembledLLMdInferenceService.spec.template?.containers?.find((c) => c.name === 'main') || {};
  const containerFieldsToRemove = buildRemovalPatch(oldMainContainer, newMainContainer);

  const resource = {
    ...assembledLLMdInferenceService,
    metadata: {
      ...assembledLLMdInferenceService.metadata,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      annotations: {
        ...annotationsToRemove,
        ...assembledLLMdInferenceService.metadata.annotations,
      } as Record<string, string>,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      labels: {
        ...labelsToRemove,
        ...assembledLLMdInferenceService.metadata.labels,
      } as Record<string, string>,
    },
    spec: {
      ...assembledLLMdInferenceService.spec,
      template: {
        ...assembledLLMdInferenceService.spec.template,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        containers: [
          {
            ...oldMainContainer,
            ...containerFieldsToRemove,
            ...newMainContainer,
          },
        ] as LLMdContainer[],
      },
    },
  };

  if (dryRun) {
    const oldDeployment = structuredClone(existingDeployment);
    return k8sUpdateResource<LLMInferenceServiceKind>(
      applyK8sAPIOptions(
        {
          model: LLMInferenceServiceModel,
          resource: _.merge({}, oldDeployment, resource),
        },
        { dryRun },
      ),
    );
  }

  return k8sMergePatchResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions({ model: LLMInferenceServiceModel, resource }, { dryRun }),
  );
};

type CreateLLMdInferenceServiceParams = {
  projectName: string;
  k8sName: string;
  dryRun?: boolean;
  modelLocationData: ModelLocationData;
  createConnectionData?: CreateConnectionFieldData;
  connectionSecretName?: string;
  displayName?: string;
  description?: string;
  hardwareProfile: HardwareProfileConfig;
  replicas?: number;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  modelAvailability?: ModelAvailabilityFieldsData;
  tokenAuthentication?: { displayName: string; uuid: string; error?: string }[];
};

const assembleLLMdInferenceServiceKind = (
  data: CreateLLMdInferenceServiceParams,
  existingDeployment?: LLMInferenceServiceKind,
  dryRun?: boolean,
  connectionSecretName?: string,
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
  let llmdInferenceService: LLMInferenceServiceKind = existingDeployment
    ? {
        ...existingDeployment,
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
  llmdInferenceService = applyDisplayNameDesc(llmdInferenceService, displayName, description);
  llmdInferenceService = applyDashboardResourceLabel(llmdInferenceService);

  llmdInferenceService = applyModelLocation(
    llmdInferenceService,
    modelLocationData,
    connectionSecretName,
    createConnectionData,
    dryRun,
  );
  llmdInferenceService = applyHardwareProfileConfig(llmdInferenceService, hardwareProfile);
  llmdInferenceService = applyReplicas(llmdInferenceService, replicas);
  llmdInferenceService = applyModelEnvVarsAndArgs(
    llmdInferenceService,
    environmentVariables,
    runtimeArgs,
  );
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
  connectionSecretName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
): Promise<LLMdDeployment> => {
  const llmdInferenceServiceData: CreateLLMdInferenceServiceParams = {
    projectName,
    dryRun,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    displayName: wizardData.k8sNameDesc.data.name,
    description: wizardData.k8sNameDesc.data.description,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
    modelLocationData: wizardData.modelLocationData.data ?? {
      type: ModelLocationType.NEW,
      fieldValues: {},
      additionalFields: {},
    },
    connectionSecretName,
    createConnectionData: wizardData.createConnectionData.data,
    replicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data,
    environmentVariables: wizardData.environmentVariables.data,
    modelAvailability: wizardData.modelAvailability.data,
    tokenAuthentication: wizardData.tokenAuthentication.data,
  };
  const llmdInferenceService = !existingDeployment
    ? await createLLMInferenceServiceKind(llmdInferenceServiceData, dryRun, connectionSecretName)
    : await updateLLMInferenceServiceKind(
        llmdInferenceServiceData,
        existingDeployment.model,
        dryRun,
        connectionSecretName,
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
