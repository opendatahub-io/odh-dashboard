import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { TimeoutFieldValue } from './TimeoutField';
import { KServeDeployment } from '../../deployments';

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

  // Clear existing auth-proxy-type for update scenarios
  delete result.metadata.annotations['security.opendatahub.io/auth-proxy-type'];

  // Set timeout (spread will overwrite any existing timeout value)
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

/**
 * Apply timeout field data to a KServe deployment during assembly
 */
export const applyTimeoutFieldData = (
  deployment: KServeDeployment,
  fieldData: TimeoutFieldValue,
): KServeDeployment => {
  const updatedModel = applyTimeoutConfig(deployment.model, {
    timeout: fieldData.timeout,
    return401: fieldData.return401,
  });
  return {
    ...deployment,
    model: updatedModel,
  };
};

/**
 * Extract timeout field data from an existing KServe deployment
 */
export const extractTimeoutFieldData = (deployment: KServeDeployment): TimeoutFieldValue => {
  const config = extractTimeoutConfig(deployment);
  return {
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    return401: config.return401 ?? false,
  };
};
