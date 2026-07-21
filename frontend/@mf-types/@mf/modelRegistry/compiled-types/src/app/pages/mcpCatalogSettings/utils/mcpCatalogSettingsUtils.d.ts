import { McpCatalogSourceConfig, McpCatalogSourceConfigPayload } from '~/app/mcpServerCatalogTypes';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
export declare const mcpSourceConfigToFormData: (sourceConfig: McpCatalogSourceConfig) => Partial<ManageMcpSourceFormData>;
export declare const generateMcpSourceIdFromName: (name: string) => string;
export declare const transformMcpFormDataToConfig: (formData: ManageMcpSourceFormData, existingSourceConfig?: McpCatalogSourceConfig) => McpCatalogSourceConfig;
export declare const getMcpPayloadForConfig: (sourceConfig: McpCatalogSourceConfig, isEditMode?: boolean) => McpCatalogSourceConfigPayload;
