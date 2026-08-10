export const DETAIL_POLL_INTERVAL_MS = 10_000;
export const RETRY_DELAY_MS = 5_000;
export const MAX_RETRY_ATTEMPTS = 5;
export const MAX_CONCURRENT_DETAIL_REQUESTS = 5;

type RequestPool = {
  enqueue: <T>(fn: () => Promise<T>) => Promise<T>;
};

export const createRequestPool = (maxConcurrent = MAX_CONCURRENT_DETAIL_REQUESTS): RequestPool => {
  const queue: (() => Promise<void>)[] = [];
  let activeCount = 0;

  const dispatch = (): void => {
    while (activeCount < maxConcurrent && queue.length > 0) {
      const run = queue.shift()!;
      activeCount++;
      run().finally(() => {
        activeCount--;
        dispatch();
      });
    }
  };

  return {
    enqueue: <T>(fn: () => Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        queue.push(() => fn().then(resolve, reject));
        dispatch();
      }),
  };
};
