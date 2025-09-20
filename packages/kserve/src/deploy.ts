import {
  InferenceServiceKind,
  KnownLabels,
  SupportedModelFormats,
} from '@odh-dashboard/internal/k8sTypes';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/index';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { KServeDeployment } from './deployments';
import { UseModelDeploymentWizardState } from '../../model-serving/src/components/deploymentWizard/useDeploymentWizard';
import { ExternalRouteFieldData } from '../../model-serving/src/components/deploymentWizard/fields/ExternalRouteField';
import { TokenAuthenticationFieldData } from '../../model-serving/src/components/deploymentWizard/fields/TokenAuthenticationField';
import { NumReplicasFieldData } from '../../model-serving/src/components/deploymentWizard/fields/NumReplicasField';

type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  modelType: ServingRuntimeModelType;
  hardwareProfile: HardwareProfileConfig;
  modelFormat: SupportedModelFormats;
  externalRoute?: ExternalRouteFieldData;
  tokenAuth?: TokenAuthenticationFieldData;
  numReplicas?: NumReplicasFieldData;
};

export const deployKServeDeployment = async (
  wizardData: UseModelDeploymentWizardState['state'],
  projectName: string,
  existingDeployment?: KServeDeployment,
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
    modelType: wizardData.modelType.data,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
    modelFormat: wizardData.modelFormatState.modelFormat,
    externalRoute: wizardData.externalRoute.data,
    tokenAuth: wizardData.tokenAuthentication.data,
    numReplicas: wizardData.numReplicas.data,
  };

  const inferenceService = await createInferenceService(
    inferenceServiceData,
    existingDeployment?.model,
    dryRun,
  );

  return Promise.resolve({
    modelServingPlatformId: 'kserve',
    model: inferenceService,
  });
};

const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  existingInferenceService?: InferenceServiceKind,
): InferenceServiceKind => {
  const {
    project,
    name,
    k8sName,
    modelType,
    hardwareProfile,
    modelFormat,
    tokenAuth,
    externalRoute,
    numReplicas,
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
              resources: hardwareProfile.resources,
            },
            ...(numReplicas && {
              minReplicas: numReplicas,
              maxReplicas: numReplicas,
            }),
          },
        },
      };

  const annotations = { ...inferenceService.metadata.annotations };
  annotations['openshift.io/display-name'] = name.trim();
  annotations['opendatahub.io/model-type'] = modelType;
  const isLegacyHardwareProfile = !hardwareProfile.selectedProfile?.metadata.uid;
  if (!isLegacyHardwareProfile) {
    annotations['opendatahub.io/hardware-profile-name'] =
      hardwareProfile.selectedProfile?.metadata.name;
  } else {
    const legacyName = hardwareProfile.selectedProfile?.metadata.name;
    if (legacyName) {
      annotations['opendatahub.io/legacy-hardware-profile-name'] = legacyName;
    }
  }
  annotations['opendatahub.io/hardware-profile-namespace'] =
    hardwareProfile.selectedProfile?.metadata.namespace;

  if (tokenAuth && tokenAuth.length > 0) {
    annotations['security.opendatahub.io/enable-auth'] = 'true';
  }

  inferenceService.metadata.annotations = annotations;

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
