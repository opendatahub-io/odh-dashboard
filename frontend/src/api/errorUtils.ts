import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { AxiosError } from 'axios';

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  (data as K8sStatus).kind === 'Status';

export class K8sStatusError extends Error {
  public statusObject: K8sStatus;

  constructor(statusObject: K8sStatus) {
    super(statusObject.message);

    this.statusObject = statusObject;
  }
}

const isAxiosErrorWithResponseMessage = (
  error?: Error | AxiosError,
): error is AxiosError<{ message: string }> =>
  Boolean(
    error && typeof (error as AxiosError<{ message: string }>).response?.data.message === 'string',
  );

export const throwErrorFromAxios = (error: Error | AxiosError): never => {
  if (isAxiosErrorWithResponseMessage(error)) {
    throw new Error(error.response?.data.message);
  }
  throw error;
};
