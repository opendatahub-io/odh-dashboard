import { APIOptions } from 'mod-arch-core';
import { Agent, AgentList, AgentListParams } from '~/app/agentsCatalogTypes';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';
export declare const getAgentList: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, listParams?: AgentListParams) => Promise<AgentList>;
export declare const getAgentFilterOptionList: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<CatalogFilterOptionsList>;
export declare const getAgent: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, agentId: string) => Promise<Agent>;
