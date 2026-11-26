import { AxiosError } from 'axios';
import { isK8sStatus, K8sStatusError } from '../errorUtils';

export const getGenericErrorCode = (error: unknown): number | undefined => {
  if (error instanceof K8sStatusError) {
    return error.statusObject.code;
  }
  if (error instanceof AxiosError) {
    return error.response?.status;
  }
  // The SDK transport wraps a Kubernetes Status in error.status.
  if (error instanceof Error && 'status' in error && isK8sStatus(error.status)) {
    return typeof error.status.code === 'number' ? error.status.code : undefined;
  }
  return undefined;
};
