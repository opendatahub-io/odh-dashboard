import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type { CreateProviderRequest, Provider, ProviderList } from '~/app/types/provider';
import type { ProviderProfile, ProviderProfileList } from '~/app/types/provider';

const gatewayProvidersPath = (gwName: string): string =>
  `${URL_PREFIX}/api/${BFF_API_VERSION}/gateways/${encodeURIComponent(gwName)}/providers`;

export const listProviders =
  (hostPath: string, gwName: string) =>
  (opts: APIOptions): Promise<Provider[]> =>
    handleRestFailures(
      restGET(hostPath, gatewayProvidersPath(gwName), {}, opts),
    ).then((response) => {
      if (isModArchResponse<ProviderList>(response)) {
        return response.data.providers;
      }
      throw new Error('Invalid response format');
    });

export const createProvider =
  (hostPath = '', gwName: string) =>
  (opts: APIOptions, request: CreateProviderRequest): Promise<Provider> =>
    handleRestFailures(
      restCREATE(hostPath, gatewayProvidersPath(gwName), request, {}, opts),
    ).then((response) => {
      if (isModArchResponse<Provider>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const deleteProvider =
  (hostPath = '', gwName: string) =>
  (opts: APIOptions, provName: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${gatewayProvidersPath(gwName)}/${encodeURIComponent(provName)}`,
        {},
        {},
        { ...opts, parseJSON: false },
      ),
    ).then(() => undefined);

export const listProviderProfiles =
  (hostPath: string, gwName: string) =>
  (opts: APIOptions): Promise<ProviderProfile[]> =>
    handleRestFailures(
      restGET(
        hostPath,
        `/api/v1/gateways/${encodeURIComponent(gwName)}/provider-profiles`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<ProviderProfileList>(response)) {
        return response.data.profiles;
      }
      throw new Error('Invalid response format');
    });
