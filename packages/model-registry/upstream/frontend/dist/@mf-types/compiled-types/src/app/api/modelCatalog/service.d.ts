import { APIOptions } from 'mod-arch-core';
import { CatalogModel, CatalogModelArtifactList, CatalogModelList, CatalogSourceList } from '~/app/modelCatalogTypes';
export declare const getCatalogModelsBySource: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, paginationParams?: {
    pageSize?: string;
    nextPageToken?: string;
    orderBy?: string;
    sortOrder?: string;
}, searchKeyword?: string) => Promise<CatalogModelList>;
export declare const getListSources: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<CatalogSourceList>;
export declare const getCatalogModel: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, modelName: string) => Promise<CatalogModel>;
export declare const getListCatalogModelArtifacts: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, modelName: string) => Promise<CatalogModelArtifactList>;
