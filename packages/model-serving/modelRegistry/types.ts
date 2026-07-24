import type { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';

/** Mirrors model-registry's DeployPrefillData to avoid a compile-time dependency. */
export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  returnRouteValue?: string;
  cancelReturnRouteValue?: string;
  wizardStartIndex?: number;
  modelType?: ServingRuntimeModelType;
  prefillAlertText?: string;
};

/** Minimal registered-model ref — only `id` is consumed by model-serving. */
export type RegisteredModelRef = {
  id: string;
};
