import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
export declare const validateSourceName: (name: string) => boolean;
export declare const isSourceNameEmpty: (name: string) => boolean;
export declare const validateOrganization: (organization: string) => boolean;
export declare const validateYamlContent: (yamlContent: string) => boolean;
export declare const validateHuggingFaceCredentials: (data: ManageSourceFormData) => boolean;
export declare const validateYamlMode: (data: ManageSourceFormData) => boolean;
export declare const isFormValid: (data: ManageSourceFormData) => boolean;
export declare const isPreviewReady: (data: ManageSourceFormData) => boolean;
