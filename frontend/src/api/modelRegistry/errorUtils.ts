import { ModelRegistryError } from '#~/concepts/modelRegistry/types';
import { isCommonStateError } from '#~/utilities/useFetchState';

const isError = (e: unknown): e is ModelRegistryError =>
  typeof e === 'object' && e !== null && ['code', 'message'].every((key) => key in e);

export const handleModelRegistryFailures = <T>(promise: Promise<T>): Promise<T> =>
  promise
    .then((result) => {
      if (isError(result)) {
        throw result;
      }
      return result;
    })
    .catch((e) => {
      if (isError(e)) {
        throw new Error(e.message);
      }
      if (isCommonStateError(e)) {
        // Common state errors are handled by useFetchState at storage level, let them deal with it
        throw e;
      }
      // eslint-disable-next-line no-console
      console.error('Unknown model registry API error', e);
      throw new Error('Error communicating with model registry server');
    });
