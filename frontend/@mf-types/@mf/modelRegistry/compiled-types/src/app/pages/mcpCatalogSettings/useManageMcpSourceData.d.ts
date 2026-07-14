import { GenericObjectState } from 'mod-arch-core';
import { McpCatalogSourceType } from '~/app/mcpServerCatalogTypes';
export type ManageMcpSourceFormData = {
    name: string;
    id: string;
    sourceType: McpCatalogSourceType;
    yamlContent: string;
    includedServers: string;
    excludedServers: string;
    enabled: boolean;
    isDefault: boolean;
    yamlCatalogPath?: string;
};
export declare const useManageMcpSourceData: (existingData?: Partial<ManageMcpSourceFormData>) => GenericObjectState<ManageMcpSourceFormData>;
