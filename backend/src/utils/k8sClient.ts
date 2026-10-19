import {
  ApiConstructor,
  ApiType,
  CustomObjectsApi,
  KubeConfig,
  PatchStrategy,
  setHeaderOptions,
} from '@kubernetes/client-node';
import { getProxyForUrl } from 'proxy-from-env';
import { toK8sApiError } from './k8sApiError';

/** Request options selecting a JSON merge patch (`application/merge-patch+json`). */
export const MERGE_PATCH = setHeaderOptions('Content-Type', PatchStrategy.MergePatch);

/** Request options selecting a JSON patch (`application/json-patch+json`). */
export const JSON_PATCH = setHeaderOptions('Content-Type', PatchStrategy.JsonPatch);

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function' &&
  'catch' in value &&
  typeof value.catch === 'function';

/**
 * Wraps an API client so that every rejected call is mapped through `toK8sApiError`, keeping the
 * 0.12.x error shape for existing catch sites. Success values and non-API errors are unchanged.
 */
const withLegacyErrors = <T extends object>(api: T, isCustomObjectsApi: boolean): T =>
  new Proxy(api, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') {
        return value;
      }
      return (...args: unknown[]) => {
        const result: unknown = value.apply(target, args);
        return isPromiseLike(result)
          ? result.catch((e: unknown) => {
              throw toK8sApiError(e, isCustomObjectsApi);
            })
          : result;
      };
    },
  });

/** `kc.makeApiClient(ApiClass)` with errors normalised to the legacy `HttpError` shape. */
export const createK8sApiClient = <T extends ApiType>(
  kc: KubeConfig,
  apiClass: ApiConstructor<T>,
): T =>
  withLegacyErrors(
    kc.makeApiClient(apiClass),
    // Compare constructors without narrowing the generic type.
    Object.is(apiClass, CustomObjectsApi),
  );

/**
 * The 2.x client ignores the HTTP(S)_PROXY / NO_PROXY environment variables and only honours the
 * kubeconfig cluster `proxy-url`. When `E2E_USE_PROXY_FROM_ENV=true` (cluster-backed E2E runs) and
 * the current cluster has no proxy configured, set its `proxyUrl` from the environment.
 */
export const applyE2EProxyFromEnv = (kc: KubeConfig): void => {
  if (process.env.E2E_USE_PROXY_FROM_ENV !== 'true') {
    return;
  }
  const cluster = kc.getCurrentCluster();
  if (!cluster || cluster.proxyUrl) {
    return;
  }
  const proxyUrl = getProxyForUrl(cluster.server);
  if (!proxyUrl) {
    return;
  }
  kc.loadFromOptions({
    clusters: kc.getClusters().map((c) => (c.name === cluster.name ? { ...c, proxyUrl } : c)),
    users: kc.getUsers(),
    contexts: kc.getContexts(),
    currentContext: kc.getCurrentContext(),
  });
};
