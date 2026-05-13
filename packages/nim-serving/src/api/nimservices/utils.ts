import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { NIMServiceModel, type NIMDeployment } from './types';
import { NIM_ID } from '../../../extensions';

export const isNIMDeployment = (deployment: Deployment): deployment is NIMDeployment =>
  deployment.modelServingPlatformId === NIM_ID;

export const isNIMServiceRef = (ref: { kind: string; apiVersion: string }): boolean =>
  ref.kind === NIMServiceModel.kind &&
  ref.apiVersion.startsWith(`${NIMServiceModel.apiGroup ?? ''}/`);

export const isNIMOwned = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.ownerReferences?.some(isNIMServiceRef) ?? false;
