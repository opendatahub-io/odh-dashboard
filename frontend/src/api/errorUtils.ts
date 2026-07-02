import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { AxiosError } from 'axios';

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'Status';

export class K8sStatusError extends Error {
  public statusObject: K8sStatus & { details?: { kind?: string; name?: string } };

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

const K8S_RESOURCE_REPLACEMENTS: [RegExp, string][] = [
  [/inferenceservices\.serving\.kserve\.io/i, 'model deployment'],
  [/servingruntimes\.serving\.kserve\.io/i, 'serving runtime'],
];

export const translateModelServingError = (error: unknown): string => {
  if (
    error instanceof K8sStatusError &&
    error.statusObject.code === 409 &&
    error.statusObject.reason === 'AlreadyExists'
  ) {
    const name = error.statusObject.details?.name;
    return name
      ? `A model deployment with the name "${name}" already exists. Please choose a different model deployment name.`
      : 'A model deployment with this name already exists. Please choose a different model deployment name.';
  }

  let message = error instanceof Error ? error.message : String(error || 'Unknown error');
  for (const [pattern, replacement] of K8S_RESOURCE_REPLACEMENTS) {
    message = message.replace(pattern, replacement);
  }
  return message;
};

export const createModelServingError = (error: unknown): Error =>
  new Error(translateModelServingError(error));
