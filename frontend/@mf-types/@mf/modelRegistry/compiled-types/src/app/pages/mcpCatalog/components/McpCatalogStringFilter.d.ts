import * as React from 'react';
import type { McpFilterCategoryKey, McpCatalogFilterStringOption } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
type McpCatalogStringFilterProps = {
    title: string;
    filterKey: McpFilterCategoryKey;
    filters: McpCatalogFilterStringOption | undefined;
};
declare const McpCatalogStringFilter: React.FC<McpCatalogStringFilterProps>;
export default McpCatalogStringFilter;
