import { APIOptions } from 'mod-arch-core';
import { CatalogArtifactList, CatalogFilterOptionsList, CatalogLabelList, CatalogModel, CatalogModelList, CatalogPerformanceArtifactList, CatalogSourceList, CatalogSourceListParams, CatalogLabelListParams, ModelCatalogFilterStates, PerformanceArtifactsParams } from '~/app/modelCatalogTypes';
export declare const getCatalogModelsBySource: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId?: string, sourceLabel?: string, paginationParams?: {
    pageSize?: string;
    nextPageToken?: string;
    orderBy?: string;
    sortOrder?: string;
}, searchKeyword?: string, filterData?: ModelCatalogFilterStates, filterOptions?: CatalogFilterOptionsList | null, filterQuery?: string, performanceParams?: {
    targetRPS?: number;
    latencyProperty?: string;
    recommendations?: boolean;
}) => Promise<CatalogModelList>;
export declare const getCatalogFilterOptionList: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<CatalogFilterOptionsList>;
export declare const getListSources: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, listParams?: CatalogSourceListParams) => Promise<CatalogSourceList>;
export declare const getCatalogModel: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, modelName: string) => Promise<CatalogModel>;
export declare const getListCatalogModelArtifacts: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, modelName: string) => Promise<CatalogArtifactList>;
export declare const getPerformanceArtifacts: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, modelName: string, params?: PerformanceArtifactsParams, filterData?: ModelCatalogFilterStates, filterOptions?: CatalogFilterOptionsList | null) => Promise<CatalogPerformanceArtifactList>;
export declare const getCatalogLabels: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, listParams?: CatalogLabelListParams) => Promise<CatalogLabelList>;
