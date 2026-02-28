import {
  APIOptions,
  handleRestFailures,
  UserSettings,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { Collection, NamespaceKind, Provider, ProvidersResponse } from '~/app/types';

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

export const getCollections =
  (hostPath: string, namespace: string) =>
  (opts: APIOptions): Promise<Collection[]> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/collections`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<{ items: Collection[] } | Collection[]>(response)) {
        const { data } = response;
        // Guard: handle both raw array and envelope shapes.
        return Array.isArray(data) ? data : data.items;
      }
      throw new Error('Invalid response format');
    });

export const getProviders =
  (hostPath: string, namespace: string) =>
  (opts: APIOptions): Promise<Provider[]> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/evaluations/providers`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<ProvidersResponse | Provider[]>(response)) {
        const { data } = response;
        // Guard: handle both raw array and envelope shapes.
        return Array.isArray(data) ? data : data.items;
      }
      throw new Error('Invalid response format');
    });
