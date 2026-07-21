import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
type McpYamlSectionProps = {
    formData: ManageMcpSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageMcpSourceFormData>;
    onToggleExpectedFormatDrawer?: () => void;
};
declare const McpYamlSection: React.FC<McpYamlSectionProps>;
export default McpYamlSection;
