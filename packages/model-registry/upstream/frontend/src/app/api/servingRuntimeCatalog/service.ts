import { getCatalogResource } from '~/app/shared/api/getCatalogResource';
import {
  ServingRuntime,
  ServingRuntimeCatalogAPIs,
  ServingRuntimeFilterOptionsList,
  ServingRuntimeList,
  ServingRuntimeListParams,
  ServingRuntimeVersionList,
} from '~/app/servingRuntimeCatalogTypes';

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
  (opts, runtimeId) =>
    getCatalogResource<ServingRuntime>(
      hostPath,
      `/serving_runtimes/${encodeURIComponent(runtimeId)}`,
      queryParams,
      opts,
    );

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
