import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restGET,
  restUPDATE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { NamespaceKind } from '~/app/types';

export type PromptScope = {
  type: 'project' | 'global';
  namespace: string;
};

export type MlflowPrompt = {
  name: string;
  description?: string;
  latest_version: number;
  creation_timestamp: string;
  scope: PromptScope;
};

export type MlflowPromptsResponse = {
  prompts: MlflowPrompt[];
  failedNamespaces?: string[];
};

export type UpdateGlobalMLflowNamespacesResponse = {
  success: boolean;
  globalMLflowNamespaces: string[];
  warnings?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const unwrapResponse = (response: unknown): unknown => {
  if (isModArchResponse<unknown>(response)) {
    return response.data;
  }
  return response;
};

const isPromptScope = (value: unknown): value is PromptScope =>
  isRecord(value) &&
  (value.type === 'project' || value.type === 'global') &&
  typeof value.namespace === 'string';

const isMlflowPrompt = (value: unknown): value is MlflowPrompt =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.latest_version === 'number' &&
  typeof value.creation_timestamp === 'string' &&
  (value.description === undefined || typeof value.description === 'string') &&
  isPromptScope(value.scope);

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toMlflowPromptArray = (value: unknown): MlflowPrompt[] => {
  if (!Array.isArray(value) || !value.every(isMlflowPrompt)) {
    throw new Error('Invalid response format');
  }
  return value;
};

export const getUser =
  (hostPath: string) =>
  (opts: APIOptions): Promise<UserSettings> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/user`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<UserSettings>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getNamespaces =
  (hostPath: string) =>
  (opts: APIOptions): Promise<NamespaceKind[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/namespaces`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<NamespaceKind[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getGlobalMLflowNamespaces =
  (hostPath = '') =>
  (opts: APIOptions): Promise<string[]> =>
    handleRestFailures(restGET(hostPath, '/api/config', {}, opts)).then((response) => {
      const data = unwrapResponse(response);
      if (!isRecord(data) || !isRecord(data.spec)) {
        return [];
      }
      return toStringArray(data.spec.globalMLflowNamespaces);
    });

export const updateGlobalMLflowNamespaces =
  (hostPath = '') =>
  (
    opts: APIOptions,
    globalMLflowNamespaces: string[],
  ): Promise<UpdateGlobalMLflowNamespacesResponse> =>
    handleRestFailures(
      restUPDATE(hostPath, '/api/mlflow-global-namespace', { globalMLflowNamespaces }, {}, opts),
    ).then((response) => {
      const data = unwrapResponse(response);
      if (!isRecord(data) || typeof data.success !== 'boolean') {
        throw new Error('Invalid response format');
      }
      if (
        !Array.isArray(data.globalMLflowNamespaces) ||
        !data.globalMLflowNamespaces.every((item) => typeof item === 'string')
      ) {
        throw new Error('Invalid response format');
      }
      return {
        success: data.success,
        globalMLflowNamespaces: data.globalMLflowNamespaces,
        warnings: toStringArray(data.warnings),
      };
    });

export const getPrompts =
  (hostPath: string, workspace: string) =>
  (opts: APIOptions): Promise<MlflowPromptsResponse> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/prompts`, { workspace }, opts),
    ).then((response) => {
      const data = unwrapResponse(response);
      if (!isRecord(data)) {
        throw new Error('Invalid response format');
      }
      return {
        prompts: toMlflowPromptArray(data.prompts),
        failedNamespaces: toStringArray(data.failed_namespaces),
      };
    });
