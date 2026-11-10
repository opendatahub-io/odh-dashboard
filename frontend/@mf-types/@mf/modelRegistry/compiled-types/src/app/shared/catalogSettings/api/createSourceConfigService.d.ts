import { APIOptions } from 'mod-arch-core';
import { PreviewCatalogSourceQueryParams } from '~/app/modelCatalogTypes';
export type SourceConfigServiceOptions = {
    /** Extra query params applied last on preview (e.g. MCP assetType). */
    previewExtraQueryParams?: Record<string, unknown>;
};
export type SourceConfigService<TConfig, TConfigList, TPayload, TPreviewRequest, TPreviewResult> = {
    getSourceConfigs: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<TConfigList>;
    createSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: TPayload) => Promise<TConfig>;
    getSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string) => Promise<TConfig>;
    updateSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, data: Partial<TPayload>) => Promise<TConfig>;
    deleteSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string) => Promise<void>;
    previewSource: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: TPreviewRequest, additionalQueryParams?: PreviewCatalogSourceQueryParams) => Promise<TPreviewResult>;
};
export declare const createSourceConfigService: <TConfig, TConfigList, TPayload, TPreviewRequest, TPreviewResult>(options?: SourceConfigServiceOptions) => SourceConfigService<TConfig, TConfigList, TPayload, TPreviewRequest, TPreviewResult>;
