import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { getCatalogResource } from '~/app/shared/api/getCatalogResource';
import {
  ServingRuntime,
  ServingRuntimeCatalogAPIs,
  ServingRuntimeFilterOptionsList,
  ServingRuntimeList,
  ServingRuntimeListParams,
  ServingRuntimeVersionList,
} from '~/odh/types/servingRuntimeCatalogTypes';

const buildQueryParams = (
  queryParams: Record<string, unknown>,
  params: ServingRuntimeListParams = {},
): Record<string, unknown> => ({
  ...queryParams,
  ...Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ),
  ...(params.pageSize !== undefined && { pageSize: String(params.pageSize) }),
  ...(params.source !== undefined && { source: params.source.join(',') }),
  ...(params.sourceLabel !== undefined && { sourceLabel: params.sourceLabel.join(',') }),
});

export const getServingRuntimeList =
  (
    hostPath: string,
    queryParams: Record<string, unknown> = {},
  ): ServingRuntimeCatalogAPIs['getServingRuntimeList'] =>
  (opts, params) =>
    getCatalogResource<ServingRuntimeList>(
      hostPath,
      '/serving_runtimes',
      buildQueryParams(queryParams, params),
      opts,
    );

export const getServingRuntime =
  (
    hostPath: string,
    queryParams: Record<string, unknown> = {},
  ): ServingRuntimeCatalogAPIs['getServingRuntime'] =>
  async (opts, runtimeId) => {
    const response: unknown = await restGET(
      hostPath,
      `/serving_runtimes/${encodeURIComponent(runtimeId)}`,
      queryParams,
      opts,
    );
    if (
      typeof response === 'object' &&
      response !== null &&
      'error' in response &&
      typeof response.error === 'object' &&
      response.error !== null &&
      'code' in response.error &&
      response.error.code === '404'
    ) {
      return null;
    }
    const result = await handleRestFailures(Promise.resolve(response));
    if (isModArchResponse<ServingRuntime>(result)) {
      return result.data;
    }
    throw new Error('Invalid response format');
  };

export const getServingRuntimeVersions =
  (
    hostPath: string,
    queryParams: Record<string, unknown> = {},
  ): ServingRuntimeCatalogAPIs['getServingRuntimeVersions'] =>
  (opts, runtimeId, params) =>
    getCatalogResource<ServingRuntimeVersionList>(
      hostPath,
      `/serving_runtimes/${encodeURIComponent(runtimeId)}/versions`,
      buildQueryParams(queryParams, params),
      opts,
    );

export const getServingRuntimeFilterOptionList =
  (
    hostPath: string,
    queryParams: Record<string, unknown> = {},
  ): ServingRuntimeCatalogAPIs['getServingRuntimeFilterOptionList'] =>
  (opts) =>
    getCatalogResource<ServingRuntimeFilterOptionsList>(
      hostPath,
      '/serving_runtimes_filter_options',
      queryParams,
      opts,
    );
