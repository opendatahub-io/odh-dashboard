import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import type { NamespaceKind, SecretListItem } from './types';

export type K8sApi = {
  getUser: (hostPath: string) => (opts: APIOptions) => Promise<UserSettings>;
  getNamespaces: (hostPath: string) => (opts: APIOptions) => Promise<NamespaceKind[]>;
  getSecrets: (
    hostPath: string,
  ) => (namespace: string, type?: string) => (opts: APIOptions) => Promise<SecretListItem[]>;
};

/**
 * Creates the shared k8s API surface (user, namespaces, secrets) for a given
 * product's BFF URL prefix/API version.
 */
export function createK8sApi(urlPrefix: string, bffApiVersion: string): K8sApi {
  const getUser =
    (hostPath: string) =>
    (opts: APIOptions): Promise<UserSettings> =>
      handleRestFailures(
        restGET(hostPath, `${urlPrefix}/api/${bffApiVersion}/user`, {}, opts),
      ).then((response) => {
        if (isModArchResponse<UserSettings>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      });

  const getNamespaces =
    (hostPath: string) =>
    (opts: APIOptions): Promise<NamespaceKind[]> =>
      handleRestFailures(
        restGET(hostPath, `${urlPrefix}/api/${bffApiVersion}/namespaces`, {}, opts),
      ).then((response) => {
        if (isModArchResponse<NamespaceKind[]>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      });

  const getSecrets =
    (hostPath: string) =>
    (namespace: string, type?: string) =>
    (opts: APIOptions): Promise<SecretListItem[]> => {
      const queryParams: Record<string, string> = { namespace };
      if (type) {
        queryParams.type = type;
      }
      return handleRestFailures(
        restGET(hostPath, `${urlPrefix}/api/${bffApiVersion}/secrets`, queryParams, opts),
      ).then((response) => {
        if (isModArchResponse<SecretListItem[]>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      });
    };

  return { getUser, getNamespaces, getSecrets };
}
