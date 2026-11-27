import type { K8sResourceCommon, K8sWatchResult } from '@odh-dashboard/k8s-core';
import {
  getK8sResourceURL,
  isK8sStatus,
  K8sStatusError,
  type K8sModelCommon,
  type QueryParams,
} from '@openshift/dynamic-plugin-sdk-utils';

const terminalStatuses = new Set([401, 403, 404, 405]);
const watchTimeoutSeconds = 30;
const requestTimeoutMs = 45_000;
const reconnectDelayMs = 1_000;
const retryDelayMs = 5_000;

type WatchEvent<T> =
  | { type: 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK'; object: T }
  | { type: 'ERROR'; object: unknown };

type ListPage<T> = {
  items: T[];
  metadata: { resourceVersion: string; continue?: string };
};

const readEvents = async <T>(
  response: Response,
  onEvent: (event: WatchEvent<T>) => void,
): Promise<void> => {
  if (!response.body) {
    throw new Error('Kubernetes returned an empty watch stream.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const emit = (line: string) => {
    if (line.trim()) {
      onEvent(JSON.parse(line));
    }
  };
  try {
    // Network chunks may split a line or a UTF-8 character.
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) {
        emit(pending + decoder.decode());
        return;
      }
      const lines = (pending + decoder.decode(value, { stream: true })).split('\n');
      pending = lines.pop() ?? '';
      lines.forEach(emit);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};

const wait = (delay: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, delay);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) {
      finish();
    }
  });

/** The HTTP stream exposes the result of the watch itself, including in-stream Status errors. */
export const watchDeploymentList = async <T extends K8sResourceCommon>(
  fetchK8s: (path: string, options: RequestInit) => Promise<Response>,
  model: K8sModelCommon,
  namespace: string,
  labelSelectors: Record<string, string> | undefined,
  signal: AbortSignal,
  onChange: (result: K8sWatchResult<T[]>) => void,
): Promise<void> => {
  const labelSelector = Object.entries(labelSelectors ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  const request = (queryParams: QueryParams) =>
    fetchK8s(
      getK8sResourceURL(model, undefined, {
        ns: namespace,
        queryParams: { ...queryParams, ...(labelSelector && { labelSelector }) },
      }),
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
      },
    );
  let resourceVersion: string | undefined;
  let items: T[] = [];
  let loaded = false;
  const byName = new Map<string, T>();
  const publish = (error?: Error) => {
    if (!signal.aborted) {
      onChange([items, loaded, error]);
    }
  };

  while (!signal.aborted) {
    let delay = reconnectDelayMs;
    try {
      if (!resourceVersion) {
        const snapshot = new Map<string, T>();
        let continuation: string | undefined;
        let listVersion: string | undefined;
        do {
          // eslint-disable-next-line no-await-in-loop
          const response = await request({
            limit: '250',
            ...(continuation && { continue: continuation }),
          });
          // eslint-disable-next-line no-await-in-loop
          const page: ListPage<T> = await response.json();
          for (const item of page.items) {
            if (item.metadata?.name) {
              snapshot.set(item.metadata.name, item);
            }
          }
          listVersion = page.metadata.resourceVersion;
          continuation = page.metadata.continue;
        } while (continuation);
        if (!listVersion) {
          throw new Error('Kubernetes returned a list without a resource version.');
        }
        resourceVersion = listVersion;
        byName.clear();
        snapshot.forEach((item, name) => byName.set(name, item));
        items = [...byName.values()];
        loaded = true;
        publish();
      }

      // eslint-disable-next-line no-await-in-loop
      const response = await request({
        watch: 'true',
        resourceVersion,
        allowWatchBookmarks: 'true',
        timeoutSeconds: String(watchTimeoutSeconds),
      });
      publish();
      // eslint-disable-next-line no-await-in-loop
      await readEvents<T>(response, ({ type, object }) => {
        if (type === 'ERROR') {
          throw isK8sStatus(object)
            ? new K8sStatusError(object)
            : new Error('Kubernetes returned an invalid watch error.');
        }
        const { name, resourceVersion: nextVersion } = object.metadata ?? {};
        resourceVersion = nextVersion || resourceVersion;
        if (name && (type === 'ADDED' || type === 'MODIFIED' || type === 'DELETED')) {
          if (type === 'DELETED') {
            byName.delete(name);
          } else {
            byName.set(name, object);
          }
          items = [...byName.values()];
          publish();
        }
      });
    } catch (cause) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the signal can abort during an await
      if (signal.aborted) {
        return;
      }
      const status = cause instanceof K8sStatusError ? cause.status.code : undefined;
      if (cause instanceof K8sStatusError && terminalStatuses.has(cause.status.code)) {
        items = [];
        loaded = false;
        publish(cause);
        return;
      }
      if (status === 410) {
        resourceVersion = undefined;
      } else {
        publish(cause instanceof Error ? cause : new Error(String(cause)));
        delay = retryDelayMs;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await wait(delay, signal);
  }
};
