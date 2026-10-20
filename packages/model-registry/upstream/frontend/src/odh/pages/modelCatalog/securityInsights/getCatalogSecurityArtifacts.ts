import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { CatalogSecurityArtifactList } from './securityInsightsTypes';

/**
 * Fetches safety and security evaluation artifacts for a catalog model from the model catalog
 * BFF's `security_artifacts` endpoint. This is the same endpoint the eval-hub BFF previously
 * proxied to; calling it directly lets the Safety tab live in the model-registry module and
 * drop its dependency on the eval-hub module (TrustyAI).
 */
export const getCatalogSecurityArtifacts =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (
    opts: APIOptions,
    sourceId: string,
    modelName: string,
    namespace?: string,
    pageSize?: number,
  ): Promise<CatalogSecurityArtifactList> => {
    const allParams: Record<string, unknown> = {
      ...queryParams,
      ...(namespace && { namespace }),
      ...(pageSize !== undefined && { pageSize }),
    };
    return handleRestFailures(
      restGET(hostPath, `/sources/${sourceId}/security_artifacts/${modelName}`, allParams, opts),
    ).then((response) => {
      if (isModArchResponse<CatalogSecurityArtifactList>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };
