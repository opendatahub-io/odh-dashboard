import { APIOptions } from 'mod-arch-core';
import { PaginationParams } from './shared/types/catalogTypes';
import { CatalogFilterOptionsList } from './modelCatalogTypes';
export type AgentArtifact = {
    uri: string;
    createTimeSinceEpoch?: string;
    lastUpdateTimeSinceEpoch?: string;
};
export type AgentEnvVar = {
    name: string;
    required: boolean;
    description?: string;
};
export type Agent = {
    id: string;
    name: string;
    source_id?: string;
    displayName?: string;
    description?: string;
    readme?: string;
    framework?: string;
    labels?: string[];
    logo?: string;
    repositoryUrl?: string;
    env?: AgentEnvVar[];
    artifacts?: AgentArtifact[];
    customProperties?: Record<string, unknown>;
    createTimeSinceEpoch?: string;
    lastUpdateTimeSinceEpoch?: string;
};
export type AgentList = PaginationParams & {
    items?: Agent[];
};
export type AgentListParams = {
    sourceLabel?: string;
    pageSize?: number;
    nextPageToken?: string;
    filterQuery?: string;
    namedQuery?: string;
    orderBy?: string;
    sortOrder?: string;
    q?: string;
};
export type GetAgentList = (opts: APIOptions, listParams?: AgentListParams) => Promise<AgentList>;
export type GetAgentFilterOptionList = (opts: APIOptions) => Promise<CatalogFilterOptionsList>;
export type GetAgent = (opts: APIOptions, agentId: string) => Promise<Agent>;
export type AgentCatalogSpecificAPIs = {
    getAgentList: GetAgentList;
    getAgentFilterOptionList: GetAgentFilterOptionList;
    getAgent: GetAgent;
};
