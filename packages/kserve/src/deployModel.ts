import type { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import {
  type SupportedModelFormats,
  type InferenceServiceKind,
  KnownLabels,
} from '@odh-dashboard/internal/k8sTypes';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/index';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import {
  applyAiAvailableAssetAnnotations,
  applyAuth,
  applyEnvironmentVariables,
  applyModelFormat,
  applyRuntimeArgs,
} from './deployUtils';
import { applyHardwareProfileToDeployment, applyReplicas } from './hardware';
import type { AvailableAiAssetsFieldsData } from '../../model-serving/src/components/deploymentWizard/fields/AvailableAiAssetsFields';
import type { EnvironmentVariablesFieldData } from '../../model-serving/src/components/deploymentWizard/fields/EnvironmentVariablesField';
import type { ExternalRouteFieldData } from '../../model-serving/src/components/deploymentWizard/fields/ExternalRouteField';
import type { NumReplicasFieldData } from '../../model-serving/src/components/deploymentWizard/fields/NumReplicasField';
import type { RuntimeArgsFieldData } from '../../model-serving/src/components/deploymentWizard/fields/RuntimeArgsField';
import type { TokenAuthenticationFieldData } from '../../model-serving/src/components/deploymentWizard/fields/TokenAuthenticationField';
import type { ModelLocationData } from '../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';
import { CreateConnectionData } from '../../model-serving/src/components/deploymentWizard/fields/CreateConnectionInputFields';

export type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  description: string;
  modelType?: ServingRuntimeModelType;
  modelLocationData?: ModelLocationData;
  hardwareProfile: HardwareProfileConfig;
  modelFormat?: SupportedModelFormats;
  externalRoute?: ExternalRouteFieldData;
  tokenAuth?: TokenAuthenticationFieldData;
  numReplicas?: NumReplicasFieldData;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  aiAssetData?: AvailableAiAssetsFieldsData;
  createConnectionData?: CreateConnectionData;
};

const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  existingInferenceService?: InferenceServiceKind,
): InferenceServiceKind => {
  const {
    project,
    k8sName,
    name,
    description,
    modelType,
    modelFormat,
    hardwareProfile,
    numReplicas,
    aiAssetData,
    externalRoute,
    tokenAuth,
    runtimeArgs,
    environmentVariables,
  } = data;
  let inferenceService: InferenceServiceKind = existingInferenceService
    ? { ...existingInferenceService }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: k8sName,
          namespace: project,
          annotations: {
            'openshift.io/display-name': name,
            'openshift.io/description': description,
            'opendatahub.io/model-type': modelType ?? ServingRuntimeModelType.GENERATIVE,
          },
          labels: {
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          },
        },
        spec: {
          predictor: {
            model: {
              runtime: k8sName,
            },
          },
        },
      };

  inferenceService = applyModelFormat(inferenceService, modelFormat);

  inferenceService = applyHardwareProfileToDeployment(inferenceService, hardwareProfile);

  inferenceService = applyAuth(
    inferenceService,
    (tokenAuth && tokenAuth.length > 0) ?? false,
    externalRoute ?? false,
  );

  inferenceService = applyAiAvailableAssetAnnotations(
    inferenceService,
    aiAssetData ?? {
      saveAsAiAsset: false,
      useCase: '',
    },
  );

  inferenceService = applyReplicas(inferenceService, numReplicas ?? 1);

  inferenceService = applyRuntimeArgs(
    inferenceService,
    runtimeArgs ?? { args: [], enabled: false },
  );

  inferenceService = applyEnvironmentVariables(
    inferenceService,
    environmentVariables ?? { variables: [], enabled: false },
  );

  return inferenceService;
};

export const createInferenceService = (
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
