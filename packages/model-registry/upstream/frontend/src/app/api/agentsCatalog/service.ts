import { APIOptions } from 'mod-arch-core';
import { getCatalogResource } from '~/app/shared/api/getCatalogResource';
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
    return getCatalogResource<AgentList>(hostPath, '/agents', allParams, opts);
  };

export const getAgentFilterOptionList =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<CatalogFilterOptionsList> =>
    getCatalogResource<CatalogFilterOptionsList>(
      hostPath,
      '/agents_filter_options',
      queryParams,
      opts,
    );

export const getAgent =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, agentId: string): Promise<Agent> =>
    getCatalogResource<Agent>(hostPath, `/agents/${agentId}`, queryParams, opts);
