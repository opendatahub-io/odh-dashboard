import { K8sStatusError } from '@odh-dashboard/k8s-core';

export const TRACKING_ERROR_UNKNOWN = 'unknown_error';

export const errorCategory = (e: unknown): string => {
  const code = e instanceof K8sStatusError ? e.statusObject.code : undefined;

  // API response types do not validate runtime data; never interpolate an unchecked code.
  return typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599
    ? `k8s_${code}`
    : TRACKING_ERROR_UNKNOWN;
};
