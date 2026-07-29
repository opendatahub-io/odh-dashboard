import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
export declare const validateMcpSourceName: (name: string) => boolean;
export declare const isMcpSourceNameEmpty: (name: string) => boolean;
export declare const validateMcpYamlContent: (yamlContent: string) => boolean;
export declare const isMcpFormValid: (data: ManageMcpSourceFormData) => boolean;
export declare const isMcpPreviewReady: (data: ManageMcpSourceFormData) => boolean;
