import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { AxiosError } from 'axios';

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'Status';

export class K8sStatusError extends Error {
  public statusObject: K8sStatus & { details?: { kind?: string } };

  constructor(statusObject: K8sStatus) {
    super(statusObject.message);

    this.statusObject = statusObject;
  }
}

const isAxiosErrorWithResponseMessage = (
  error?: Error | AxiosError,
): error is AxiosError<{ message: string }> =>
  Boolean(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    error && typeof (error as AxiosError<{ message: string }>).response?.data.message === 'string',
  );

export const throwErrorFromAxios = (error: Error | AxiosError): never => {
  if (isAxiosErrorWithResponseMessage(error)) {
    throw new Error(error.response?.data.message);
  }
  throw error;
};

export const getGenericErrorCode = (error: unknown): number | undefined => {
  if (error instanceof K8sStatusError) {
    return error.statusObject.code;
  }
  if (error instanceof AxiosError) {
    return error.response?.status;
  }
  return undefined;
};
