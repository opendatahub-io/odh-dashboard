import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { Agent, AgentList, AgentListParams } from '~/app/agentsCatalogTypes';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';

export const getAgentList =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, listParams?: AgentListParams): Promise<AgentList> => {
    const pageSize = listParams?.pageSize !== undefined ? String(listParams.pageSize) : undefined;
    const allParams = {
      ...queryParams,
      ...(listParams?.sourceLabel !== undefined && { sourceLabel: listParams.sourceLabel }),
      ...(listParams?.nextPageToken !== undefined && { nextPageToken: listParams.nextPageToken }),
      ...(pageSize !== undefined && { pageSize }),
      ...(listParams?.filterQuery !== undefined &&
        listParams.filterQuery !== '' && { filterQuery: listParams.filterQuery }),
      ...(listParams?.namedQuery !== undefined &&
        listParams.namedQuery !== '' && { namedQuery: listParams.namedQuery }),
      ...(listParams?.orderBy !== undefined &&
        listParams.orderBy !== '' && { orderBy: listParams.orderBy }),
      ...(listParams?.sortOrder !== undefined &&
        listParams.sortOrder !== '' && { sortOrder: listParams.sortOrder }),
      ...(listParams?.q !== undefined && listParams.q !== '' && { q: listParams.q }),
    };
    return handleRestFailures(restGET(hostPath, '/agents', allParams, opts)).then((response) => {
      if (isModArchResponse<AgentList>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };

export const getAgentFilterOptionList =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<CatalogFilterOptionsList> =>
    handleRestFailures(restGET(hostPath, '/agents_filter_options', queryParams, opts)).then(
      (response) => {
        if (isModArchResponse<CatalogFilterOptionsList>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      },
    );

export const getAgent =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, agentId: string): Promise<Agent> =>
    handleRestFailures(restGET(hostPath, `/agents/${agentId}`, queryParams, opts)).then(
      (response) => {
        if (isModArchResponse<Agent>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      },
    );
