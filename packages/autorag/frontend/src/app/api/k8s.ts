import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { NamespaceKind, SecretListItem } from '~/app/types';

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

export const getSecrets =
  (hostPath: string) =>
  (namespace: string, type?: 'storage' | 'lls') =>
  (opts: APIOptions): Promise<SecretListItem[]> => {
    const queryParams: Record<string, string> = { resource: namespace };
    if (type) {
      queryParams.type = type;
    }
    return handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/secrets`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<SecretListItem[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };
