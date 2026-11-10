import { APIOptions } from 'mod-arch-core';
import { PreviewCatalogSourceQueryParams } from '~/app/modelCatalogTypes';
import { CatalogSettingsPreviewResult, CatalogSettingsPreviewTab, CatalogSettingsPreviewTabState } from './previewTypes';
export type CatalogSettingsPreviewCoreState<TItem, TSummary, TRequest> = {
    isLoadingInitial: boolean;
    isLoadingMore: boolean;
    summary?: TSummary;
    tabStates: Record<CatalogSettingsPreviewTab, CatalogSettingsPreviewTabState<TItem>>;
    error?: Error;
    lastPreviewedData?: TRequest;
    activeTab: CatalogSettingsPreviewTab;
};
export type UseCatalogSourcePreviewCoreOptions<TItem, TSummary, TRequest> = {
    canPreview: boolean;
    isEditMode: boolean;
    apiAvailable: boolean;
    buildPreviewRequest: () => TRequest;
    previewApi: (opts: APIOptions, data: TRequest, queryParams?: PreviewCatalogSourceQueryParams) => Promise<CatalogSettingsPreviewResult<TItem, TSummary>>;
};
export type UseCatalogSourcePreviewCoreResult<TItem, TSummary, TRequest> = {
    previewState: CatalogSettingsPreviewCoreState<TItem, TSummary, TRequest>;
    handlePreviewInternal: (options?: {
        loadMore?: boolean;
        switchToTab?: CatalogSettingsPreviewTab;
    }) => Promise<void>;
    handleTabChange: (tab: CatalogSettingsPreviewTab) => void;
    handleLoadMore: () => void;
    hasFormChanged: boolean;
};
export declare const useCatalogSourcePreviewCore: <TItem, TSummary, TRequest>({ canPreview, isEditMode, apiAvailable, buildPreviewRequest, previewApi, }: UseCatalogSourcePreviewCoreOptions<TItem, TSummary, TRequest>) => UseCatalogSourcePreviewCoreResult<TItem, TSummary, TRequest>;
