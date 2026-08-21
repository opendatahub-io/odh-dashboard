import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
