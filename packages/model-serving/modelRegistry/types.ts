import type { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';

/**
 * Data shape for prefilling the deployment wizard from model-catalog.
 * Structurally mirrors the type defined in model-registry's
 * `model-catalog-deploy` extension point so the two remain compatible
 * without a compile-time package dependency.
 */
export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  returnRouteValue?: string;
  cancelReturnRouteValue?: string;
  wizardStartIndex?: number;
  modelType?: ServingRuntimeModelType;
  prefillAlertText?: string;
};

/**
 * Minimal interface for a registered-model reference.
 * Only the fields consumed by model-serving components are included,
 * avoiding a dependency on the full model-registry type.
 */
export type RegisteredModelRef = {
  id: string;
};
