/** K8s kinds used as model-deployment map keys (name alone is not unique across kinds). */
export type ModelDeploymentResourceKind = 'InferenceService' | 'LLMInferenceService';

/** Stable map key: `InferenceService/foo` vs `LLMInferenceService/foo`. */
export const buildModelDeploymentKey = (kind: ModelDeploymentResourceKind, name: string): string =>
  `${kind}/${name}`;
