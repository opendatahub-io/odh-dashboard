import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { createK8sApi } from '@odh-dashboard/autox-core/ui/api';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { OgxModelsResponse, OgxVectorStoreProvidersResponse } from '~/app/types';

export const { getUser, getNamespaces, getSecrets } = createK8sApi(URL_PREFIX, BFF_API_VERSION);

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

export const getOgxModels =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<OgxModelsResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/ogx/models`,
        { namespace, secretName },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<OgxModelsResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getOgxVectorStores =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<OgxVectorStoreProvidersResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/ogx/vector-stores`,
        { namespace, secretName },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<OgxVectorStoreProvidersResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
