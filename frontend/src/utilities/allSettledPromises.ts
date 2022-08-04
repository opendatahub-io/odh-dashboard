type TypedPromiseRejectedResult<R> = PromiseRejectedResult & { reason: R };

export const allSettledPromises = <T, E extends unknown = undefined>(
  data: Promise<T>[],
): Promise<[PromiseFulfilledResult<T>[], TypedPromiseRejectedResult<E>[]]> => {
  return Promise.allSettled(data).then(
    (
      promiseStates: PromiseSettledResult<T>[],
    ): [PromiseFulfilledResult<T>[], TypedPromiseRejectedResult<E>[]] => {
      const isFulfilledPromise = (
        promise: PromiseSettledResult<T>,
      ): promise is PromiseFulfilledResult<T> => promise.status === 'fulfilled';
      const isRejectedPromise = (
        promise: PromiseSettledResult<T>,
      ): promise is TypedPromiseRejectedResult<E> => promise.status === 'rejected';

      const successes = promiseStates.filter(isFulfilledPromise);
      const fails = promiseStates.filter(isRejectedPromise);

      return [successes, fails];
    },
  );
};
