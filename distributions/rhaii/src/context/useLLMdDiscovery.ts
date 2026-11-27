import * as React from 'react';
import { LLMInferenceServiceModel } from '@odh-dashboard/llmd-serving/types';

const { apiGroup, apiVersion, plural } = LLMInferenceServiceModel;
const groupVersion = `${apiGroup}/${apiVersion}`;

type Discovery =
  | { status: 'disabled' | 'pending' }
  | { status: 'missing' | 'denied' | 'failed'; message: string }
  | { status: 'available'; resources: Record<string, string[]> };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const discover = async (signal: AbortSignal): Promise<Discovery> => {
  const response = await fetch(`/api/k8s/apis/${groupVersion}`, { signal });
  if (response.status === 401 || response.status === 403) {
    return { status: 'denied', message: `Access to discovery for ${groupVersion} was denied.` };
  }
  const missing = {
    status: 'missing',
    message: `Kubernetes does not serve ${groupVersion}/${plural}.`,
  } as const;
  if (response.status === 404) {
    return missing;
  }
  if (!response.ok) {
    throw new Error(`Kubernetes discovery returned HTTP ${response.status}.`);
  }
  const list: unknown = await response.json();
  if (!isRecord(list) || list.groupVersion !== groupVersion || !Array.isArray(list.resources)) {
    throw new Error(`Invalid Kubernetes discovery response for ${groupVersion}.`);
  }
  const resources: Record<string, string[]> = {};
  const items: unknown[] = list.resources;
  for (const item of items) {
    if (!isRecord(item) || item.namespaced !== true || typeof item.name !== 'string') {
      continue;
    }
    if (
      Array.isArray(item.verbs) &&
      item.verbs.every((verb: unknown) => typeof verb === 'string')
    ) {
      resources[item.name] = item.verbs;
    } else if (item.name === plural) {
      throw new Error(`Invalid verbs in Kubernetes discovery for ${plural}.`);
    }
  }
  return Object.hasOwn(resources, plural) ? { status: 'available', resources } : missing;
};

export const useLLMdDiscovery = (
  enabled: boolean,
): { discovery: Discovery; attempt: number; refresh: () => void } => {
  const [attempt, refresh] = React.useReducer((value: number) => value + 1, 0);
  const request = React.useMemo(() => ({ enabled, attempt }), [enabled, attempt]);
  const [result, setResult] = React.useState<{ request: typeof request; discovery: Discovery }>();

  React.useEffect(() => {
    if (!request.enabled) {
      return undefined;
    }
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const load = async () => {
      let discovery: Discovery;
      try {
        discovery = await discover(controller.signal);
      } catch (error) {
        discovery = {
          status: 'failed',
          message: controller.signal.aborted
            ? 'Kubernetes discovery timed out.'
            : error instanceof Error
            ? error.message
            : String(error),
        };
      } finally {
        clearTimeout(timeout);
      }
      if (active) {
        setResult({ request, discovery });
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [request]);

  const discovery: Discovery = !enabled
    ? { status: 'disabled' }
    : result?.request === request
    ? result.discovery
    : { status: 'pending' };
  return { discovery, attempt, refresh };
};
