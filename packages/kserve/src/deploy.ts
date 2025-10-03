import {
  InferenceServiceKind,
  KnownLabels,
  ServingRuntimeKind,
  SupportedModelFormats,
} from '@odh-dashboard/internal/k8sTypes';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/index';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { KServeDeployment } from './deployments';
import { setUpTokenAuth } from './deployUtils';
import { createServingRuntime } from './deployServer';
import { ExternalRouteFieldData } from '../../model-serving/src/components/deploymentWizard/fields/ExternalRouteField';
import { TokenAuthenticationFieldData } from '../../model-serving/src/components/deploymentWizard/fields/TokenAuthenticationField';
import { NumReplicasFieldData } from '../../model-serving/src/components/deploymentWizard/fields/NumReplicasField';
import { RuntimeArgsFieldData } from '../../model-serving/src/components/deploymentWizard/fields/RuntimeArgsField';
import { EnvironmentVariablesFieldData } from '../../model-serving/src/components/deploymentWizard/fields/EnvironmentVariablesField';
import { AvailableAiAssetsFieldsData } from '../../model-serving/src/components/deploymentWizard/fields/AvailableAiAssetsFields';
import { ModelLocationData } from '../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

export type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  description: string;
  modelLocationData?: ModelLocationData;
  modelType: ServingRuntimeModelType;
  hardwareProfile: HardwareProfileConfig;
  modelFormat: SupportedModelFormats;
  externalRoute?: ExternalRouteFieldData;
  tokenAuth?: TokenAuthenticationFieldData;
  numReplicas?: NumReplicasFieldData;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  AiAssetData?: AvailableAiAssetsFieldsData;
};

export const deployKServeDeployment = async (
  wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: KServeDeployment,
  serverResource?: ServingRuntimeKind,
  serverResourceTemplateName?: string,
  dryRun?: boolean,
): Promise<KServeDeployment> => {
  if (!wizardData.modelType.data) {
    throw new Error('Wizard data is missing required model type field');
  }

  if (!wizardData.modelFormatState.modelFormat) {
    throw new Error('Wizard data is missing required model format field');
  }

  const inferenceServiceData: CreatingInferenceServiceObject = {
    project: projectName,
    name: wizardData.k8sNameDesc.data.name,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    description: wizardData.k8sNameDesc.data.description,
    modelLocationData: wizardData.modelLocationData.data,
    modelType: wizardData.modelType.data,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
    modelFormat: wizardData.modelFormatState.modelFormat,
    externalRoute: wizardData.externalRoute.data,
    tokenAuth: wizardData.tokenAuthentication.data,
    numReplicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data,
    environmentVariables: wizardData.environmentVariables.data,
    AiAssetData: wizardData.AiAssetData.data,
  };

  const servingRuntime = serverResource
    ? await createServingRuntime(
        {
          project: projectName,
          name: wizardData.k8sNameDesc.data.k8sName.value,
          servingRuntime: serverResource,
          scope: wizardData.modelServer.data?.scope || '',
          templateName: serverResourceTemplateName,
        },
        dryRun,
      )
    : undefined;

  const inferenceService = await createInferenceService(
    inferenceServiceData,
    existingDeployment?.model,
    dryRun,
  );

  if (inferenceServiceData.tokenAuth) {
    await setUpTokenAuth(
      inferenceServiceData,
      inferenceServiceData.k8sName,
      projectName,
      true,
      inferenceService,
      undefined,
      { dryRun: dryRun ?? false },
    );
  }

  return Promise.resolve({
    modelServingPlatformId: 'kserve',
    model: inferenceService,
    server: servingRuntime,
  });
};

const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  existingInferenceService?: InferenceServiceKind,
): InferenceServiceKind => {
  const {
    project,
    k8sName,
    modelFormat,
    externalRoute,
    numReplicas,
    runtimeArgs,
    environmentVariables,
  } = data;
  const inferenceService: InferenceServiceKind = existingInferenceService
    ? { ...existingInferenceService }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: k8sName,
          namespace: project,
        },
        spec: {
          predictor: {
            model: {
              modelFormat: {
                name: modelFormat.name,
                ...(modelFormat.version && { version: modelFormat.version }),
              },
              runtime: k8sName,
            },
            ...(numReplicas && {
              minReplicas: numReplicas,
              maxReplicas: numReplicas,
            }),
          },
        },
      };

  const annotations = { ...inferenceService.metadata.annotations };
  const updatedAnnotations = applyAnnotations(annotations, data);

  inferenceService.metadata.annotations = updatedAnnotations;

  if (externalRoute) {
    if (!inferenceService.metadata.labels) {
      inferenceService.metadata.labels = {};
    }
    delete inferenceService.metadata.labels['networking.kserve.io/visibility'];

    inferenceService.metadata.labels['networking.kserve.io/visibility'] = 'exposed';
  }

  const labels = { ...inferenceService.metadata.labels };
  labels[KnownLabels.DASHBOARD_RESOURCE] = 'true';
  inferenceService.metadata.labels = labels;

  // Set replica configuration
  if (numReplicas) {
    inferenceService.spec.predictor.minReplicas = numReplicas;
    inferenceService.spec.predictor.maxReplicas = numReplicas;
  }

  if (!inferenceService.spec.predictor.model) {
    inferenceService.spec.predictor.model = {};
  }

  if (runtimeArgs?.enabled && runtimeArgs.args.length > 0) {
    inferenceService.spec.predictor.model.args = runtimeArgs.args;
  }
  if (environmentVariables?.enabled && environmentVariables.variables.length > 0) {
    inferenceService.spec.predictor.model.env = environmentVariables.variables.map((envVar) => ({
      name: envVar.name,
      value: envVar.value,
    }));
  }
  return inferenceService;
};

const createInferenceService = (
  data: CreatingInferenceServiceObject,
  inferenceService?: InferenceServiceKind,
  dryRun?: boolean,
): Promise<InferenceServiceKind> => {
  const assembledInferenceService = assembleInferenceService(data, inferenceService);

  return k8sCreateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: assembledInferenceService,
      },
      { dryRun: dryRun ?? false },
    ),
  );
};

const applyAnnotations = (
  annotations: Record<string, string>,
  data: CreatingInferenceServiceObject,
) => {
  const { name, description, modelType, hardwareProfile, tokenAuth, AiAssetData } = data;
  const updatedAnnotations = { ...annotations };
  updatedAnnotations['openshift.io/display-name'] = name.trim();
  if (description) {
    updatedAnnotations['openshift.io/description'] = description;
  }
  updatedAnnotations['opendatahub.io/model-type'] = modelType;
  const isLegacyHardwareProfile = !hardwareProfile.selectedProfile?.metadata.uid;
  if (!isLegacyHardwareProfile) {
    updatedAnnotations['opendatahub.io/hardware-profile-name'] =
      hardwareProfile.selectedProfile?.metadata.name || '';
  } else {
    const legacyName = hardwareProfile.selectedProfile?.metadata.name;
    if (legacyName) {
      updatedAnnotations['opendatahub.io/legacy-hardware-profile-name'] = legacyName;
    }
  }
  updatedAnnotations['opendatahub.io/hardware-profile-namespace'] =
    hardwareProfile.selectedProfile?.metadata.namespace || '';

  if (tokenAuth && tokenAuth.length > 0) {
    updatedAnnotations['security.opendatahub.io/enable-auth'] = 'true';
  }
  if (AiAssetData?.saveAsAiAsset === true) {
    updatedAnnotations['opendatahub.io/genai-asset'] = 'true';
    if (AiAssetData.useCase) {
      updatedAnnotations['opendatahub.io/genai-use-case'] = AiAssetData.useCase;
    }
  }
  return updatedAnnotations;
};
