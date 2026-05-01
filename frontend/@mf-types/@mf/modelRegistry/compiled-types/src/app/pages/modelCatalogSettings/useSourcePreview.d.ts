import { CatalogSourceConfig, CatalogSourcePreviewRequest, CatalogSourcePreviewModel, CatalogSourcePreviewSummary } from '~/app/modelCatalogTypes';
import { ModelCatalogSettingsAPIState } from '~/app/hooks/modelCatalogSettings/useModelCatalogSettingsAPIState';
import { ManageSourceFormData } from './useManageSourceData';
export declare enum PreviewMode {
    PREVIEW = "preview",
    VALIDATE = "validate"
}
export declare enum PreviewTab {
    INCLUDED = "included",
    EXCLUDED = "excluded"
}
export type PreviewTabState = {
    items: CatalogSourcePreviewModel[];
    nextPageToken?: string;
    hasMore: boolean;
};
export type PreviewState = {
    mode?: PreviewMode;
    isLoadingInitial: boolean;
    isLoadingMore: boolean;
    summary?: CatalogSourcePreviewSummary;
    tabStates: Record<PreviewTab, PreviewTabState>;
    error?: Error;
    resultDismissed: boolean;
    lastPreviewedData?: CatalogSourcePreviewRequest;
    activeTab: PreviewTab;
};
export interface UseSourcePreviewOptions {
    formData: ManageSourceFormData;
    existingSourceConfig?: CatalogSourceConfig;
    apiState: ModelCatalogSettingsAPIState;
    isEditMode: boolean;
}
export interface UseSourcePreviewResult {
    previewState: PreviewState;
    handlePreview: (mode?: PreviewMode) => Promise<void>;
    handleTabChange: (tab: PreviewTab) => void;
    handleLoadMore: () => void;
    handleValidate: () => Promise<void>;
    clearValidationSuccess: () => void;
    hasFormChanged: boolean;
    isValidating: boolean;
    validationError?: Error;
    isValidationSuccess: boolean;
    canPreview: boolean;
}
export declare const useSourcePreview: ({ formData, existingSourceConfig, apiState, isEditMode, }: UseSourcePreviewOptions) => UseSourcePreviewResult;
