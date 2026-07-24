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

const K8S_RESOURCE_REPLACEMENTS: [RegExp, string][] = [
  [/inferenceservices\.serving\.kserve\.io/i, 'model deployment'],
  [/servingruntimes\.serving\.kserve\.io/i, 'serving runtime'],
];

const getResourceDisplayName = (kind?: string): string => {
  if (kind === 'inferenceservices') {
    return 'model deployment';
  }
  return 'resource';
};

export const translateModelServingError = (error: unknown): string => {
  if (
    error instanceof K8sStatusError &&
    error.statusObject.code === 409 &&
    error.statusObject.reason === 'AlreadyExists'
  ) {
    const name = error.statusObject.details?.name;
    const resourceName = getResourceDisplayName(error.statusObject.details?.kind);
    return name
      ? `A ${resourceName} with the name "${name}" already exists. Please choose a different ${resourceName} name.`
      : `A ${resourceName} with this name already exists. Please choose a different ${resourceName} name.`;
  }

  let message = error instanceof Error ? error.message : String(error || 'Unknown error');
  for (const [pattern, replacement] of K8S_RESOURCE_REPLACEMENTS) {
    message = message.replace(pattern, replacement);
  }
  return message;
};

export const createModelServingError = (error: unknown): Error =>
  new Error(translateModelServingError(error));
