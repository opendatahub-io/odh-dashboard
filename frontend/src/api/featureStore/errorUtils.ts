import { FeatureStoreError } from '#~/pages/featureStore/types/global';
import { isCommonStateError } from '#~/utilities/useFetchState';

const isError = (e: unknown): e is FeatureStoreError =>
  typeof e === 'object' && e !== null && ['code', 'message'].every((key) => key in e);

export const handleFeatureStoreFailures = <T>(promise: Promise<T>): Promise<T> =>
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
      console.error('Unknown feature store API error', e);
      throw new Error('Error communicating with feature store server');
    });
