import { AxiosError } from 'axios';
import { K8sStatusError } from '@odh-dashboard/k8s-core';

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

const K8S_SERVING_RESOURCE_PATTERN = /(?:servingruntimes|inferenceservices)\.serving\.kserve\.io/i;

export const translateModelServingError = (error: unknown): string => {
  if (error instanceof K8sStatusError && error.statusObject.code === 409) {
    const name = error.statusObject.details?.name;
    return name
      ? `A model deployment with the name "${name}" already exists. Please choose a different Model deployment name.`
      : 'A model deployment with this name already exists. Please choose a different Model deployment name.';
  }

  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  return message.replace(K8S_SERVING_RESOURCE_PATTERN, 'model deployment');
};

export const createModelServingError = (error: unknown): Error =>
  new Error(translateModelServingError(error));
