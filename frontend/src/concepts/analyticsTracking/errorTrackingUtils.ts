import { K8sStatusError } from '@odh-dashboard/k8s-core';

export const TRACKING_ERROR_UNKNOWN = 'unknown_error';

export const errorCategory = (e: unknown): string =>
  e instanceof K8sStatusError ? `k8s_${e.statusObject.code}` : TRACKING_ERROR_UNKNOWN;
