import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
type McpServerFiltersSectionProps = {
    formData: ManageMcpSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageMcpSourceFormData>;
    isDefaultExpanded?: boolean;
};
declare const McpServerFiltersSection: React.FC<McpServerFiltersSectionProps>;
export default McpServerFiltersSection;
