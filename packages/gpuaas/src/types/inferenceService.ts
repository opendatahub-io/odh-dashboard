import type {
  ContainerResources,
  K8sResourceCommon,
  NodeSelector,
  Toleration,
} from '@odh-dashboard/k8s-core';

/** Minimal InferenceService shape for Quota usage hardware-profile resolution (no model-serving dep). */
export type WorkloadInferenceService = K8sResourceCommon & {
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    predictor?: {
      model?: {
        resources?: ContainerResources;
      };
      tolerations?: Toleration[];
      nodeSelector?: NodeSelector;
    };
  };
};
