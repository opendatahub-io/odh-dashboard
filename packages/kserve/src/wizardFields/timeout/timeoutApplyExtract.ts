import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';

export type TimeoutConfigFieldData = {
  timeout?: number;
  return401?: boolean;
};

export const DEFAULT_TIMEOUT = 30;

export const applyTimeoutConfig = (
  inferenceService: InferenceServiceKind,
  timeoutConfig?: TimeoutConfigFieldData,
): InferenceServiceKind => {
  if (!timeoutConfig) {
    return inferenceService;
  }

  const result = structuredClone(inferenceService);

  if (!result.metadata.annotations) {
    result.metadata.annotations = {};
  }

  // Clear existing values for update scenarios
  delete result.metadata.annotations['security.opendatahub.io/auth-proxy-type'];

  // Clear existing timeout if present (predictor may not exist during initial assembly)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (result.spec.predictor && 'timeout' in result.spec.predictor) {
    delete result.spec.predictor.timeout;
  }

  // Set timeout
  if (timeoutConfig.timeout !== undefined) {
    result.spec.predictor = {
      ...result.spec.predictor,
      timeout: timeoutConfig.timeout,
    };
  }

  // Set auth-proxy-type if return401 is true
  if (timeoutConfig.return401) {
    result.metadata.annotations['security.opendatahub.io/auth-proxy-type'] = 'kube-rbac-proxy';
  }

  return result;
};

export const extractTimeoutConfig = (deployment: {
  model: InferenceServiceKind;
}): TimeoutConfigFieldData => {
  const { timeout } = deployment.model.spec.predictor;
  const authProxyType =
    deployment.model.metadata.annotations?.['security.opendatahub.io/auth-proxy-type'];

  return {
    timeout: timeout ?? DEFAULT_TIMEOUT,
    return401: authProxyType === 'kube-rbac-proxy',
  };
};
