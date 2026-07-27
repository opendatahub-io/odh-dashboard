import * as React from 'react';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
type McpManageSourceFormProps = {
    existingSourceConfig?: McpCatalogSourceConfig;
    isEditMode: boolean;
    onToggleExpectedFormatDrawer?: () => void;
};
declare const McpManageSourceForm: React.FC<McpManageSourceFormProps>;
export default McpManageSourceForm;
