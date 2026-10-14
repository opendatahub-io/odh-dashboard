import { QueryClient, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { useCallback, useMemo } from 'react';
import { combineAbortSignals } from '../../api/s3/s3';
import type { FetchS3FileOptions, FetchS3JsonOptions } from '../../api/s3/s3';
import type { S3ListObjectsResponse } from '../../api/s3/types';
import { useAutoXApi } from '../../context/AutoXApiContext';

export type S3FileFetchers = {
  fetchS3File: (namespace: string, key: string, options?: FetchS3FileOptions) => Promise<Blob>;
  fetchS3Json: <T>(
    namespace: string,
    key: string,
    options?: FetchS3JsonOptions<T> & { fresh?: boolean },
  ) => Promise<T>;
};

type S3JsonQueryKeyOptions = Pick<
  FetchS3JsonOptions<unknown>,
  'secretName' | 'bucket' | 'view' | 'maxBytes'
>;

type JsonFlight = {
  networkController: AbortController;
  promise: Promise<string>;
  resolve: (text: string) => void;
  reject: (error: unknown) => void;
  callers: Set<JsonCaller>;
  started: boolean;
  cancelled: boolean;
  isCurrent: () => boolean;
  remove: () => void;
  cancel: () => void;
};

type JsonCaller = {
  settled: boolean;
  cleanup: () => void;
  resolve: (text: string) => void;
  reject: (error: unknown) => void;
};

const jsonFlights = new WeakMap<QueryClient, Map<string, JsonFlight>>();
const defaultFlightCoordinations = new WeakMap<
  QueryClient,
  Map<string, Set<DefaultFlightCoordination>>
>();
const DEFAULT_S3_JSON_STALE_TIME = 5 * 60 * 1000;

type DefaultFlightCoordination = {
  text?: string;
  cleanup: () => void;
};

const getS3JsonQueryKey = (namespace: string, key: string, options?: S3JsonQueryKeyOptions) => {
  if (!options) {
    return ['s3Json', namespace, key] as const;
  }

  return [
    's3Json',
    namespace,
    key,
    options.secretName,
    options.bucket,
    options.view,
    options.maxBytes ?? 50 * 1024 * 1024,
  ] as const;
};

export function useS3FileFetchers(): S3FileFetchers {
  const queryClient = useQueryClient();
  const { s3: s3Api } = useAutoXApi();

  const fetchS3File = useCallback<S3FileFetchers['fetchS3File']>(
    (namespace, key, options) =>
      queryClient.fetchQuery({
        queryKey: [
          's3File',
          namespace,
          key,
          options?.secretName,
          options?.bucket,
          options?.view,
          options?.maxBytes,
        ],
        queryFn: ({ signal }) => {
          const combined = combineAbortSignals(options?.signal, signal);
          return s3Api
            .fetchS3File(namespace, key, { ...options, signal: combined.signal })
            .finally(combined.cleanup);
        },
        staleTime: 5 * 60 * 1000,
      }),
    [queryClient, s3Api],
  );

  const fetchS3Json = useCallback(
    <T>(
      namespace: string,
      key: string,
      options?: FetchS3JsonOptions<T> & { fresh?: boolean },
    ): Promise<T> => {
      const maxBytes = options?.maxBytes ?? 50 * 1024 * 1024;
      const { fresh, signal: callerSignal, schema, ...s3Options } = options ?? {};
      if (callerSignal?.aborted) {
        return Promise.reject(getAbortReason(callerSignal));
      }
      const queryKey = getS3JsonQueryKey(namespace, key, { ...options, maxBytes });
      const fetchQueryKey = fresh ? [...queryKey, '__fresh__'] : queryKey;
      const flight = getOrCreateJsonFlight(
        queryClient,
        JSON.stringify(fetchQueryKey),
        (ownedFlight) => {
          if (fresh) {
            if (ownedFlight.isCurrent()) {
              queryClient.removeQueries({ queryKey: fetchQueryKey, exact: true });
            }
          } else {
            const state = queryClient.getQueryState(queryKey);
            if (state?.status === 'pending' && state.data === undefined) {
              queryClient.removeQueries({ queryKey, exact: true });
            }
          }
        },
        (sharedFlight) => {
          const cacheKey = JSON.stringify(queryKey);
          const defaultCoordination = fresh
            ? undefined
            : registerDefaultFlight(queryClient, cacheKey);
          let request: Promise<string>;
          try {
            request = queryClient.fetchQuery({
              queryKey: fetchQueryKey,
              queryFn: ({ signal }) => {
                const combined = combineAbortSignals(sharedFlight.networkController.signal, signal);
                return s3Api
                  .fetchS3File(namespace, key, {
                    ...s3Options,
                    maxBytes,
                    signal: combined.signal,
                  })
                  .then((blob) => blob.text())
                  .finally(combined.cleanup);
              },
              staleTime: fresh ? 0 : DEFAULT_S3_JSON_STALE_TIME,
            });
          } catch (error) {
            defaultCoordination?.cleanup();
            return Promise.reject(error);
          }
          return fresh
            ? request
                .then((text) => {
                  if (sharedFlight.isCurrent()) {
                    queryClient.setQueryData(queryKey, text);
                    recordFreshForDefaultFlights(queryClient, cacheKey, text);
                  }
                  return text;
                })
                .finally(() => {
                  if (sharedFlight.isCurrent()) {
                    queryClient.removeQueries({ queryKey: fetchQueryKey, exact: true });
                  }
                })
            : request
                .then((text) => {
                  if (
                    defaultCoordination?.text !== undefined &&
                    queryClient.getQueryState(queryKey) !== undefined
                  ) {
                    queryClient.setQueryData(queryKey, defaultCoordination.text);
                  }
                  return text;
                })
                .finally(() => defaultCoordination?.cleanup());
        },
      );

      return withJsonCaller(flight, callerSignal).then((text) => parseS3Json<T>(text, schema, key));
    },
    [queryClient, s3Api],
  );

  return useMemo(() => ({ fetchS3File, fetchS3Json }), [fetchS3File, fetchS3Json]);
}

function getOrCreateJsonFlight(
  queryClient: QueryClient,
  queryKey: string,
  onNoCallers: (flight: JsonFlight) => void,
  start: (flight: JsonFlight) => Promise<string>,
): JsonFlight {
  let flights = jsonFlights.get(queryClient);
  if (!flights) {
    flights = new Map();
    jsonFlights.set(queryClient, flights);
  }

  const existing = flights.get(queryKey);
  if (existing) {
    return existing;
  }

  let resolveFlight!: (text: string) => void;
  let rejectFlight!: (error: unknown) => void;
  const flight: JsonFlight = {
    networkController: new AbortController(),
    promise: new Promise<string>((resolve, reject) => {
      resolveFlight = resolve;
      rejectFlight = reject;
    }),
    resolve: resolveFlight,
    reject: rejectFlight,
    callers: new Set(),
    started: false,
    cancelled: false,
    isCurrent: () => false,
    remove: () => undefined,
    cancel: () => undefined,
  };
  flights.set(queryKey, flight);
  flight.isCurrent = () => flights.get(queryKey) === flight;
  flight.remove = () => {
    if (flights.get(queryKey) === flight) {
      flights.delete(queryKey);
    }
  };
  flight.cancel = () => {
    flight.cancelled = true;
    if (flight.started) {
      onNoCallers(flight);
    }
    flight.remove();
    flight.networkController.abort();
  };

  Promise.resolve()
    .then(() => {
      if (flight.cancelled || flight.callers.size === 0) {
        throw getAbortReason();
      }
      flight.started = true;
      return start(flight);
    })
    .then(flight.resolve, flight.reject)
    .finally(() => {
      if (flights.get(queryKey) === flight) {
        flights.delete(queryKey);
      }
      for (const caller of flight.callers) {
        caller.cleanup();
      }
      flight.callers.clear();
    });

  return flight;
}

function withJsonCaller(flight: JsonFlight, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(getAbortReason(signal));
  }

  return new Promise<string>((resolve, reject) => {
    const caller: JsonCaller = {
      settled: false,
      cleanup: () => signal?.removeEventListener('abort', abort),
      resolve,
      reject,
    };
    const abort = () => {
      if (caller.settled) {
        return;
      }
      caller.settled = true;
      caller.cleanup();
      flight.callers.delete(caller);
      reject(getAbortReason(signal));
      if (flight.callers.size === 0) {
        flight.cancel();
      }
    };

    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    flight.callers.add(caller);
    flight.promise.then(
      (text) => {
        if (!caller.settled) {
          caller.settled = true;
          caller.cleanup();
          flight.callers.delete(caller);
          caller.resolve(text);
        }
      },
      (error: unknown) => {
        if (!caller.settled) {
          caller.settled = true;
          caller.cleanup();
          flight.callers.delete(caller);
          caller.reject(error);
        }
      },
    );
  });
}

function getAbortReason(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException('The operation was aborted', 'AbortError');
}

function parseS3Json<T>(text: string, schema: z.ZodSchema<T> | undefined, key: string): T {
  try {
    const parsed: unknown = JSON.parse(text);
    if (schema) {
      return schema.parse(parsed);
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- no schema provided, caller accepts risk
    return parsed as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid JSON structure from S3 file "${key}": ${issues}`);
    }
    throw new Error(
      `Failed to parse JSON from S3 file "${key}": ${
        error instanceof Error ? error.message : 'Invalid JSON'
      }`,
    );
  }
}

function registerDefaultFlight(
  queryClient: QueryClient,
  cacheKey: string,
): DefaultFlightCoordination {
  let coordinations = defaultFlightCoordinations.get(queryClient);
  if (!coordinations) {
    coordinations = new Map();
    defaultFlightCoordinations.set(queryClient, coordinations);
  }
  let active = coordinations.get(cacheKey);
  if (!active) {
    active = new Set();
    coordinations.set(cacheKey, active);
  }
  const coordination: DefaultFlightCoordination = { cleanup: () => undefined };
  active.add(coordination);
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'removed' && JSON.stringify(event.query.queryKey) === cacheKey) {
      coordination.text = undefined;
      coordination.cleanup();
    }
  });
  coordination.cleanup = () => {
    unsubscribe();
    active.delete(coordination);
    if (active.size === 0) {
      coordinations.delete(cacheKey);
    }
  };
  return coordination;
}

function recordFreshForDefaultFlights(
  queryClient: QueryClient,
  cacheKey: string,
  text: string,
): void {
  for (const coordination of defaultFlightCoordinations.get(queryClient)?.get(cacheKey) ?? []) {
    coordination.text = text;
  }
}

export function useS3CacheActions(): {
  invalidateS3JsonCache: (namespace: string, key: string) => Promise<void>;
  invalidateS3Results: (namespace?: string) => Promise<void>;
} {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      invalidateS3JsonCache: async (namespace: string, key: string) => {
        await queryClient.invalidateQueries({ queryKey: getS3JsonQueryKey(namespace, key) });
      },
      invalidateS3Results: async (namespace?: string) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['s3Files', namespace] }),
          queryClient.invalidateQueries({ queryKey: ['s3Json', namespace] }),
          queryClient.invalidateQueries({ queryKey: ['s3File', namespace] }),
        ]);
      },
    }),
    [queryClient],
  );
}

export function useS3FileOperations(): {
  listS3Files: (
    namespace: string,
    path: string,
    signal?: AbortSignal,
  ) => Promise<S3ListObjectsResponse>;
} {
  const { s3: s3Api } = useAutoXApi();
  return useMemo(
    () => ({
      listS3Files: (namespace: string, path: string, signal?: AbortSignal) =>
        s3Api.getFiles('', { signal }, { namespace, path }),
    }),
    [s3Api],
  );
}
