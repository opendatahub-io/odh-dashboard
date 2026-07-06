import { TypedPromiseRejectedResult } from '#~/types';

export const allSettledPromises = <T, E = undefined>(
  data: Promise<T>[],
): Promise<
  [PromiseFulfilledResult<T>[], TypedPromiseRejectedResult<E>[], PromiseSettledResult<T>[]]
> =>
  //Use of `Promise.allSettled` is justified as this utility is a wrapper with type improvements.
  // eslint-disable-next-line no-restricted-properties
  Promise.allSettled(data).then(
    (
      promiseStates: PromiseSettledResult<T>[],
    ): [
      PromiseFulfilledResult<T>[],
      TypedPromiseRejectedResult<E>[],
      PromiseSettledResult<T>[],
    ] => {
      const isFulfilledPromise = (
        promise: PromiseSettledResult<T>,
      ): promise is PromiseFulfilledResult<T> => promise.status === 'fulfilled';
      const isRejectedPromise = (
        promise: PromiseSettledResult<T>,
      ): promise is TypedPromiseRejectedResult<E> => promise.status === 'rejected';

      const successes = promiseStates.filter(isFulfilledPromise);
      const fails = promiseStates.filter(isRejectedPromise);

      return [successes, fails, promiseStates];
    },
  );
