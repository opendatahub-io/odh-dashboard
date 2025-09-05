import { InferenceServiceKind, KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/index';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { KServeDeployment } from './deployments';
import { UseModelDeploymentWizardState } from '../../model-serving/src/components/deploymentWizard/useDeploymentWizard';

type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  modelType: 'predictive-model' | 'generative-model';
  hardwareProfile: HardwareProfileConfig;
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

  const inferenceServiceData: CreatingInferenceServiceObject = {
    project: projectName,
    name: wizardData.k8sNameDesc.data.name,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    modelType: wizardData.modelType.data,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
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
  const { project, name, k8sName, modelType, hardwareProfile } = data;
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
                name: 'sklearn', // TODO: Remove when we actually implement this (it's needed for basic deployment)
              },
              resources: hardwareProfile.resources,
            },
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
  inferenceService.metadata.annotations = annotations;

  const labels = { ...inferenceService.metadata.labels };
  labels[KnownLabels.DASHBOARD_RESOURCE] = 'true';
  inferenceService.metadata.labels = labels;

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
