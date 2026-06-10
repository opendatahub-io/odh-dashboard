import { APIOptions } from 'mod-arch-core';
import { CatalogSourceConfig, CatalogSourceConfigList, CatalogSourceConfigPayload, CatalogSourcePreviewRequest, CatalogSourcePreviewResult, PreviewCatalogSourceQueryParams } from '~/app/modelCatalogTypes';
export declare const getCatalogSourceConfigs: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<CatalogSourceConfigList>;
export declare const createCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: CatalogSourceConfigPayload) => Promise<CatalogSourceConfig>;
export declare const getCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string) => Promise<CatalogSourceConfig>;
export declare const updateCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, data: Partial<CatalogSourceConfigPayload>) => Promise<CatalogSourceConfig>;
export declare const deleteCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string) => Promise<void>;
export declare const previewCatalogSource: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: CatalogSourcePreviewRequest, additionalQueryParams?: PreviewCatalogSourceQueryParams) => Promise<CatalogSourcePreviewResult>;
