import { McpCatalogSourceConfig, McpCatalogSourcePreviewRequest, McpCatalogSourcePreviewAsset, McpCatalogSourcePreviewSummary } from '~/app/mcpServerCatalogTypes';
import { McpCatalogSettingsAPIState } from '~/app/hooks/mcpCatalogSettings/useMcpCatalogSettingsAPIState';
import { ManageMcpSourceFormData } from './useManageMcpSourceData';
export declare enum McpPreviewTab {
    INCLUDED = "included",
    EXCLUDED = "excluded"
}
export type McpPreviewTabState = {
    items: McpCatalogSourcePreviewAsset[];
    nextPageToken?: string;
    hasMore: boolean;
};
export type McpPreviewState = {
    isLoadingInitial: boolean;
    isLoadingMore: boolean;
    summary?: McpCatalogSourcePreviewSummary;
    tabStates: Record<McpPreviewTab, McpPreviewTabState>;
    error?: Error;
    lastPreviewedData?: McpCatalogSourcePreviewRequest;
    activeTab: McpPreviewTab;
};
export interface UseMcpSourcePreviewOptions {
    formData: ManageMcpSourceFormData;
    existingSourceConfig?: McpCatalogSourceConfig;
    apiState: McpCatalogSettingsAPIState;
    isEditMode: boolean;
}
export interface UseMcpSourcePreviewResult {
    previewState: McpPreviewState;
    handlePreview: () => Promise<void>;
    handleTabChange: (tab: McpPreviewTab) => void;
    handleLoadMore: () => void;
    hasFormChanged: boolean;
    canPreview: boolean;
}
export declare const useMcpSourcePreview: ({ formData, existingSourceConfig, apiState, isEditMode, }: UseMcpSourcePreviewOptions) => UseMcpSourcePreviewResult;
