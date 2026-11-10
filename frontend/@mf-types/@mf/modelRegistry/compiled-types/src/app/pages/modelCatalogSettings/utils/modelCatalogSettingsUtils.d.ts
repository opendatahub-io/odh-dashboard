import { CatalogSourceConfig, CatalogSourceConfigPayload, CatalogSourcePreviewModel } from '~/app/modelCatalogTypes';
import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
export declare const isPreviewModelGatedAccessDenied: (model: CatalogSourcePreviewModel) => boolean;
export declare const catalogSourceConfigToFormData: (sourceConfig: CatalogSourceConfig) => Partial<ManageSourceFormData>;
export declare const transformFormDataToConfig: (formData: ManageSourceFormData, existingSourceConfig?: CatalogSourceConfig) => CatalogSourceConfig;
export declare const resolveHuggingFaceApiKeyField: (apiKey: string | undefined, options: {
    tokenModified: boolean;
    hasExistingApiKey: boolean;
    forPreview: boolean;
}) => {
    apiKey?: string;
};
export declare const getPayloadForConfig: (sourceConfig: CatalogSourceConfig, isEditMode?: boolean, tokenModified?: boolean) => CatalogSourceConfigPayload;
