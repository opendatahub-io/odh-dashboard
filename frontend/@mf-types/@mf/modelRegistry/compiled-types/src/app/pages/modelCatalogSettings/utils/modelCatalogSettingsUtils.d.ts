import { CatalogSourceConfig, CatalogSourceConfigPayload } from '~/app/modelCatalogTypes';
import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
export declare const catalogSourceConfigToFormData: (sourceConfig: CatalogSourceConfig) => Partial<ManageSourceFormData>;
export declare const generateSourceIdFromName: (name: string) => string;
export declare const transformFormDataToConfig: (formData: ManageSourceFormData, existingSourceConfig?: CatalogSourceConfig) => CatalogSourceConfig;
export declare const getPayloadForConfig: (sourceConfig: CatalogSourceConfig, isEditMode?: boolean) => CatalogSourceConfigPayload;
