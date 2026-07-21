import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
type McpServerVisibilitySectionProps = {
    formData: ManageMcpSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageMcpSourceFormData>;
    isDefaultExpanded?: boolean;
};
declare const McpServerVisibilitySection: React.FC<McpServerVisibilitySectionProps>;
export default McpServerVisibilitySection;
