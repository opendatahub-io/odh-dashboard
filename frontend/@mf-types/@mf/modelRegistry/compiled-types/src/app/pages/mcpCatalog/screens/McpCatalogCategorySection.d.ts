import * as React from 'react';
type McpCatalogCategorySectionProps = {
    label: string;
    searchTerm: string;
    pageSize: number;
    onShowMore: (label: string) => void;
};
declare const McpCatalogCategorySection: React.FC<McpCatalogCategorySectionProps>;
export default McpCatalogCategorySection;
