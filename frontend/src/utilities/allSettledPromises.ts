export const allSettledPromises = <T>(
  data: Promise<T>[],
): Promise<[PromiseFulfilledResult<T>[], PromiseRejectedResult[]]> => {
  return Promise.allSettled(data).then(
    (
      promiseStates: PromiseSettledResult<T>[],
    ): [PromiseFulfilledResult<T>[], PromiseRejectedResult[]] => {
      const isFulfilledPromise = (
        promise: PromiseSettledResult<T>,
      ): promise is PromiseFulfilledResult<T> => promise.status === 'fulfilled';
      const isRejectedPromise = (
        promise: PromiseSettledResult<T>,
      ): promise is PromiseRejectedResult => promise.status === 'rejected';

      const successes = promiseStates.filter(isFulfilledPromise);
      const fails = promiseStates.filter(isRejectedPromise);

      return [successes, fails];
    },
  );
};
