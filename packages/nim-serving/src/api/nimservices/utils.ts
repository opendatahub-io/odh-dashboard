import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import type { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import { NIMServiceModel, type NIMDeployment } from './types';
import { NIM_ID } from '../../../extensions';

export const isNIMDeployment = (deployment: Deployment): deployment is NIMDeployment =>
  deployment.modelServingPlatformId === NIM_ID;

export const isNIMServiceRef = (ref: { kind: string; apiVersion: string }): boolean =>
  ref.kind === NIMServiceModel.kind &&
  ref.apiVersion.startsWith(`${NIMServiceModel.apiGroup ?? ''}/`);

export const isNIMOwned = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.ownerReferences?.some(isNIMServiceRef) ?? false;

export const NIM_SERVICE_HARDWARE_PROFILE_PATHS: CrPathConfig = {
  containerResourcesPath: 'spec.resources',
  tolerationsPath: 'spec.tolerations',
  nodeSelectorPath: 'spec.nodeSelector',
};
