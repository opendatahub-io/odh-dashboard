import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type { AgentLifecycleParams, LifecycleResult } from '~/app/types/agentLifecycle';

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLifecycleResult = (value: unknown): value is LifecycleResult => {
  if (!isUnknownRecord(value)) {
    return false;
  }

  return (
    typeof value.success === 'boolean' &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.namespace === 'string' &&
    value.namespace.length > 0 &&
    (value.action === 'stop' || value.action === 'start' || value.action === 'restart') &&
    typeof value.message === 'string'
  );
};

const agentRuntimeLifecyclePath = (namespace: string, name: string): string =>
  `${URL_PREFIX}/api/${BFF_API_VERSION}/agents/runtimes/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;

export const stopAgent =
  (hostPath = '') =>
  (opts: APIOptions, params: AgentLifecycleParams): Promise<LifecycleResult> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${agentRuntimeLifecyclePath(params.namespace, params.name)}/stop`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (
        !isModArchResponse<unknown>(response) ||
        !isLifecycleResult(response.data) ||
        response.data.action !== 'stop'
      ) {
        throw new Error('Invalid response format');
      }
      if (!response.data.success) {
        throw new Error(response.data.message || 'Stop operation failed');
      }
      return response.data;
    });

export const startAgent =
  (hostPath = '') =>
  (opts: APIOptions, params: AgentLifecycleParams): Promise<LifecycleResult> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${agentRuntimeLifecyclePath(params.namespace, params.name)}/start`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (
        !isModArchResponse<unknown>(response) ||
        !isLifecycleResult(response.data) ||
        response.data.action !== 'start'
      ) {
        throw new Error('Invalid response format');
      }
      if (!response.data.success) {
        throw new Error(response.data.message || 'Start operation failed');
      }
      return response.data;
    });

export const restartAgent =
  (hostPath = '') =>
  (opts: APIOptions, params: AgentLifecycleParams): Promise<LifecycleResult> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${agentRuntimeLifecyclePath(params.namespace, params.name)}/restart`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (
        !isModArchResponse<unknown>(response) ||
        !isLifecycleResult(response.data) ||
        response.data.action !== 'restart'
      ) {
        throw new Error('Invalid response format');
      }
      if (!response.data.success) {
        throw new Error(response.data.message || 'Restart operation failed');
      }
      return response.data;
    });

export const deleteAgent =
  (hostPath = '') =>
  (opts: APIOptions, params: AgentLifecycleParams): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        agentRuntimeLifecyclePath(params.namespace, params.name),
        {},
        {},
        {
          ...opts,
          // BFF returns 204 No Content with an empty body.
          parseJSON: false,
        },
      ),
    ).then(() => undefined);
