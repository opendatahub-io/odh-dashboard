import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
type McpSourceDetailsSectionProps = {
    formData: ManageMcpSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageMcpSourceFormData>;
    isEditMode: boolean;
    existingSourceConfig?: McpCatalogSourceConfig;
    serverCount?: number;
};
declare const McpSourceDetailsSection: React.FC<McpSourceDetailsSectionProps>;
export default McpSourceDetailsSection;
