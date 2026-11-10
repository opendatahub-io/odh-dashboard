import { CatalogSourceConfig, CatalogSourcePreviewRequest, CatalogSourcePreviewModel, CatalogSourcePreviewSummary } from '~/app/modelCatalogTypes';
import { ModelCatalogSettingsAPIState } from '~/app/hooks/modelCatalogSettings/useModelCatalogSettingsAPIState';
import { CatalogSettingsPreviewTab } from '~/app/shared/catalogSettings/hooks/previewTypes';
import { ManageSourceFormData } from './useManageSourceData';
export declare enum PreviewMode {
    PREVIEW = "preview"
}
type CredentialsValidationStatus = 'unknown' | 'valid' | 'invalid';
export declare const isPreviewEnabled: (formData: ManageSourceFormData, credentialsValidationStatus: CredentialsValidationStatus) => boolean;
export declare const getPreviewDisabledTooltip: (formData: ManageSourceFormData, credentialsValidationStatus: CredentialsValidationStatus) => string | undefined;
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
    tabStates: Record<CatalogSettingsPreviewTab, PreviewTabState>;
    error?: Error;
    resultDismissed: boolean;
    lastPreviewedData?: CatalogSourcePreviewRequest;
    activeTab: CatalogSettingsPreviewTab;
};
export interface UseSourcePreviewOptions {
    formData: ManageSourceFormData;
    existingSourceConfig?: CatalogSourceConfig;
    apiState: ModelCatalogSettingsAPIState;
    isEditMode: boolean;
    hasExistingApiKey?: boolean;
}
export interface UseSourcePreviewResult {
    previewState: PreviewState;
    handlePreview: (mode?: PreviewMode) => Promise<void>;
    handleTabChange: (tab: CatalogSettingsPreviewTab) => void;
    handleLoadMore: () => void;
    handleValidate: () => Promise<void>;
    clearValidationSuccess: () => void;
    hasFormChanged: boolean;
    isValidating: boolean;
    validationError?: Error;
    isValidationSuccess: boolean;
    canPreview: boolean;
    previewDisabledTooltip?: string;
}
export declare const useSourcePreview: ({ formData, existingSourceConfig, apiState, isEditMode, hasExistingApiKey, }: UseSourcePreviewOptions) => UseSourcePreviewResult;
export {};
