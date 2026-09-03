import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  MaasModelsResponse,
  MaasVectorStoreProvidersResponse,
  NamespaceKind,
  SecretListItem,
} from '~/app/types';

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
  (namespace: string, type?: 'storage' | 'maas') =>
  (opts: APIOptions): Promise<SecretListItem[]> => {
    const queryParams: Record<string, string> = { namespace };
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

export const getSecretByName =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<Record<string, string>> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/secret/${encodeURIComponent(secretName)}`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<Record<string, string>>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getMaasModels =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<MaasModelsResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maas/models`,
        { namespace, secretName },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MaasModelsResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getMaasVectorStores =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<MaasVectorStoreProvidersResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maas/vector-stores`,
        { namespace, secretName },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MaasVectorStoreProvidersResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
